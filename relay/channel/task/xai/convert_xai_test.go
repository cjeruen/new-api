package xai

import (
	"testing"

	"github.com/QuantumNous/new-api/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestConvertToXAIVideoFromStoredData(t *testing.T) {
	a := &TaskAdaptor{}
	task := &model.Task{
		TaskID: "task_abc",
		Status: model.TaskStatusSuccess,
		Properties: model.Properties{
			OriginModelName: "grok-imagine-video-1.5",
			Input:           NativeVideoGenerationsPath,
		},
		PrivateData: model.TaskPrivateData{
			ResultURL: "https://vidgen.x.ai/example.mp4",
		},
		Data: []byte(`{
			"status": "done",
			"model": "grok-imagine-video-1.5",
			"video": {"url": "https://vidgen.x.ai/example.mp4", "duration": 12}
		}`),
	}

	respBody, err := a.ConvertToXAIVideo(task)
	require.NoError(t, err)
	assert.JSONEq(t, `{
		"status": "done",
		"model": "grok-imagine-video-1.5",
		"video": {"url": "https://vidgen.x.ai/example.mp4", "duration": 12}
	}`, string(respBody))
}

func TestConvertToXAIVideoPending(t *testing.T) {
	a := &TaskAdaptor{}
	task := &model.Task{
		TaskID: "task_abc",
		Status: model.TaskStatusQueued,
		Properties: model.Properties{
			OriginModelName: "grok-imagine-video-1.5",
		},
		Data: []byte(`{"request_id":"upstream-id"}`),
	}

	respBody, err := a.ConvertToXAIVideo(task)
	require.NoError(t, err)
	assert.JSONEq(t, `{
		"status": "pending",
		"model": "grok-imagine-video-1.5",
		"video": {"url": "", "duration": 0}
	}`, string(respBody))
}

func TestConvertToXAIVideoExpired(t *testing.T) {
	a := &TaskAdaptor{}
	task := &model.Task{
		TaskID:     "task_abc",
		Status:     model.TaskStatusFailure,
		FailReason: "expired",
		Properties: model.Properties{
			OriginModelName: "grok-imagine-video",
		},
		Data: []byte(`{"request_id":"upstream-id"}`),
	}

	respBody, err := a.ConvertToXAIVideo(task)
	require.NoError(t, err)
	assert.JSONEq(t, `{
		"status": "expired",
		"model": "grok-imagine-video",
		"video": {"url": "", "duration": 0}
	}`, string(respBody))
}

func TestXAIStatusFromTaskPreservesStoredStatus(t *testing.T) {
	task := &model.Task{
		Status:     model.TaskStatusFailure,
		FailReason: "expired",
		Data:       []byte(`{"status":"expired","model":"grok-imagine-video"}`),
	}
	assert.Equal(t, "expired", xaiStatusFromTask(task))
}

func TestMapTaskStatusToXAI(t *testing.T) {
	assert.Equal(t, "pending", mapTaskStatusToXAI(model.TaskStatusQueued))
	assert.Equal(t, "processing", mapTaskStatusToXAI(model.TaskStatusInProgress))
	assert.Equal(t, "done", mapTaskStatusToXAI(model.TaskStatusSuccess))
	assert.Equal(t, "failed", mapTaskStatusToXAI(model.TaskStatusFailure))
}