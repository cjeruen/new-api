package xai

import (
	"encoding/json"
	"strings"
)

func ResolveAccessToken(rawKey string) string {
	rawKey = strings.TrimSpace(rawKey)
	if !strings.HasPrefix(rawKey, "{") {
		return rawKey
	}
	var cred struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.Unmarshal([]byte(rawKey), &cred); err == nil && strings.TrimSpace(cred.AccessToken) != "" {
		return cred.AccessToken
	}
	return rawKey
}