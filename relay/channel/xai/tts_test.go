package xai

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestBuildUpstreamTTSBodyStripsRoutingFields(t *testing.T) {
	raw := []byte(`{
		"model": "grok-tts",
		"group": "vip",
		"text": "Hello world",
		"voice_id": "eve",
		"language": "en"
	}`)

	out, err := buildUpstreamTTSBody(raw)
	require.NoError(t, err)
	require.NotContains(t, string(out), `"model"`)
	require.NotContains(t, string(out), `"group"`)
	require.Contains(t, string(out), `"text":"Hello world"`)
	require.Contains(t, string(out), `"language":"en"`)
}

func TestValidateXAITTSRequest(t *testing.T) {
	err := validateXAITTSRequest([]byte(`{"text":"hi","language":"en"}`))
	require.NoError(t, err)

	err = validateXAITTSRequest([]byte(`{"language":"en"}`))
	require.Error(t, err)
	require.Contains(t, err.Error(), "text is required")

	err = validateXAITTSRequest([]byte(`{"text":"hi"}`))
	require.Error(t, err)
	require.Contains(t, err.Error(), "language is required")
}