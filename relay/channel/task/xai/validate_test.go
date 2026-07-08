package xai

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/constant"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestValidateXAIVideoRequestNativeImageObject(t *testing.T) {
	gin.SetMode(gin.TestMode)
	body := strings.NewReader(`{
		"model": "grok-imagine-video-1.5",
		"prompt": "Generate a slow and serene time-lapse",
		"image": {"url": "https://example.com/milkyway.png"},
		"duration": 12
	}`)
	request := httptest.NewRequest(http.MethodPost, NativeVideoGenerationsPath, body)
	request.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	context.Request = request
	info := &relaycommon.RelayInfo{TaskRelayInfo: &relaycommon.TaskRelayInfo{}}

	taskErr := validateXAIVideoRequest(context, info)
	require.Nil(t, taskErr)

	storedReq, err := relaycommon.GetTaskRequest(context)
	require.NoError(t, err)
	require.Equal(t, []string{"https://example.com/milkyway.png"}, storedReq.Images)
	require.Equal(t, 12, storedReq.Duration)
	require.Equal(t, constant.TaskActionGenerate, info.Action)
}

func TestValidateXAIVideoRequestRejectsLongDuration(t *testing.T) {
	gin.SetMode(gin.TestMode)
	body := strings.NewReader(`{
		"model": "grok-imagine-video",
		"prompt": "test",
		"duration": 20
	}`)
	request := httptest.NewRequest(http.MethodPost, NativeVideoGenerationsPath, body)
	request.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	context.Request = request
	info := &relaycommon.RelayInfo{TaskRelayInfo: &relaycommon.TaskRelayInfo{}}

	taskErr := validateXAIVideoRequest(context, info)
	require.NotNil(t, taskErr)
	require.Equal(t, "invalid_duration", taskErr.Code)
}

func TestValidateRequestRejectsNonNativePath(t *testing.T) {
	gin.SetMode(gin.TestMode)
	request := httptest.NewRequest(http.MethodPost, "/v1/videos", strings.NewReader(`{
		"model": "grok-imagine-video",
		"prompt": "test"
	}`))
	request.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	context.Request = request
	info := &relaycommon.RelayInfo{TaskRelayInfo: &relaycommon.TaskRelayInfo{}}

	adaptor := &TaskAdaptor{}
	taskErr := adaptor.ValidateRequestAndSetAction(context, info)
	require.NotNil(t, taskErr)
	require.Equal(t, "invalid_request", taskErr.Code)
}

func TestIsXAIVideoGenerationsRequest(t *testing.T) {
	gin.SetMode(gin.TestMode)
	request := httptest.NewRequest(http.MethodPost, NativeVideoGenerationsPath, nil)
	context, _ := gin.CreateTestContext(httptest.NewRecorder())
	context.Request = request
	require.True(t, isXAIVideoGenerationsRequest(context))

	request = httptest.NewRequest(http.MethodPost, "/v1/videos", nil)
	context.Request = request
	require.False(t, isXAIVideoGenerationsRequest(context))
}