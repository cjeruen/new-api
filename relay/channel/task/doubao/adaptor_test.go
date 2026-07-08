package doubao

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

func TestValidateRequestAndSetActionTextToVideo(t *testing.T) {
	gin.SetMode(gin.TestMode)

	body := `{
		"model": "doubao-seedance-1-5-pro-251215",
		"prompt": "无人机穿越峡谷",
		"metadata": {
			"ratio": "16:9",
			"duration": 5,
			"resolution": "720p"
		}
	}`
	context, info := newDoubaoValidateContext(t, body)

	taskErr := (&TaskAdaptor{}).ValidateRequestAndSetAction(context, info)

	require.Nil(t, taskErr)
	require.Equal(t, constant.TaskActionTextGenerate, info.Action)
}

func TestValidateRequestAndSetActionImageToVideo(t *testing.T) {
	gin.SetMode(gin.TestMode)

	body := `{
		"model": "doubao-seedance-1-5-pro-251215",
		"prompt": "让画面动起来",
		"images": ["https://example.com/frame.png"]
	}`
	context, info := newDoubaoValidateContext(t, body)

	taskErr := (&TaskAdaptor{}).ValidateRequestAndSetAction(context, info)

	require.Nil(t, taskErr)
	require.Equal(t, constant.TaskActionGenerate, info.Action)
}

func TestValidateRequestAndSetActionMetadataImageToVideo(t *testing.T) {
	gin.SetMode(gin.TestMode)

	body := `{
		"model": "doubao-seedance-1-5-pro-251215",
		"prompt": "让画面动起来",
		"metadata": {
			"content": [
				{"type": "image_url", "image_url": {"url": "https://example.com/frame.png"}},
				{"type": "text", "text": "让画面动起来"}
			]
		}
	}`
	context, info := newDoubaoValidateContext(t, body)

	taskErr := (&TaskAdaptor{}).ValidateRequestAndSetAction(context, info)

	require.Nil(t, taskErr)
	require.Equal(t, constant.TaskActionGenerate, info.Action)
}

func TestValidateRequestAndSetActionFirstTailGenerate(t *testing.T) {
	gin.SetMode(gin.TestMode)

	body := `{
		"model": "doubao-seedance-1-5-pro-251215",
		"prompt": "平滑过渡",
		"metadata": {
			"content": [
				{"type": "image_url", "image_url": {"url": "https://example.com/first.png"}, "role": "first_frame"},
				{"type": "image_url", "image_url": {"url": "https://example.com/last.png"}, "role": "last_frame"},
				{"type": "text", "text": "平滑过渡"}
			]
		}
	}`
	context, info := newDoubaoValidateContext(t, body)

	taskErr := (&TaskAdaptor{}).ValidateRequestAndSetAction(context, info)

	require.Nil(t, taskErr)
	require.Equal(t, constant.TaskActionFirstTailGenerate, info.Action)
}

func newDoubaoValidateContext(t *testing.T, body string) (*gin.Context, *relaycommon.RelayInfo) {
	t.Helper()

	request := httptest.NewRequest(http.MethodPost, "/v1/video/generations", strings.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	context, _ := gin.CreateTestContext(httptest.NewRecorder())
	context.Request = request
	return context, &relaycommon.RelayInfo{TaskRelayInfo: &relaycommon.TaskRelayInfo{}}
}