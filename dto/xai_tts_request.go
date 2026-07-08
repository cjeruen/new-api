package dto

import (
	"strings"

	"github.com/QuantumNous/new-api/types"
	"github.com/gin-gonic/gin"
)

const MaxXAITTSTextLength = 15000

// XAITTSRequest mirrors xAI POST /v1/tts with an optional proxy-only model field.
type XAITTSRequest struct {
	Model                  string  `json:"model,omitempty"`
	Text                   string  `json:"text"`
	VoiceID                string  `json:"voice_id,omitempty"`
	Language               string  `json:"language"`
	WithTimestamps         *bool   `json:"with_timestamps,omitempty"`
	Speed                  float64 `json:"speed,omitempty"`
	TextNormalization      *bool   `json:"text_normalization,omitempty"`
	OptimizeStreamingLatency int   `json:"optimize_streaming_latency,omitempty"`
}

func (r *XAITTSRequest) GetTokenCountMeta() *types.TokenCountMeta {
	return &types.TokenCountMeta{
		CombineText: strings.TrimSpace(r.Text),
		TokenType:   types.TokenTypeTextNumber,
	}
}

func (r *XAITTSRequest) IsStream(c *gin.Context) bool {
	return false
}

func (r *XAITTSRequest) SetModelName(modelName string) {
	if modelName != "" {
		r.Model = modelName
	}
}