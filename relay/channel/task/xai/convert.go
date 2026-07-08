package xai

import (
	"fmt"
	"strings"

	"github.com/QuantumNous/new-api/model"
	"github.com/tidwall/gjson"
)

const (
	minVideoDuration    = 1
	maxVideoDuration    = 15
	defaultVideoSeconds = 5
	maxVideoReferences  = 7
)

func nativeVideoInputImageURL(rawJSON []byte) (string, error) {
	image := gjson.GetBytes(rawJSON, "image")
	if !image.Exists() {
		return "", nil
	}
	if image.Type == gjson.String {
		return "", fmt.Errorf("image must be an object with a url field")
	}
	url := strings.TrimSpace(image.Get("url").String())
	if url == "" {
		return "", fmt.Errorf("image.url is required when image is provided")
	}
	return url, nil
}

func collectVideoReferenceImages(rawJSON []byte) []string {
	out := make([]string, 0)
	appendRef := func(value string) {
		value = strings.TrimSpace(value)
		if value != "" {
			out = append(out, value)
		}
	}
	collectArray := func(result gjson.Result) {
		if !result.IsArray() {
			return
		}
		result.ForEach(func(_, item gjson.Result) bool {
			if item.Type == gjson.String {
				appendRef(item.String())
				return true
			}
			if value := item.Get("url").String(); value != "" {
				appendRef(value)
			}
			return true
		})
	}
	collectArray(gjson.GetBytes(rawJSON, "reference_images"))
	return out
}

func validateNativeVideoSourceVideo(body []byte) error {
	video := gjson.GetBytes(body, "video")
	if !video.Exists() {
		return fmt.Errorf("video is required")
	}
	if video.Type == gjson.String {
		return fmt.Errorf("video must be an object with a url or file_id field")
	}
	url := strings.TrimSpace(video.Get("url").String())
	fileID := strings.TrimSpace(video.Get("file_id").String())
	if url == "" && fileID == "" {
		return fmt.Errorf("video must provide exactly one of url or file_id")
	}
	if url != "" && fileID != "" {
		return fmt.Errorf("video must provide exactly one of url or file_id")
	}
	return nil
}

func validateNativeVideoConstraints(body []byte) error {
	imageURL, err := nativeVideoInputImageURL(body)
	if err != nil {
		return err
	}
	referenceImages := collectVideoReferenceImages(body)
	if len(referenceImages) > maxVideoReferences {
		return fmt.Errorf("reference_images supports at most %d images on xAI", maxVideoReferences)
	}
	if imageURL != "" && len(referenceImages) > 0 {
		return fmt.Errorf("image and reference_images cannot be combined on xAI")
	}
	return nil
}

func xaiStatusFromTask(task *model.Task) string {
	if task == nil {
		return "pending"
	}
	if len(task.Data) > 0 {
		if status := strings.TrimSpace(gjson.GetBytes(task.Data, "status").String()); status != "" {
			return status
		}
	}
	if task.Status == model.TaskStatusFailure && strings.EqualFold(strings.TrimSpace(task.FailReason), "expired") {
		return "expired"
	}
	return mapTaskStatusToXAI(task.Status)
}

func mapTaskStatusToXAI(status model.TaskStatus) string {
	switch status {
	case model.TaskStatusNotStart, model.TaskStatusSubmitted, model.TaskStatusQueued:
		return "pending"
	case model.TaskStatusInProgress:
		return "processing"
	case model.TaskStatusSuccess:
		return "done"
	case model.TaskStatusFailure:
		return "failed"
	default:
		return "pending"
	}
}