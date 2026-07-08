package xai

import (
	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/tidwall/gjson"
)

// CostInUsdTicksPerDollar is xAI's tick precision: 1 USD = 10^10 ticks.
// See https://docs.x.ai/developers/cost-tracking
const CostInUsdTicksPerDollar = 10_000_000_000

// AdjustBillingOnComplete settles video tasks using upstream cost_in_usd_ticks.
// Pre-charge uses model price × seconds; settlement uses actual USD from xAI.
func (a *TaskAdaptor) AdjustBillingOnComplete(task *model.Task, taskResult *relaycommon.TaskInfo) int {
	if taskResult == nil || taskResult.Status != model.TaskStatusSuccess {
		return 0
	}
	if task == nil || len(task.Data) == 0 {
		return 0
	}

	ticks := gjson.GetBytes(task.Data, "usage.cost_in_usd_ticks").Int()
	if ticks <= 0 {
		return 0
	}

	costUSD := float64(ticks) / CostInUsdTicksPerDollar

	groupRatio := 1.0
	modelRatio := 1.0
	if bc := task.PrivateData.BillingContext; bc != nil {
		if bc.GroupRatio > 0 {
			groupRatio = bc.GroupRatio
		}
		if bc.ModelRatio > 0 {
			modelRatio = bc.ModelRatio
		}
	}

	return common.QuotaFromFloat(costUSD * common.QuotaPerUnit * groupRatio * modelRatio)
}