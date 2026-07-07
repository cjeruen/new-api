package xai

import "testing"

func TestResolveAccessToken(t *testing.T) {
	tests := []struct {
		name   string
		rawKey string
		want   string
	}{
		{
			name:   "json credential",
			rawKey: `{"type":"xai","access_token":"token-a","refresh_token":"token-r"}`,
			want:   "token-a",
		},
		{
			name:   "plain api key",
			rawKey: "sk-test",
			want:   "sk-test",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := ResolveAccessToken(tt.rawKey); got != tt.want {
				t.Fatalf("ResolveAccessToken() = %q, want %q", got, tt.want)
			}
		})
	}
}