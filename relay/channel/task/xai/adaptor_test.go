package xai

import (
	"testing"

	"github.com/QuantumNous/new-api/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestParseTaskResultDone(t *testing.T) {
	a := &TaskAdaptor{}
	body := []byte(`{
		"status": "done",
		"model": "grok-imagine-video",
		"video": {
			"url": "https://vidgen.x.ai/example.mp4",
			"duration": 8
		}
	}`)

	result, err := a.ParseTaskResult(body)
	require.NoError(t, err)
	assert.Equal(t, model.TaskStatusSuccess, result.Status)
	assert.Equal(t, "https://vidgen.x.ai/example.mp4", result.Url)
	assert.Equal(t, "100%", result.Progress)
}

func TestParseTaskResultExpired(t *testing.T) {
	a := &TaskAdaptor{}
	body := []byte(`{"status":"expired","model":"grok-imagine-video"}`)

	result, err := a.ParseTaskResult(body)
	require.NoError(t, err)
	assert.Equal(t, model.TaskStatusFailure, result.Status)
	assert.Equal(t, "expired", result.Reason)
	assert.Equal(t, "100%", result.Progress)
}

func TestParseTaskResultPending(t *testing.T) {
	a := &TaskAdaptor{}
	body := []byte(`{"status":"pending","model":"grok-imagine-video"}`)

	result, err := a.ParseTaskResult(body)
	require.NoError(t, err)
	assert.Equal(t, model.TaskStatusQueued, result.Status)
}