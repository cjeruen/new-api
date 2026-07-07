package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/model"
)

const xaiCredentialRefreshSkew = time.Hour

type XaiCredentialRefreshOptions struct {
	ResetCaches bool
}

type XaiOAuthKey struct {
	Type         string `json:"type,omitempty"`
	AccessToken  string `json:"access_token,omitempty"`
	RefreshToken string `json:"refresh_token,omitempty"`
	ClientID     string `json:"client_id,omitempty"`
	IDToken      string `json:"id_token,omitempty"`
	TokenType    string `json:"token_type,omitempty"`
	LastRefresh  string `json:"last_refresh,omitempty"`
	Email        string `json:"email,omitempty"`
	Expired      string `json:"expired,omitempty"`
}

func parseXaiOAuthKey(raw string) (*XaiOAuthKey, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil, errors.New("xai channel: empty oauth key")
	}
	if !strings.HasPrefix(raw, "{") {
		return nil, errors.New("xai channel: oauth key must be a JSON object")
	}
	var key XaiOAuthKey
	if err := common.Unmarshal([]byte(raw), &key); err != nil {
		return nil, errors.New("xai channel: invalid oauth key json")
	}
	return &key, nil
}

func xaiOAuthKeyNeedsRefresh(oauthKey *XaiOAuthKey, now time.Time) bool {
	if oauthKey == nil || strings.TrimSpace(oauthKey.RefreshToken) == "" {
		return false
	}
	expiredAtRaw := strings.TrimSpace(oauthKey.Expired)
	if expiredAtRaw == "" {
		return true
	}
	expiredAt, err := time.Parse(time.RFC3339, expiredAtRaw)
	if err != nil || expiredAt.IsZero() {
		return true
	}
	return !expiredAt.After(now.Add(xaiCredentialRefreshSkew))
}

func applyXaiOAuthRefreshResult(oauthKey *XaiOAuthKey, res *XaiOAuthTokenResult) {
	if oauthKey == nil || res == nil {
		return
	}
	oauthKey.AccessToken = res.AccessToken
	oauthKey.RefreshToken = res.RefreshToken
	oauthKey.LastRefresh = time.Now().Format(time.RFC3339)
	oauthKey.Expired = res.ExpiresAt.Format(time.RFC3339)
	if strings.TrimSpace(oauthKey.Type) == "" {
		oauthKey.Type = "xai"
	}
	if res.TokenType != "" {
		oauthKey.TokenType = res.TokenType
	}
	if strings.TrimSpace(oauthKey.Email) == "" {
		if email, ok := ExtractEmailFromJWT(oauthKey.AccessToken); ok {
			oauthKey.Email = email
		} else if strings.TrimSpace(oauthKey.IDToken) != "" {
			if email, ok := ExtractEmailFromJWT(oauthKey.IDToken); ok {
				oauthKey.Email = email
			}
		}
	}
}

func persistXaiOAuthKey(channelID int, oauthKey *XaiOAuthKey, resetCaches bool) error {
	encoded, err := common.Marshal(oauthKey)
	if err != nil {
		return err
	}
	if err := model.DB.Model(&model.Channel{}).Where("id = ?", channelID).Update("key", string(encoded)).Error; err != nil {
		return err
	}
	if resetCaches {
		model.InitChannelCache()
		ResetProxyClientCache()
	}
	return nil
}

func RefreshXaiChannelCredential(ctx context.Context, channelID int, opts XaiCredentialRefreshOptions) (*XaiOAuthKey, *model.Channel, error) {
	ch, err := model.GetChannelById(channelID, true)
	if err != nil {
		return nil, nil, err
	}
	if ch == nil {
		return nil, nil, fmt.Errorf("channel not found")
	}
	if ch.Type != constant.ChannelTypeXai {
		return nil, nil, fmt.Errorf("channel type is not xAI")
	}

	oauthKey, err := parseXaiOAuthKey(strings.TrimSpace(ch.Key))
	if err != nil {
		return nil, nil, err
	}
	if strings.TrimSpace(oauthKey.RefreshToken) == "" {
		return nil, nil, fmt.Errorf("xai channel: refresh_token is required to refresh credential")
	}

	refreshCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	res, err := RefreshXaiOAuthTokenWithProxy(refreshCtx, oauthKey.RefreshToken, ch.GetSetting().Proxy, oauthKey.ClientID)
	if err != nil {
		return nil, nil, err
	}

	applyXaiOAuthRefreshResult(oauthKey, res)

	if err := persistXaiOAuthKey(ch.Id, oauthKey, opts.ResetCaches); err != nil {
		return nil, nil, err
	}

	return oauthKey, ch, nil
}

func RefreshXaiChannelKeyIfNeeded(ctx context.Context, channelID int, rawKey, proxyURL string) (bool, string, error) {
	rawKey = strings.TrimSpace(rawKey)
	if channelID <= 0 || rawKey == "" || !strings.HasPrefix(rawKey, "{") {
		return false, rawKey, nil
	}

	oauthKey, err := parseXaiOAuthKey(rawKey)
	if err != nil {
		return false, rawKey, nil
	}
	if !xaiOAuthKeyNeedsRefresh(oauthKey, time.Now()) {
		return false, rawKey, nil
	}

	refreshCtx, cancel := context.WithTimeout(ctx, 8*time.Second)
	defer cancel()

	res, err := RefreshXaiOAuthTokenWithProxy(refreshCtx, oauthKey.RefreshToken, proxyURL, oauthKey.ClientID)
	if err != nil {
		return false, rawKey, err
	}

	applyXaiOAuthRefreshResult(oauthKey, res)
	if err := persistXaiOAuthKey(channelID, oauthKey, true); err != nil {
		return false, rawKey, err
	}

	encoded, err := common.Marshal(oauthKey)
	if err != nil {
		return true, rawKey, err
	}
	return true, string(encoded), nil
}