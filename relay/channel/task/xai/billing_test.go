package xai

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/stretchr/testify/assert"
)

func TestAdjustBillingOnComplete_FromCostInUsdTicks(t *testing.T) {
	adaptor := &TaskAdaptor{}

	task := &model.Task{
		Data: []byte(`{"status":"done","usage":{"cost_in_usd_ticks":3520000000}}`),
		PrivateData: model.TaskPrivateData{
			BillingContext: &model.TaskBillingContext{GroupRatio: 1.0},
		},
	}
	taskResult := &relaycommon.TaskInfo{Status: model.TaskStatusSuccess}

	// 3520000000 / 1e10 = $0.352 → 0.352 * 500000 = 176000
	assert.Equal(t, 176000, adaptor.AdjustBillingOnComplete(task, taskResult))
}

func TestAdjustBillingOnComplete_AppliesModelRatio(t *testing.T) {
	adaptor := &TaskAdaptor{}

	task := &model.Task{
		Data: []byte(`{"status":"done","usage":{"cost_in_usd_ticks":3520000000}}`),
		PrivateData: model.TaskPrivateData{
			BillingContext: &model.TaskBillingContext{GroupRatio: 1.0, ModelRatio: 0.1},
		},
	}
	taskResult := &relaycommon.TaskInfo{Status: model.TaskStatusSuccess}

	// $0.352 * QuotaPerUnit * 0.1 = 17600
	assert.Equal(t, 17600, adaptor.AdjustBillingOnComplete(task, taskResult))
}

func TestAdjustBillingOnComplete_AppliesGroupRatio(t *testing.T) {
	adaptor := &TaskAdaptor{}

	task := &model.Task{
		Data: []byte(`{"status":"done","usage":{"cost_in_usd_ticks":10000000000}}`),
		PrivateData: model.TaskPrivateData{
			BillingContext: &model.TaskBillingContext{GroupRatio: 2.0},
		},
	}
	taskResult := &relaycommon.TaskInfo{Status: model.TaskStatusSuccess}

	// $1.00 * QuotaPerUnit * 2 = 1_000_000
	assert.Equal(t, common.QuotaFromFloat(1.0*common.QuotaPerUnit*2.0), adaptor.AdjustBillingOnComplete(task, taskResult))
}

func TestAdjustBillingOnComplete_SkipsNonSuccess(t *testing.T) {
	adaptor := &TaskAdaptor{}
	task := &model.Task{
		Data: []byte(`{"status":"failed","usage":{"cost_in_usd_ticks":3520000000}}`),
	}

	assert.Equal(t, 0, adaptor.AdjustBillingOnComplete(task, &relaycommon.TaskInfo{Status: model.TaskStatusFailure}))
}

func TestAdjustBillingOnComplete_SkipsMissingTicks(t *testing.T) {
	adaptor := &TaskAdaptor{}
	task := &model.Task{Data: []byte(`{"status":"done"}`)}

	assert.Equal(t, 0, adaptor.AdjustBillingOnComplete(task, &relaycommon.TaskInfo{Status: model.TaskStatusSuccess}))
}