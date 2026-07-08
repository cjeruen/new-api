package xai

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/logger"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/types"
	"github.com/gin-gonic/gin"
	"github.com/tidwall/gjson"
)

func validateXAITTSRequest(raw []byte) error {
	if !gjson.ValidBytes(raw) {
		return fmt.Errorf("invalid JSON request body")
	}
	text := strings.TrimSpace(gjson.GetBytes(raw, "text").String())
	if text == "" {
		return fmt.Errorf("text is required")
	}
	if len(text) > dto.MaxXAITTSTextLength {
		return fmt.Errorf("text must be at most %d characters", dto.MaxXAITTSTextLength)
	}
	language := strings.TrimSpace(gjson.GetBytes(raw, "language").String())
	if language == "" {
		return fmt.Errorf("language is required")
	}
	return nil
}

func buildUpstreamTTSBody(raw []byte) ([]byte, error) {
	if err := validateXAITTSRequest(raw); err != nil {
		return nil, err
	}
	var body map[string]any
	if err := json.Unmarshal(raw, &body); err != nil {
		return nil, fmt.Errorf("invalid JSON request body")
	}
	delete(body, "model")
	delete(body, "group")
	return json.Marshal(body)
}

func (a *Adaptor) BuildXAITTSRequestBody(c *gin.Context) (io.Reader, int64, error) {
	storage, err := common.GetBodyStorage(c)
	if err != nil {
		return nil, 0, err
	}
	raw, err := storage.Bytes()
	if err != nil {
		return nil, 0, err
	}
	upstream, err := buildUpstreamTTSBody(raw)
	if err != nil {
		return nil, 0, err
	}
	return bytes.NewReader(upstream), int64(len(upstream)), nil
}

func XAITTSSpeechHandler(c *gin.Context, resp *http.Response, info *relaycommon.RelayInfo) *dto.Usage {
	defer service.CloseResponseBodyGracefully(resp)

	usage := &dto.Usage{}
	usage.PromptTokens = info.GetEstimatePromptTokens()
	usage.TotalTokens = usage.PromptTokens
	usage.PromptTokensDetails.TextTokens = usage.PromptTokens

	for k, v := range resp.Header {
		if !service.ShouldCopyUpstreamHeader(c, k, v) {
			continue
		}
		c.Writer.Header().Set(k, v[0])
	}
	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		logger.LogError(c, fmt.Sprintf("failed to read xAI TTS response body: %v", err))
		c.Writer.WriteHeader(resp.StatusCode)
		return usage
	}

	c.Writer.WriteHeader(resp.StatusCode)
	if _, err = c.Writer.Write(bodyBytes); err != nil {
		logger.LogError(c, fmt.Sprintf("failed to write xAI TTS response: %v", err))
	}

	contentType := strings.ToLower(resp.Header.Get("Content-Type"))
	if strings.Contains(contentType, "application/json") || gjson.ValidBytes(bodyBytes) && gjson.GetBytes(bodyBytes, "audio").Exists() {
		if duration := gjson.GetBytes(bodyBytes, "duration").Float(); duration > 0 {
			applyTTSCompletionUsage(usage, duration, 0)
			return usage
		}
	}

	audioFormat := "mp3"
	if codec := strings.TrimSpace(gjson.GetBytes(bodyBytes, "output_format.codec").String()); codec != "" {
		audioFormat = codec
	}
	if req, ok := info.Request.(*dto.XAITTSRequest); ok {
		_ = req
	}
	applyTTSCompletionUsageFromAudio(c, usage, bodyBytes, audioFormat)
	return usage
}

func XAITTSVoicesHandler(c *gin.Context, resp *http.Response, _ *relaycommon.RelayInfo) (*dto.Usage, *types.NewAPIError) {
	defer service.CloseResponseBodyGracefully(resp)

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, types.NewOpenAIError(err, types.ErrorCodeReadResponseBodyFailed, http.StatusInternalServerError)
	}
	service.IOCopyBytesGracefully(c, resp, bodyBytes)

	usage := &dto.Usage{}
	return usage, nil
}

func applyTTSCompletionUsageFromAudio(c *gin.Context, usage *dto.Usage, bodyBytes []byte, audioFormat string) {
	var duration float64
	var durationErr error

	if audioFormat == "pcm" {
		const sampleRate = 24000
		const bytesPerSample = 2
		const channels = 1
		duration = float64(len(bodyBytes)) / float64(sampleRate*bytesPerSample*channels)
	} else {
		ext := "." + audioFormat
		reader := bytes.NewReader(bodyBytes)
		duration, durationErr = common.GetAudioDuration(c.Request.Context(), reader, ext)
	}

	if durationErr != nil {
		logger.LogWarn(c, fmt.Sprintf("failed to get audio duration: %v", durationErr))
		sizeInKB := float64(len(bodyBytes)) / 1000.0
		estimatedTokens := int(math.Ceil(sizeInKB))
		applyTTSCompletionUsage(usage, 0, estimatedTokens)
		return
	}
	applyTTSCompletionUsage(usage, duration, 0)
}

func applyTTSCompletionUsage(usage *dto.Usage, duration float64, fallbackCompletionTokens int) {
	if usage == nil {
		return
	}
	completionTokens := fallbackCompletionTokens
	if duration > 0 {
		completionTokens = common.QuotaRound(math.Ceil(duration) / 60.0 * 1000)
	}
	usage.CompletionTokens = completionTokens
	usage.CompletionTokenDetails.AudioTokens = completionTokens
	usage.TotalTokens = usage.PromptTokens + usage.CompletionTokens
}