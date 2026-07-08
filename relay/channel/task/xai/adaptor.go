package xai

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/relay/channel"
	taskcommon "github.com/QuantumNous/new-api/relay/channel/task/taskcommon"
	channelxai "github.com/QuantumNous/new-api/relay/channel/xai"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/QuantumNous/new-api/service"

	"github.com/gin-gonic/gin"
	"github.com/pkg/errors"
	"github.com/tidwall/gjson"
)

type submitResponse struct {
	RequestID string `json:"request_id"`
	ID        string `json:"id"`
	Status    string `json:"status"`
	Model     string `json:"model"`
}

type queryResponse struct {
	Status string `json:"status"`
	Model  string `json:"model"`
	Video  struct {
		URL      string `json:"url"`
		Duration int    `json:"duration"`
	} `json:"video"`
	Error *struct {
		Message string `json:"message"`
		Code    string `json:"code"`
	} `json:"error,omitempty"`
}

type TaskAdaptor struct {
	taskcommon.BaseBilling
	ChannelType int
	channelID   int
	proxy       string
	apiKey      string
	baseURL     string
}

func (a *TaskAdaptor) Init(info *relaycommon.RelayInfo) {
	if info == nil {
		return
	}
	if info.ChannelMeta != nil {
		a.ChannelType = info.ChannelMeta.ChannelType
		if info.ChannelMeta.ChannelId > 0 {
			a.channelID = info.ChannelMeta.ChannelId
		}
		if info.ChannelMeta.ChannelBaseUrl != "" {
			a.baseURL = strings.TrimSuffix(info.ChannelMeta.ChannelBaseUrl, "/")
		}
		if info.ChannelMeta.ApiKey != "" {
			a.apiKey = info.ChannelMeta.ApiKey
		}
		if info.ChannelMeta.ChannelSetting.Proxy != "" {
			a.proxy = info.ChannelMeta.ChannelSetting.Proxy
		}
	}
	if info.ChannelId > 0 {
		a.channelID = info.ChannelId
	}
	if info.ChannelBaseUrl != "" {
		a.baseURL = strings.TrimSuffix(info.ChannelBaseUrl, "/")
	}
	if info.ApiKey != "" {
		a.apiKey = info.ApiKey
	}
	if info.ChannelSetting.Proxy != "" {
		a.proxy = info.ChannelSetting.Proxy
	}
}

func (a *TaskAdaptor) EstimateBilling(c *gin.Context, _ *relaycommon.RelayInfo) map[string]float64 {
	duration := defaultVideoSeconds
	storage, err := common.GetBodyStorage(c)
	if err == nil {
		if body, readErr := storage.Bytes(); readErr == nil {
			if value := int(gjson.GetBytes(body, "duration").Int()); value > 0 {
				duration = value
			}
		}
	}
	return map[string]float64{"seconds": float64(duration)}
}

func (a *TaskAdaptor) BuildRequestURL(_ *relaycommon.RelayInfo) (string, error) {
	return fmt.Sprintf("%s%s", a.baseURL, VideoGenerationsEndpoint), nil
}

func (a *TaskAdaptor) BuildRequestHeader(c *gin.Context, req *http.Request, info *relaycommon.RelayInfo) error {
	apiKey, err := a.resolveAPIKey(c.Request.Context(), info)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	return nil
}

func (a *TaskAdaptor) BuildRequestBody(c *gin.Context, info *relaycommon.RelayInfo) (io.Reader, error) {
	storage, err := common.GetBodyStorage(c)
	if err != nil {
		return nil, errors.Wrap(err, "get_request_body_failed")
	}
	cachedBody, err := storage.Bytes()
	if err != nil {
		return nil, errors.Wrap(err, "read_body_bytes_failed")
	}

	var bodyMap map[string]interface{}
	if err := common.Unmarshal(cachedBody, &bodyMap); err != nil {
		return nil, errors.Wrap(err, "unmarshal_request_body_failed")
	}
	bodyMap["model"] = info.UpstreamModelName
	data, err := common.Marshal(bodyMap)
	if err != nil {
		return nil, err
	}
	return bytes.NewReader(data), nil
}

func (a *TaskAdaptor) DoRequest(c *gin.Context, info *relaycommon.RelayInfo, requestBody io.Reader) (*http.Response, error) {
	return channel.DoTaskApiRequest(a, c, info, requestBody)
}

func (a *TaskAdaptor) DoResponse(c *gin.Context, resp *http.Response, info *relaycommon.RelayInfo) (taskID string, taskData []byte, taskErr *dto.TaskError) {
	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		taskErr = service.TaskErrorWrapper(err, "read_response_body_failed", http.StatusInternalServerError)
		return
	}
	_ = resp.Body.Close()

	var xaiResp submitResponse
	if err := common.Unmarshal(responseBody, &xaiResp); err != nil {
		taskErr = service.TaskErrorWrapper(errors.Wrapf(err, "body: %s", responseBody), "unmarshal_response_body_failed", http.StatusInternalServerError)
		return
	}

	upstreamID := strings.TrimSpace(xaiResp.RequestID)
	if upstreamID == "" {
		upstreamID = strings.TrimSpace(xaiResp.ID)
	}
	if upstreamID == "" {
		taskErr = service.TaskErrorWrapper(fmt.Errorf("request_id is empty"), "invalid_response", http.StatusInternalServerError)
		return
	}

	c.JSON(http.StatusOK, map[string]string{"request_id": info.PublicTaskID})
	return upstreamID, responseBody, nil
}

