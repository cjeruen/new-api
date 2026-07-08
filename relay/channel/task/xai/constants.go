package xai

import (
	"strconv"

	"github.com/QuantumNous/new-api/constant"
)

var ModelList = []string{
	"grok-imagine-video",
	"grok-imagine-video-1.5",
	"grok-imagine-video-1.5-preview",
}

var TaskPlatform = constant.TaskPlatform(strconv.Itoa(constant.ChannelTypeXai))

const (
	ChannelName                = "xai"
	NativeVideoGenerationsPath = "/v1/videos/generations"
	NativeVideoEditsPath       = "/v1/videos/edits"
	NativeVideoExtensionsPath  = "/v1/videos/extensions"
	VideoGenerationsEndpoint   = "/v1/videos/generations"
	VideoEditsEndpoint         = "/v1/videos/edits"
	VideoExtensionsEndpoint    = "/v1/videos/extensions"
	VideoQueryEndpoint         = "/v1/videos"
)