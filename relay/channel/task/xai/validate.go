package xai

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/dto"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/gin-gonic/gin"
	"github.com/tidwall/gjson"
)

func (a *TaskAdaptor) ValidateRequestAndSetAction(c *gin.Context, info *relaycommon.RelayInfo) *dto.TaskError {
	if !isXAIVideoGenerationsRequest(c) {
		return relaycommon.CreateTaskError(
			fmt.Errorf("xAI video only supports POST %s", NativeVideoGenerationsPath),
			"invalid_request",
			http.StatusBadRequest,
			true,
		)
	}
	return validateXAIVideoRequest(c, info)
}

func validateXAIVideoRequest(c *gin.Context, info *relaycommon.RelayInfo) *dto.TaskError {
	storage, err := common.GetBodyStorage(c)
	if err != nil {
		return relaycommon.CreateTaskError(err, "read_request_body_failed", http.StatusBadRequest, true)
	}
	body, err := storage.Bytes()
	if err != nil {
		return relaycommon.CreateTaskError(err, "read_request_body_failed", http.StatusBadRequest, true)
	}
	if !gjson.ValidBytes(body) {
		return relaycommon.CreateTaskError(fmt.Errorf("invalid JSON request body"), "invalid_json", http.StatusBadRequest, true)
	}

	model := strings.TrimSpace(gjson.GetBytes(body, "model").String())
	if model == "" {
		return relaycommon.CreateTaskError(fmt.Errorf("model field is required"), "missing_model", http.StatusBadRequest, true)
	}

	prompt := strings.TrimSpace(gjson.GetBytes(body, "prompt").String())
	if prompt == "" {
		return relaycommon.CreateTaskError(fmt.Errorf("prompt is required"), "invalid_request", http.StatusBadRequest, true)
	}

	duration := int(gjson.GetBytes(body, "duration").Int())
	if taskErr := validateXAIVideoDuration(duration); taskErr != nil {
		return taskErr
	}
	if err := validateNativeVideoConstraints(body); err != nil {
		return relaycommon.CreateTaskError(err, "invalid_request", http.StatusBadRequest, true)
	}

	req := relaycommon.TaskSubmitReq{
		Model:    model,
		Prompt:   prompt,
		Duration: duration,
	}

	imageURL, err := nativeVideoInputImageURL(body)
	if err != nil {
		return relaycommon.CreateTaskError(err, "invalid_request", http.StatusBadRequest, true)
	}
	if imageURL != "" {
		req.Images = []string{imageURL}
	}

	action := constant.TaskActionTextGenerate
	if len(req.Images) > 0 || len(collectVideoReferenceImages(body)) > 0 {
		action = constant.TaskActionGenerate
	}

	relaycommon.StoreTaskRequest(c, info, action, req)
	return nil
}

func validateXAIVideoDuration(duration int) *dto.TaskError {
	if duration == 0 {
		return nil
	}
	if duration < minVideoDuration || duration > maxVideoDuration {
		return relaycommon.CreateTaskError(
			fmt.Errorf("duration must be between %d and %d seconds", minVideoDuration, maxVideoDuration),
			"invalid_duration",
			http.StatusBadRequest,
			true,
		)
	}
	return nil
}

func isXAIVideoGenerationsRequest(c *gin.Context) bool {
	return c.Request != nil && c.Request.URL.Path == NativeVideoGenerationsPath
}