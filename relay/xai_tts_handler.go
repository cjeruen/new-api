package relay

import (
	"errors"
	"fmt"
	"io"
	"net/http"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/dto"
	channelxai "github.com/QuantumNous/new-api/relay/channel/xai"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	relayconstant "github.com/QuantumNous/new-api/relay/constant"
	"github.com/QuantumNous/new-api/relay/helper"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/types"

	"github.com/gin-gonic/gin"
)

func XAITTSHelper(c *gin.Context, info *relaycommon.RelayInfo) *types.NewAPIError {
	info.InitChannelMeta(c)
	if info.ChannelMeta == nil || info.ChannelMeta.ApiType != constant.APITypeXai {
		return types.NewError(
			errors.New("xAI TTS requires an xAI channel"),
			types.ErrorCodeInvalidApiType,
			types.ErrOptionWithSkipRetry(),
		)
	}

	adaptor, ok := GetAdaptor(constant.APITypeXai).(*channelxai.Adaptor)
	if !ok || adaptor == nil {
		return types.NewError(fmt.Errorf("invalid xAI adaptor"), types.ErrorCodeInvalidApiType, types.ErrOptionWithSkipRetry())
	}
	adaptor.Init(info)

	var requestBody io.Reader
	switch info.RelayMode {
	case relayconstant.RelayModeXAITTSSpeech:
		ttsReq, ok := info.Request.(*dto.XAITTSRequest)
		if !ok {
			return types.NewError(errors.New("invalid request type"), types.ErrorCodeInvalidRequest, types.ErrOptionWithSkipRetry())
		}
		request, err := common.DeepCopy(ttsReq)
		if err != nil {
			return types.NewError(err, types.ErrorCodeInvalidRequest, types.ErrOptionWithSkipRetry())
		}
		if err := helper.ModelMappedHelper(c, info, request); err != nil {
			return types.NewError(err, types.ErrorCodeChannelModelMappedError, types.ErrOptionWithSkipRetry())
		}
		reader, size, err := adaptor.BuildXAITTSRequestBody(c)
		if err != nil {
			return types.NewError(err, types.ErrorCodeInvalidRequest, types.ErrOptionWithSkipRetry())
		}
		info.UpstreamRequestBodySize = size
		requestBody = reader
	case relayconstant.RelayModeXAITTSVoices:
		requestBody = nil
	default:
		return types.NewError(errors.New("unsupported xAI TTS relay mode"), types.ErrorCodeInvalidRequest, types.ErrOptionWithSkipRetry())
	}

	resp, err := adaptor.DoRequest(c, info, requestBody)
	if err != nil {
		return types.NewOpenAIError(err, types.ErrorCodeDoRequestFailed, http.StatusInternalServerError)
	}

	statusCodeMappingStr := c.GetString("status_code_mapping")
	httpResp, ok := resp.(*http.Response)
	if !ok || httpResp == nil {
		return types.NewError(errors.New("invalid upstream response"), types.ErrorCodeBadResponse, types.ErrOptionWithSkipRetry())
	}
	if httpResp.StatusCode != http.StatusOK {
		newAPIError := service.RelayErrorHandler(c.Request.Context(), httpResp, false)
		service.ResetStatusCode(newAPIError, statusCodeMappingStr)
		return newAPIError
	}

	var usage *dto.Usage
	var newAPIError *types.NewAPIError
	switch info.RelayMode {
	case relayconstant.RelayModeXAITTSSpeech:
		usage = channelxai.XAITTSSpeechHandler(c, httpResp, info)
	case relayconstant.RelayModeXAITTSVoices:
		usage, newAPIError = channelxai.XAITTSVoicesHandler(c, httpResp, info)
	}
	if newAPIError != nil {
		service.ResetStatusCode(newAPIError, statusCodeMappingStr)
		return newAPIError
	}

	if usage.CompletionTokenDetails.AudioTokens > 0 || usage.PromptTokensDetails.AudioTokens > 0 {
		service.PostAudioConsumeQuota(c, info, usage, "")
	} else {
		service.PostTextConsumeQuota(c, info, usage, nil)
	}
	return nil
}