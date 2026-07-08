package xai

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNativeVideoInputImageURL(t *testing.T) {
	url, err := nativeVideoInputImageURL([]byte(`{"image":{"url":"https://example.com/a.png"}}`))
	require.NoError(t, err)
	assert.Equal(t, "https://example.com/a.png", url)

	_, err = nativeVideoInputImageURL([]byte(`{"image":"https://example.com/a.png"}`))
	require.Error(t, err)
}

func TestValidateNativeVideoSourceVideo(t *testing.T) {
	err := validateNativeVideoSourceVideo([]byte(`{"video":{"url":"https://example.com/video.mp4"}}`))
	require.NoError(t, err)

	err = validateNativeVideoSourceVideo([]byte(`{"model":"grok-imagine-video","prompt":"edit"}`))
	require.Error(t, err)
	require.Contains(t, err.Error(), "video is required")
}

func TestValidateNativeVideoConstraints(t *testing.T) {
	err := validateNativeVideoConstraints([]byte(`{
		"image": {"url": "https://example.com/a.png"},
		"reference_images": [{"url": "https://example.com/b.png"}]
	}`))
	require.Error(t, err)
	assert.Contains(t, err.Error(), "cannot be combined")
}

func TestCollectVideoReferenceImages(t *testing.T) {
	refs := collectVideoReferenceImages([]byte(`{
		"reference_images": [
			{"url": "https://example.com/a.png"},
			"https://example.com/b.png"
		]
	}`))
	assert.Equal(t, []string{
		"https://example.com/a.png",
		"https://example.com/b.png",
	}, refs)
}