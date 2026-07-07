package service

import (
	"testing"
	"time"
)

func TestXaiOAuthKeyNeedsRefresh(t *testing.T) {
	now := time.Date(2026, 7, 8, 12, 0, 0, 0, time.UTC)

	tests := []struct {
		name string
		key  *XaiOAuthKey
		want bool
	}{
		{
			name: "missing expired",
			key:  &XaiOAuthKey{RefreshToken: "rt"},
			want: true,
		},
		{
			name: "expired",
			key: &XaiOAuthKey{
				RefreshToken: "rt",
				Expired:      now.Add(-time.Minute).Format(time.RFC3339),
			},
			want: true,
		},
		{
			name: "within skew window",
			key: &XaiOAuthKey{
				RefreshToken: "rt",
				Expired:      now.Add(30 * time.Minute).Format(time.RFC3339),
			},
			want: true,
		},
		{
			name: "still fresh",
			key: &XaiOAuthKey{
				RefreshToken: "rt",
				Expired:      now.Add(2 * time.Hour).Format(time.RFC3339),
			},
			want: false,
		},
		{
			name: "no refresh token",
			key:  &XaiOAuthKey{Expired: now.Add(-time.Minute).Format(time.RFC3339)},
			want: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := xaiOAuthKeyNeedsRefresh(tt.key, now); got != tt.want {
				t.Fatalf("xaiOAuthKeyNeedsRefresh() = %v, want %v", got, tt.want)
			}
		})
	}
}