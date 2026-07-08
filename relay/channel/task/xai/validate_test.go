package xai

import (
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
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

func TestIsXAIVideoNativePostRequest(t *testing.T) {
	gin.SetMode(gin.TestMode)
	context, _ := gin.CreateTestContext(httptest.NewRecorder())

	for _, path := range []string{NativeVideoGenerationsPath, NativeVideoEditsPath, NativeVideoExtensionsPath} {
		context.Request = httptest.NewRequest(http.MethodPost, path, nil)
		require.True(t, isXAIVideoNativePostRequest(context), "path %s should be native", path)
	}

	context.Request = httptest.NewRequest(http.MethodPost, "/v1/videos", nil)
	require.False(t, isXAIVideoNativePostRequest(context))
}

func TestValidateXAIVideoExtensionDuration(t *testing.T) {
	gin.SetMode(gin.TestMode)

	cases := []struct {
		name       string
		duration   int
		wantErr    bool
		wantCode   string
		wantSubstr string
	}{
		{name: "omit duration", duration: 0, wantErr: false},
		{name: "min", duration: 2, wantErr: false},
		{name: "max", duration: 10, wantErr: false},
		{name: "below min", duration: 1, wantErr: true, wantCode: "invalid_duration", wantSubstr: "between 2 and 10"},
		{name: "above max", duration: 11, wantErr: true, wantCode: "invalid_duration", wantSubstr: "between 2 and 10"},
		{name: "proxy old max", duration: 15, wantErr: true, wantCode: "invalid_duration", wantSubstr: "between 2 and 10"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			payload := `{
				"model": "grok-imagine-video",
				"prompt": "continue the scene",
				"video": {"url": "https://example.com/source.mp4"}`
			if tc.duration > 0 {
				payload += `,
				"duration": ` + strconv.Itoa(tc.duration)
			}
			payload += `
			}`
			request := httptest.NewRequest(http.MethodPost, NativeVideoExtensionsPath, strings.NewReader(payload))
			request.Header.Set("Content-Type", "application/json")
			context, _ := gin.CreateTestContext(httptest.NewRecorder())
			context.Request = request
			_, err := common.GetRequestBody(context)
			require.NoError(t, err)

			info := &relaycommon.RelayInfo{TaskRelayInfo: &relaycommon.TaskRelayInfo{}}
			taskErr := validateXAIVideoRequest(context, info)
			if tc.wantErr {
				require.NotNil(t, taskErr)
				require.Equal(t, tc.wantCode, taskErr.Code)
				require.Contains(t, taskErr.Message, tc.wantSubstr)
				return
			}
			require.Nil(t, taskErr)
		})
	}
}

func TestValidateXAIVideoRequestRejectsExtensionUnsupportedParams(t *testing.T) {
	gin.SetMode(gin.TestMode)
	body := strings.NewReader(`{
		"model": "grok-imagine-video",
		"prompt": "continue the scene",
		"aspect_ratio": "16:9",
		"video": {"url": "https://example.com/source.mp4"}
	}`)
	request := httptest.NewRequest(http.MethodPost, NativeVideoExtensionsPath, body)
	request.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	context.Request = request
	_, err := common.GetRequestBody(context)
	require.NoError(t, err)

	info := &relaycommon.RelayInfo{TaskRelayInfo: &relaycommon.TaskRelayInfo{}}
	taskErr := validateXAIVideoRequest(context, info)
	require.NotNil(t, taskErr)
	require.Equal(t, "invalid_request", taskErr.Code)
	require.Contains(t, taskErr.Message, "aspect_ratio is not supported for video extension")
}

func TestValidateXAIVideoRequestRejectsEditsWithoutVideo(t *testing.T) {
	gin.SetMode(gin.TestMode)
	body := strings.NewReader(`{
		"model": "grok-imagine-video",
		"prompt": "Add a silver necklace"
	}`)
	request := httptest.NewRequest(http.MethodPost, NativeVideoEditsPath, body)
	request.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	context.Request = request
	info := &relaycommon.RelayInfo{TaskRelayInfo: &relaycommon.TaskRelayInfo{}}

	taskErr := validateXAIVideoRequest(context, info)
	require.NotNil(t, taskErr)
	require.Equal(t, "invalid_request", taskErr.Code)
	require.Contains(t, taskErr.Message, "video is required")
}