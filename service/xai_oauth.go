package service

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
)

const (
	xaiOAuthClientID = "b1a00492-073a-47ea-816f-4c329264a828"
	xaiOAuthTokenURL = "https://auth.x.ai/oauth2/token"
)

type XaiOAuthTokenResult struct {
	AccessToken  string
	RefreshToken string
	ExpiresAt    time.Time
	TokenType    string
}

func RefreshXaiOAuthToken(ctx context.Context, refreshToken string) (*XaiOAuthTokenResult, error) {
	return RefreshXaiOAuthTokenWithProxy(ctx, refreshToken, "", "")
}

func RefreshXaiOAuthTokenWithProxy(ctx context.Context, refreshToken, proxyURL, clientID string) (*XaiOAuthTokenResult, error) {
	client, err := getCodexOAuthHTTPClient(proxyURL)
	if err != nil {
		return nil, err
	}
	return refreshXaiOAuthToken(ctx, client, xaiOAuthTokenURL, normalizeXaiOAuthClientID(clientID), refreshToken)
}

func normalizeXaiOAuthClientID(clientID string) string {
	clientID = strings.TrimSpace(clientID)
	if clientID == "" {
		return xaiOAuthClientID
	}
	return clientID
}

func refreshXaiOAuthToken(
	ctx context.Context,
	client *http.Client,
	tokenURL string,
	clientID string,
	refreshToken string,
) (*XaiOAuthTokenResult, error) {
	rt := strings.TrimSpace(refreshToken)
	if rt == "" {
		return nil, errors.New("empty refresh_token")
	}

	form := url.Values{}
	form.Set("grant_type", "refresh_token")
	form.Set("client_id", clientID)
	form.Set("refresh_token", rt)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, tokenURL, strings.NewReader(form.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "new-api-xai-oauth/1.0")

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var payload struct {
		AccessToken  string `json:"access_token"`
		RefreshToken string `json:"refresh_token"`
		ExpiresIn    int    `json:"expires_in"`
		TokenType    string `json:"token_type"`
		Error            string `json:"error"`
		ErrorDescription string `json:"error_description"`
	}

	if err := common.Unmarshal(body, &payload); err != nil {
		return nil, fmt.Errorf("xai oauth refresh failed: invalid response (status=%d)", resp.StatusCode)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		if msg := strings.TrimSpace(payload.ErrorDescription); msg != "" {
			return nil, fmt.Errorf("xai oauth refresh failed: %s", msg)
		}
		if msg := strings.TrimSpace(payload.Error); msg != "" {
			return nil, fmt.Errorf("xai oauth refresh failed: %s", msg)
		}
		return nil, fmt.Errorf("xai oauth refresh failed: status=%d", resp.StatusCode)
	}

	if strings.TrimSpace(payload.AccessToken) == "" || payload.ExpiresIn <= 0 {
		return nil, errors.New("xai oauth refresh response missing fields")
	}

	refreshTokenOut := strings.TrimSpace(payload.RefreshToken)
	if refreshTokenOut == "" {
		refreshTokenOut = rt
	}

	return &XaiOAuthTokenResult{
		AccessToken:  strings.TrimSpace(payload.AccessToken),
		RefreshToken: refreshTokenOut,
		ExpiresAt:    time.Now().Add(time.Duration(payload.ExpiresIn) * time.Second),
		TokenType:    strings.TrimSpace(payload.TokenType),
	}, nil
}