import { env } from "../config/env";
import {
  getAssistantTurnTelemetry,
  getRedactionHitCount,
  sumTokenEstimateWithinWindow,
  summarizeAssistantProviderHealth,
  summarizeAssistantQualityProxy,
  summarizeAssistantCost,
  type ProviderHealthSummary,
} from "./assistantTelemetry";

/**
 * GĐ5 (Alerting/SLO) cho assistant.
 *
 * Đọc telemetry redacted đã tổng hợp (provider health, quality proxy, cost) và so với
 * ngưỡng SLO cấu hình qua env. KHÔNG đọc raw prompt/secret; chỉ làm việc trên metadata.
 *
 * Mục tiêu: trả lời nhanh "có cần can thiệp/rollback không?" cho dashboard/runbook.
 */

export type AlertSeverity = "warning" | "critical";

export interface AssistantAlert {
  code: string;
  severity: AlertSeverity;
  message: string;
  /** Giá trị đo được (số). */
  value: number;
  /** Ngưỡng vi phạm. */
  threshold: number;
  /** Scope: provider/model hoặc "global". */
  scope: string;
}

export interface AssistantAlertReport {
  alerts: AssistantAlert[];
  sampleSize: number;
  minSample: number;
  evaluated: boolean;
  generatedAt: string;
}

function rate(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 100);
}

function pushIfExceeds(
  alerts: AssistantAlert[],
  opts: {
    value: number;
    threshold: number;
    code: string;
    severity: AlertSeverity;
    scope: string;
    label: string;
    unit?: string;
  },
): void {
  if (opts.value > opts.threshold) {
    const unit = opts.unit ?? "";
    alerts.push({
      code: opts.code,
      severity: opts.severity,
      message: `${opts.label} (${opts.scope}) = ${opts.value}${unit} vượt ngưỡng ${opts.threshold}${unit}`,
      value: opts.value,
      threshold: opts.threshold,
      scope: opts.scope,
    });
  }
}

function evaluateProviderHealth(health: ProviderHealthSummary[], alerts: AssistantAlert[]): void {
  for (const h of health) {
    const scope = `${h.provider}/${h.model}`;
    pushIfExceeds(alerts, {
      value: h.p95LatencyMs,
      threshold: env.AI_SLO_P95_LATENCY_MS,
      code: "AI_SLO_P95_LATENCY",
      severity: "warning",
      scope,
      label: "p95 latency",
      unit: "ms",
    });
    pushIfExceeds(alerts, {
      value: h.errorRate,
      threshold: env.AI_SLO_ERROR_RATE_PCT,
      code: "AI_SLO_ERROR_RATE",
      severity: "critical",
      scope,
      label: "error rate",
      unit: "%",
    });
    pushIfExceeds(alerts, {
      value: rate(h.timeoutCount, h.count),
      threshold: env.AI_SLO_TIMEOUT_RATE_PCT,
      code: "AI_SLO_TIMEOUT_RATE",
      severity: "warning",
      scope,
      label: "timeout rate",
      unit: "%",
    });
    pushIfExceeds(alerts, {
      value: rate(h.rateLimitCount, h.count),
      threshold: env.AI_SLO_RATE_LIMIT_RATE_PCT,
      code: "AI_SLO_RATE_LIMIT_RATE",
      severity: "warning",
      scope,
      label: "rate-limit rate",
      unit: "%",
    });
  }
}

/**
 * Đánh giá SLO và trả về danh sách alert.
 * Phần lớn metric chỉ đánh giá khi sample >= AI_SLO_MIN_SAMPLE (tránh cảnh báo nhiễu do mẫu nhỏ).
 * Ngoại lệ: secret-leak alert (critical) luôn đánh giá ngay vì rò rỉ secret không thể chờ đủ mẫu.
 */
export function evaluateAssistantAlerts(): AssistantAlertReport {
  const turns = getAssistantTurnTelemetry();
  const sampleSize = turns.length;
  const minSample = Math.max(0, env.AI_SLO_MIN_SAMPLE);
  const generatedAt = new Date().toISOString();

  const alerts: AssistantAlert[] = [];

  // Secret-leak alert (critical): đánh giá NGAY, không chờ đủ mẫu.
  // Chỉ đếm secret/token redaction (không tính email lành tính), trong cửa sổ thời gian -> alert tự lành.
  const secretWindowMs = Math.max(0, env.AI_SLO_SECRET_LEAK_WINDOW_MINUTES) * 60_000;
  const redactionHits = getRedactionHitCount(secretWindowMs);
  pushIfExceeds(alerts, {
    value: redactionHits,
    threshold: Math.max(0, env.AI_SLO_SECRET_LEAK_MAX),
    code: "AI_SLO_SECRET_LEAK",
    severity: "critical",
    scope: "global",
    label: "secret/token redaction hits",
  });

  if (sampleSize < minSample) {
    return { alerts, sampleSize, minSample, evaluated: false, generatedAt };
  }

  evaluateProviderHealth(summarizeAssistantProviderHealth(), alerts);

  // Action failure rate (quality proxy từ client events).
  const quality = summarizeAssistantQualityProxy();
  const actionAttempts = quality.actionsExecuted;
  if (actionAttempts > 0) {
    pushIfExceeds(alerts, {
      value: rate(quality.actionsFailed, actionAttempts + quality.actionsFailed),
      threshold: env.AI_SLO_ACTION_FAIL_RATE_PCT,
      code: "AI_SLO_ACTION_FAIL_RATE",
      severity: "warning",
      scope: "global",
      label: "action fail rate",
      unit: "%",
    });
  }

  // Cost: token trung bình mỗi turn vượt budget + tổng chi phí ước tính theo USD (nếu có đơn giá).
  const costPer1k = Math.max(0, env.AI_COST_PER_1K_TOKENS_USD);
  const totalCostThresholdUsd = Math.max(0, env.AI_SLO_TOTAL_COST_USD);
  for (const cost of summarizeAssistantCost()) {
    pushIfExceeds(alerts, {
      value: cost.avgTokenEstimate,
      threshold: env.AI_SLO_AVG_TOKEN_BUDGET,
      code: "AI_SLO_AVG_TOKEN_BUDGET",
      severity: "warning",
      scope: `${cost.provider}/${cost.model}`,
      label: "avg token/turn",
    });
  }

  if (costPer1k > 0 && totalCostThresholdUsd > 0) {
    const costWindowMs = Math.max(0, env.AI_SLO_COST_WINDOW_MINUTES) * 60_000;
    const windowTokens = sumTokenEstimateWithinWindow(costWindowMs);
    const estimatedCostUsd = Math.round(((windowTokens / 1000) * costPer1k) * 100) / 100;
    pushIfExceeds(alerts, {
      value: estimatedCostUsd,
      threshold: totalCostThresholdUsd,
      code: "AI_SLO_TOTAL_COST_USD",
      severity: "warning",
      scope: "global",
      label: "estimated cost",
      unit: " USD",
    });
  }

  return { alerts, sampleSize, minSample, evaluated: true, generatedAt };
}