func (a *TaskAdaptor) FetchTask(baseUrl, key string, body map[string]any, proxy string) (*http.Response, error) {
	taskID, ok := body["task_id"].(string)
	if !ok || strings.TrimSpace(taskID) == "" {
		return nil, fmt.Errorf("invalid task_id")
	}

	baseUrl = strings.TrimSuffix(baseUrl, "/")
	uri := fmt.Sprintf("%s%s/%s", baseUrl, VideoQueryEndpoint, taskID)

	req, err := http.NewRequest(http.MethodGet, uri, nil)
	if err != nil {
		return nil, err
	}

	if proxy != "" && a.proxy == "" {
		a.proxy = proxy
	}
	apiKey, err := a.resolveAPIKey(context.Background(), &relaycommon.RelayInfo{
		ChannelMeta: &relaycommon.ChannelMeta{
			ApiKey:         key,
			ChannelSetting: dto.ChannelSettings{Proxy: proxy},
		},
	})
	if err != nil {
		return nil, err
	}

	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	client, err := service.GetHttpClientWithProxy(proxy)
	if err != nil {
		return nil, fmt.Errorf("new proxy http client failed: %w", err)
	}
	return client.Do(req)
}

func (a *TaskAdaptor) GetModelList() []string {
	return ModelList
}

func (a *TaskAdaptor) GetChannelName() string {
	return ChannelName
}

func (a *TaskAdaptor) ParseTaskResult(respBody []byte) (*relaycommon.TaskInfo, error) {
	var resTask queryResponse
	if err := common.Unmarshal(respBody, &resTask); err != nil {
		return nil, errors.Wrap(err, "unmarshal task result failed")
	}

	taskResult := relaycommon.TaskInfo{Code: 0}
	status := strings.ToLower(strings.TrimSpace(resTask.Status))

	switch status {
	case "pending", "queued":
		taskResult.Status = model.TaskStatusQueued
		taskResult.Progress = taskcommon.ProgressInProgress
	case "processing", "running", "in_progress":
		taskResult.Status = model.TaskStatusInProgress
		taskResult.Progress = taskcommon.ProgressInProgress
	case "done", "completed", "succeeded", "success":
		taskResult.Status = model.TaskStatusSuccess
		taskResult.Progress = taskcommon.ProgressComplete
		taskResult.Url = strings.TrimSpace(resTask.Video.URL)
	case "expired":
		taskResult.Status = model.TaskStatusFailure
		taskResult.Progress = taskcommon.ProgressComplete
		taskResult.Reason = "expired"
	case "failed", "error", "cancelled", "canceled":
		taskResult.Status = model.TaskStatusFailure
		taskResult.Progress = taskcommon.ProgressComplete
		if resTask.Error != nil && strings.TrimSpace(resTask.Error.Message) != "" {
			taskResult.Reason = resTask.Error.Message
		} else {
			taskResult.Reason = status
		}
	default:
		taskResult.Status = model.TaskStatusInProgress
		taskResult.Progress = taskcommon.ProgressInProgress
	}

	return &taskResult, nil
}

func (a *TaskAdaptor) ConvertToXAIVideo(originTask *model.Task) ([]byte, error) {
	if len(originTask.Data) > 0 {
		status := strings.TrimSpace(gjson.GetBytes(originTask.Data, "status").String())
		if status != "" {
			return originTask.Data, nil
		}
	}

	modelName := originTask.Properties.OriginModelName
	if modelName == "" {
		modelName = strings.TrimSpace(gjson.GetBytes(originTask.Data, "model").String())
	}

	status := xaiStatusFromTask(originTask)
	resp := queryResponse{
		Status: status,
		Model:  modelName,
	}
	videoURL := strings.TrimSpace(originTask.PrivateData.ResultURL)
	if videoURL == "" {
		videoURL = strings.TrimSpace(gjson.GetBytes(originTask.Data, "video.url").String())
	}
	if videoURL != "" {
		resp.Video.URL = videoURL
		if duration := gjson.GetBytes(originTask.Data, "video.duration"); duration.Exists() {
			resp.Video.Duration = int(duration.Int())
		}
	}
	if status == "failed" {
		message := strings.TrimSpace(originTask.FailReason)
		if message == "" {
			message = "failed"
		}
		resp.Error = &struct {
			Message string `json:"message"`
			Code    string `json:"code"`
		}{Message: message}
	}
	return common.Marshal(resp)
}

func (a *TaskAdaptor) resolveAPIKey(ctx context.Context, info *relaycommon.RelayInfo) (string, error) {
	apiKey := strings.TrimSpace(a.apiKey)
	if apiKey == "" && info != nil {
		apiKey = strings.TrimSpace(info.ApiKey)
	}
	if strings.HasPrefix(apiKey, "{") && a.channelID > 0 {
		proxy := a.proxy
		if proxy == "" && info != nil {
			proxy = info.ChannelSetting.Proxy
		}
		if refreshed, newKey, err := service.RefreshXaiChannelKeyIfNeeded(ctx, a.channelID, apiKey, proxy); err == nil && refreshed {
			apiKey = newKey
			a.apiKey = newKey
			if info != nil {
				info.ApiKey = newKey
			}
		}
	}
	resolved := channelxai.ResolveAccessToken(apiKey)
	if resolved == "" {
		return "", fmt.Errorf("xai api key is empty")
	}
	return resolved, nil
}