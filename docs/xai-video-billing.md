# xAI Video 扣费说明

> 适用模型：`grok-imagine-video`、`grok-imagine-video-1.5`、`grok-imagine-video-1.5-preview`  
> 端点：`POST /v1/videos/generations` + `GET /v1/videos/{request_id}`  
> 上游计费字段：[xAI Cost Tracking](https://docs.x.ai/developers/cost-tracking) — `usage.cost_in_usd_ticks`  
> 实现代码：`relay/channel/task/xai/billing.go`

---

## 1. 核心原则

xAI 视频采用 **两阶段计费**：

| 阶段 | 时机 | 作用 |
|------|------|------|
| **预扣** | 提交任务时 | 按后台配置估算，先冻结额度（押金） |
| **结算** | 轮询到 `status: done` | 按上游 `cost_in_usd_ticks` 算实际费用，与预扣多退少补 |

**最终实扣始终以 `cost_in_usd_ticks` 为准**（任务成功且有该字段时）。  
后台的固定价格 / 模型倍率，在结算阶段作用不同（见下文）。

分组倍率（`groupRatio`）在预扣和结算中**都会参与**。

---

## 2. 额度与美元换算

系统常量（`common/constants.go`）：

```
QuotaPerUnit = 500,000    // 即 ＄1.00 = 500,000 quota
```

xAI ticks 换算（[官方文档](https://docs.x.ai/developers/cost-tracking)）：

```
cost_usd = cost_in_usd_ticks / 10,000,000,000
```

---

## 3. 预扣费（提交时）

预扣在 `relay/relay_task.go` → `RelayTaskSubmit` 中完成，分两步：

### 3.1 基础额度

由 `relay/helper/price.go` → `ModelPriceHelperPerCall` 计算。

#### 情况 A：配置了固定模型价格（按次计费）

```
baseQuota = modelPrice × QuotaPerUnit × groupRatio
```

#### 情况 B：配置了模型倍率（未配固定价）

```
baseQuota = (modelRatio / 2) × QuotaPerUnit × groupRatio
```

> `modelRatio / 2` 是任务类模型的预扣保守估算，与其他异步任务一致。

### 3.2 乘以视频时长（seconds）

xAI 适配器在 `relay/channel/task/xai/adaptor.go` → `EstimateBilling` 中读取请求体 `duration`：

- 请求带了 `duration` → 用该值（1–15）
- 未带 `duration` → 默认 **5 秒**（`defaultVideoSeconds`）

然后在 `relay/relay_task.go` 中：

```
预扣 quota = baseQuota × seconds
```

除非模型名在 `TaskPricePatches` 环境变量白名单中（一般未配置），否则 **一定会乘 seconds**。

### 3.3 预扣示例

假设 `groupRatio = 1`，`duration = 5`：

| 后台配置 | baseQuota（美元） | 预扣（含 seconds） |
|----------|-------------------|-------------------|
| 固定价 ＄1/次 | ＄1.00 | ＄1 × 5 = **＄5.00** |
| 固定价 ＄0.20/次 | ＄0.20 | ＄0.20 × 5 = **＄1.00** |
| 模型倍率 0.1 | ＄0.05（0.1/2 × ＄1） | ＄0.05 × 5 = **＄0.25** |
| 模型倍率 1.0 | ＄0.50（1/2 × ＄1） | ＄0.50 × 5 = **＄2.50** |

> 这就是为什么「固定价设 ＄1」却看到预扣 ＄5：默认/请求时长为 5 秒，预扣 = ＄1 × 5。

### 3.4 提交时的日志

提交成功后会立即调用 `SettleBilling`（`service/billing.go`）。若预扣与提交时 `finalQuota` 一致，日志类似：

```
预扣费与实际消耗一致，无需调整：＄5.000000（按次计费）
```

注意：

- 这是**提交瞬间**的日志，不是视频完成后的最终结算。
- 文案里的「按次计费」仅表示差额为 0，**不代表**后续不会按 ticks 调整。
- xAI 视频在 `controller/relay.go` 中强制 `PerCallBilling = false`，确保轮询阶段会执行 ticks 差额结算。

---

## 4. 完成结算（`status: done`）

轮询成功后，`relay/channel/task/xai/billing.go` → `AdjustBillingOnComplete` 读取 `task.Data` 中的：

```json
"usage": { "cost_in_usd_ticks": 3520000000 }
```

### 4.1 结算公式

```
cost_usd     = cost_in_usd_ticks / 10_000_000_000
actualQuota  = cost_usd × QuotaPerUnit × groupRatio × modelRatio
```

- **不再**乘 `seconds`（ticks 已包含上游实际费用）
- **不再**使用固定价格 `modelPrice`

与预扣做差额：

```
delta = actualQuota - 预扣 quota
```

- `delta > 0` → 补扣
- `delta < 0` → 退还
- `delta = 0` → 无需调整

完成后日志示例：

```
任务 task_xxx 差额结算：delta=...（实际：...，预扣：...，adaptor计费调整）
```

---

## 5. 两种后台配置详解

### 5.1 配置了固定模型价格

**后台操作**：模型定价 → 选择「按次计费」→ 填写价格（如 ＄1）。

**预扣阶段**：

```
预扣 = modelPrice × QuotaPerUnit × groupRatio × seconds
```

固定价格作为「每秒单价」与 `seconds` 相乘（当前实现行为）。

**结算阶段**：

- **不使用** `modelPrice`
- 若 `BillingContext.ModelRatio = 0`（固定价模式下通常为 0），结算时 `modelRatio` 默认为 **1.0**
- 实际扣费 = 上游 USD 成本 × 分组倍率

```
actualQuota = cost_usd × QuotaPerUnit × groupRatio
```

**完整数值示例**（固定价 ＄1，duration=5，groupRatio=1，上游 ticks=3_520_000_000）：

| 阶段 | 计算 | 金额 |
|------|------|------|
| 预扣 | ＄1 × 5 | ＄5.00 |
| 结算 | ＄0.352 × 1 | ＄0.352 |
| 差额 | 退还 | ＄4.648 |

**注意**：固定价格**不能**让用户最终只付 ＄1/次；它只影响预扣估算。若希望用户按固定价结算而非 ticks，需另行开发。

---

### 5.2 配置了模型倍率

**后台操作**：模型定价 → 选择「按量计费」→ 填写模型倍率（如 0.1）。

**前提**：未配置固定价格（固定价优先级更高，会走 `UsePrice=true` 分支）。

**预扣阶段**：

```
baseQuota = (modelRatio / 2) × QuotaPerUnit × groupRatio
预扣      = baseQuota × seconds
```

**结算阶段**：

```
actualQuota = cost_usd × QuotaPerUnit × groupRatio × modelRatio
```

模型倍率在结算时作为**折扣/加价系数**叠加上游成本。

**完整数值示例**（modelRatio=0.1，duration=5，groupRatio=1，ticks=3_520_000_000）：

| 阶段 | 计算 | 金额 |
|------|------|------|
| 预扣 | (0.1/2) × ＄1 × 5 | ＄0.25 |
| 结算 | ＄0.352 × 0.1 | ＄0.0352 |
| 差额 | 退还 | ＄0.2148 |

**倍率含义**：`modelRatio = 0.1` 表示用户支付上游成本的 10%（再乘分组倍率）。

---

## 6. 分组倍率

分组倍率在预扣和结算中均生效：

| 配置项 | 预扣 | 结算 |
|--------|------|------|
| 分组倍率 `groupRatio` | ✅ | ✅ |
| 固定价格 `modelPrice` | ✅（× seconds） | ❌ |
| 模型倍率 `modelRatio` | ✅（/2 × seconds） | ✅ |
| 视频秒数 `seconds` | ✅ | ❌ |
| 上游 ticks | ❌ | ✅ |

用户组特殊倍率在提交时通过 `HandleGroupRatio` 写入 `BillingContext.GroupRatio`（已含特殊倍率）。

---

## 7. API 响应 vs 用户实扣

轮询返回的 JSON 中：

```json
{
  "usage": { "cost_in_usd_ticks": 3520000000 },
  "status": "done"
}
```

- `cost_in_usd_ticks` 是 **xAI 上游实际成本**，不会随你的后台倍率改变。
- 用户实际扣费看消费日志中的 `actual_quota`，由后台结算公式计算。

---

## 8. 异常与边界

| 场景 | 行为 |
|------|------|
| 任务 `failed` / `expired` | 退还预扣，不按 ticks 结算 |
| `done` 但无 `cost_in_usd_ticks` | 保持预扣金额不变 |
| 同时配了固定价和倍率 | 固定价优先；`ModelRatio` 快照为 0，结算按倍率 1.0 |
| 免费模型（价格/倍率为 0） | 预扣可能为 0；若有 ticks，结算仍可能扣费 |
| 服务未重启 | 旧代码可能不执行 ticks 差额结算 |

---

## 9. 代码索引

| 环节 | 文件 | 函数 |
|------|------|------|
| 固定价/倍率基础额度 | `relay/helper/price.go` | `ModelPriceHelperPerCall` |
| 读取 duration | `relay/channel/task/xai/adaptor.go` | `EstimateBilling` |
| 默认 5 秒 | `relay/channel/task/xai/convert.go` | `defaultVideoSeconds` |
| 预扣 = base × seconds | `relay/relay_task.go` | `RelayTaskSubmit`（步骤 5–7） |
| 提交时结算日志 | `service/billing.go` | `SettleBilling` |
| 禁用按次跳过结算 | `controller/relay.go` | `RelayTask`（`PerCallBilling=false`） |
| ticks 完成结算 | `relay/channel/task/xai/billing.go` | `AdjustBillingOnComplete` |
| 差额多退少补 | `service/task_billing.go` | `RecalculateTaskQuota` |
| 轮询触发结算 | `service/task_polling.go` | `settleTaskBillingOnComplete` |

---

## 10. 配置建议

### 想按上游成本透传（推荐）

1. 只配**模型倍率**（如 `1.0` 原价，`1.2` 加价 20%）
2. 不要同时配固定价格
3. 预扣可设高一些（或接受完成时补扣），避免预扣不足

### 想用固定价做预扣估算

1. 理解预扣 = 固定价 × 秒数，不是固定价 × 1 次
2. 若 duration 最长 15 秒，可按 `固定价 × 15` 估算最大预扣
3. 最终仍以 ticks 结算

### 排查扣费不符

1. 确认服务已部署含 `billing.go` 的最新代码
2. 等视频 `done` 后查 `adaptor计费调整` 日志
3. 核对消费日志 `pre_consumed_quota` vs `actual_quota`
4. 确认是否同时配了固定价（导致倍率不生效）

---

## 11. 快速对照表

| 你的配置 | 预扣公式 | 结算公式 |
|----------|----------|----------|
| 固定价 ＄P | ＄P × seconds × groupRatio | cost_usd × groupRatio |
| 倍率 R | (R/2) × seconds × groupRatio | cost_usd × R × groupRatio |
| 固定价 + 倍率 | 走固定价预扣 | cost_usd × groupRatio（倍率忽略） |

---

## 相关文档

- [xAI Video Generation 测试报告](./xai-video-generation-test.md)
- [xAI Cost Tracking 官方文档](https://docs.x.ai/developers/cost-tracking)