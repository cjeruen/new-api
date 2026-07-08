package relay

import (
	"io"
	"net/http"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/QuantumNous/new-api/types"

	"github.com/gin-gonic/gin"
)

func readPassthroughRequestBody(c *gin.Context, info *relaycommon.RelayInfo, debugLabel string) (body io.Reader, closer io.Closer, apiErr *types.NewAPIError) {
	storage, err := common.GetBodyStorage(c)
	if err != nil {
		return nil, nil, types.NewErrorWithStatusCode(err, types.ErrorCodeReadRequestBodyFailed, http.StatusBadRequest, types.ErrOptionWithSkipRetry())
	}

	if common.DebugEnabled && debugLabel != "" {
		if debugBytes, bErr := storage.Bytes(); bErr == nil {
			logger.LogDebug(c, "%s: %s", debugLabel, debugBytes)
		}
	}

	body, size, closer, err := relaycommon.PreparePassthroughRequestBody(storage, info)
	if err != nil {
		if relaycommon.HasParamOverride(info) {
			return nil, nil, newAPIErrorFromParamOverride(err)
		}
		return nil, nil, types.NewErrorWithStatusCode(err, types.ErrorCodeReadRequestBodyFailed, http.StatusBadRequest, types.ErrOptionWithSkipRetry())
	}
	info.UpstreamRequestBodySize = size
	return body, closer, nil
}