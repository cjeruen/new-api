package service

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestRefreshXaiOAuthTokenWithProxy(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Fatalf("method = %s", r.Method)
		}
		if err := r.ParseForm(); err != nil {
			t.Fatalf("ParseForm: %v", err)
		}
		if r.Form.Get("grant_type") != "refresh_token" {
			t.Fatalf("grant_type = %s", r.Form.Get("grant_type"))
		}
		if r.Form.Get("client_id") != xaiOAuthClientID {
			t.Fatalf("client_id = %s", r.Form.Get("client_id"))
		}
		if r.Form.Get("refresh_token") != "rt-1" {
			t.Fatalf("refresh_token = %s", r.Form.Get("refresh_token"))
		}
		_ = json.NewEncoder(w).Encode(map[string]any{
			"access_token":  "access-new",
			"refresh_token": "rt-rotated",
			"expires_in":    3600,
			"token_type":    "Bearer",
		})
	}))
	defer server.Close()

	client := server.Client()
	res, err := refreshXaiOAuthToken(context.Background(), client, server.URL, xaiOAuthClientID, "rt-1")
	if err != nil {
		t.Fatalf("refreshXaiOAuthToken() error = %v", err)
	}
	if res.AccessToken != "access-new" {
		t.Fatalf("AccessToken = %q", res.AccessToken)
	}
	if res.RefreshToken != "rt-rotated" {
		t.Fatalf("RefreshToken = %q", res.RefreshToken)
	}
	if res.TokenType != "Bearer" {
		t.Fatalf("TokenType = %q", res.TokenType)
	}
	if res.ExpiresAt.IsZero() {
		t.Fatalf("ExpiresAt is zero")
	}
}

func TestRefreshXaiOAuthTokenKeepsRefreshTokenWhenMissing(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{
			"access_token": "access-new",
			"expires_in":   3600,
		})
	}))
	defer server.Close()

	res, err := refreshXaiOAuthToken(context.Background(), server.Client(), server.URL, xaiOAuthClientID, "rt-original")
	if err != nil {
		t.Fatalf("refreshXaiOAuthToken() error = %v", err)
	}
	if res.RefreshToken != "rt-original" {
		t.Fatalf("RefreshToken = %q, want rt-original", res.RefreshToken)
	}
}