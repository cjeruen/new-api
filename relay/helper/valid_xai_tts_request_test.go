package helper

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/dto"
	relayconstant "github.com/QuantumNous/new-api/relay/constant"
	"github.com/QuantumNous/new-api/types"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestGetAndValidXAITTSRequestDefaultsModel(t *testing.T) {
	gin.SetMode(gin.TestMode)
	body := strings.NewReader(`{"text":"Hello","language":"en","voice_id":"eve"}`)
	req := httptest.NewRequest(http.MethodPost, "/v1/tts", body)
	req.Header.Set("Content-Type", "application/json")
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = req
	_, err := common.GetRequestBody(c)
	require.NoError(t, err)

	got, err := GetAndValidXAITTSRequest(c, relayconstant.RelayModeXAITTSSpeech)
	require.NoError(t, err)
	ttsReq := got.(*dto.XAITTSRequest)
	require.Equal(t, "grok-tts", ttsReq.Model)
	require.Equal(t, "Hello", ttsReq.Text)
}

func TestGetAndValidateRequestXAITTSVoices(t *testing.T) {
	gin.SetMode(gin.TestMode)
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodGet, "/v1/tts/voices", nil)

	got, err := GetAndValidateRequest(c, types.RelayFormatXAITTS)
	require.NoError(t, err)
	require.IsType(t, &dto.BaseRequest{}, got)
}