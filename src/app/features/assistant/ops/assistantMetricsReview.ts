import type { AssistantGoldenExample } from "../assistantFeedback";
import type { AssistantEvent } from "../assistantObservability";
import type { FeedbackReason } from "../types";

export const FEEDBACK_REASONS: FeedbackReason[] = [
  "wrong_action",
  "wrong_context",
  "too_long",
  "too_generic",
  "unsafe",
  "other",
];

export interface AssistantReviewWindow {
  fromIso: string;
  toIso: string;
}

export interface RouteFailureSummary {
  route: string;
  totalTurns: number;
  notHelpfulCount: number;
  wrongContextCount: number;
  actionFailedCount: number;
  failureRate: number;
}

export interface FailureCaseSummary {
  id: string;
  route: string;
  reason?: FeedbackReason;
  userMessage: string;
  assistantMessage: string;
  correction?: string;
  createdAt: string;
}

export type AssistantReviewAlertLevel = "info" | "warn" | "critical";

export interface AssistantReviewAlert {
  id: string;
  level: AssistantReviewAlertLevel;
  metric: string;
  message: string;
  value: number;
  threshold: number;
}

export interface AssistantReviewReport {
  window: AssistantReviewWindow;
  totalEvents: number;
  messagesSent: number;
  messagesReceived: number;
  actionsProposed: number;
  actionsExecuted: number;
  actionsVerified: number;
  actionsFailed: number;
  actionAcceptanceRate: number;
  actionSuccessRate: number;
  feedbackTotal: number;
  feedbackHelpful: number;
  feedbackNotHelpful: number;
  helpfulRatio: number;
  notHelpfulRatio: number;
  feedbackByReason: Record<FeedbackReason, number>;
  topFailureRoutes: RouteFailureSummary[];
  topFailureCases: FailureCaseSummary[];
  alerts: AssistantReviewAlert[];
}

export interface BuildAssistantReviewOptions {
  window?: AssistantReviewWindow;
  now?: Date;
  windowDays?: number;
  maxFailureRoutes?: number;
  maxFailureCases?: number;
}

const DEFAULT_WINDOW_DAYS = 7;
const DEFAULT_MAX_FAILURE_ROUTES = 5;
const DEFAULT_MAX_FAILURE_CASES = 10;

const MIN_FEEDBACK_SAMPLE = 5;
const MIN_ACTION_SAMPLE = 5;

export const REVIEW_KPI_THRESHOLDS = {
  notHelpfulRatioWarn: 0.15,
  wrongContextRatioWarn: 0.05,
  actionAcceptanceRateWarn: 0.35,
  actionSuccessRateWarn: 0.95,
  unsafeFeedbackCritical: 1,
} as const;

function emptyReasonRecord(): Record<FeedbackReason, number> {
  return {
    wrong_action: 0,
    wrong_context: 0,
    too_long: 0,
    too_generic: 0,
    unsafe: 0,
    other: 0,
  };
}

function toTime(iso: string | undefined | null): number {
  if (!iso) return Number.NaN;
  const parsed = Date.parse(iso);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function resolveWindow(options: BuildAssistantReviewOptions): AssistantReviewWindow {
  if (options.window) return options.window;
  const now = options.now ?? new Date();
  const days = options.windowDays ?? DEFAULT_WINDOW_DAYS;
  const to = now;
  const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return { fromIso: from.toISOString(), toIso: to.toISOString() };
}

function withinWindow(iso: string | undefined | null, window: AssistantReviewWindow): boolean {
  const time = toTime(iso);
  if (!Number.isFinite(time)) return false;
  const from = toTime(window.fromIso);
  const to = toTime(window.toIso);
  if (Number.isFinite(from) && time < from) return false;
  if (Number.isFinite(to) && time > to) return false;
  return true;
}

function normalizeRoute(route: string | undefined | null): string {
  const value = (route ?? "").trim();
  return value || "/";
}

function ratio(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return numerator / denominator;
}

function round(value: number, digits = 4): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function isNotHelpful(example: AssistantGoldenExample): boolean {
  return example.rating === "not_helpful";
}

interface RouteAccumulator {
  totalTurns: number;
  notHelpfulCount: number;
  wrongContextCount: number;
  actionFailedCount: number;
}

function ensureRoute(map: Map<string, RouteAccumulator>, route: string): RouteAccumulator {
  let acc = map.get(route);
  if (!acc) {
    acc = { totalTurns: 0, notHelpfulCount: 0, wrongContextCount: 0, actionFailedCount: 0 };
    map.set(route, acc);
  }
  return acc;
}

export function buildAssistantReviewReport(
  events: AssistantEvent[],
  goldenExamples: AssistantGoldenExample[],
  options: BuildAssistantReviewOptions = {},
): AssistantReviewReport {
  const window = resolveWindow(options);
  const maxFailureRoutes = options.maxFailureRoutes ?? DEFAULT_MAX_FAILURE_ROUTES;
  const maxFailureCases = options.maxFailureCases ?? DEFAULT_MAX_FAILURE_CASES;

  const windowedEvents = events.filter((event) => withinWindow(event.createdAt, window));
  const windowedFeedback = goldenExamples.filter((example) => withinWindow(example.createdAt, window));

  const routeMap = new Map<string, RouteAccumulator>();

  let messagesSent = 0;
  let messagesReceived = 0;
  let actionsProposed = 0;
  let actionsExecuted = 0;
  let actionsVerified = 0;
  let actionsFailed = 0;

  for (const event of windowedEvents) {
    const route = normalizeRoute(event.route);
    switch (event.type) {
      case "assistant_message_sent":
        messagesSent += 1;
        break;
      case "assistant_message_received":
        messagesReceived += 1;
        ensureRoute(routeMap, route).totalTurns += 1;
        break;
      case "assistant_action_proposed":
        actionsProposed += 1;
        break;
      case "assistant_action_executed":
        actionsExecuted += 1;
        break;
      case "assistant_action_verified":
        actionsVerified += 1;
        break;
      case "assistant_action_failed":
        actionsFailed += 1;
        ensureRoute(routeMap, route).actionFailedCount += 1;
        break;
    }
  }

  const feedbackByReason = emptyReasonRecord();
  let feedbackHelpful = 0;
  let feedbackNotHelpful = 0;

  for (const example of windowedFeedback) {
    const route = normalizeRoute(example.route);
    if (example.rating === "helpful") {
      feedbackHelpful += 1;
    } else {
      feedbackNotHelpful += 1;
      ensureRoute(routeMap, route).notHelpfulCount += 1;
    }
    if (example.reason) {
      feedbackByReason[example.reason] += 1;
      if (example.reason === "wrong_context") {
        ensureRoute(routeMap, route).wrongContextCount += 1;
      }
    }
  }

  const feedbackTotal = feedbackHelpful + feedbackNotHelpful;
  const actionAcceptanceRate = round(ratio(actionsExecuted, actionsProposed));
  const actionSuccessRate = round(ratio(actionsVerified, actionsExecuted), 4);
  const helpfulRatio = round(ratio(feedbackHelpful, feedbackTotal));
  const notHelpfulRatio = round(ratio(feedbackNotHelpful, feedbackTotal));

  const topFailureRoutes = buildTopFailureRoutes(routeMap, maxFailureRoutes);
  const topFailureCases = buildTopFailureCases(windowedFeedback, maxFailureCases);

  const report: AssistantReviewReport = {
    window,
    totalEvents: windowedEvents.length,
    messagesSent,
    messagesReceived,
    actionsProposed,
    actionsExecuted,
    actionsVerified,
    actionsFailed,
    actionAcceptanceRate,
    actionSuccessRate,
    feedbackTotal,
    feedbackHelpful,
    feedbackNotHelpful,
    helpfulRatio,
    notHelpfulRatio,
    feedbackByReason,
    topFailureRoutes,
    topFailureCases,
    alerts: [],
  };

  report.alerts = evaluateReviewAlerts(report);
  return report;
}

function buildTopFailureRoutes(map: Map<string, RouteAccumulator>, limit: number): RouteFailureSummary[] {
  const summaries: RouteFailureSummary[] = [];
  for (const [route, acc] of map.entries()) {
    const failureSignals = acc.notHelpfulCount + acc.actionFailedCount;
    if (failureSignals === 0) continue;
    const denominator = Math.max(acc.totalTurns, failureSignals);
    summaries.push({
      route,
      totalTurns: acc.totalTurns,
      notHelpfulCount: acc.notHelpfulCount,
      wrongContextCount: acc.wrongContextCount,
      actionFailedCount: acc.actionFailedCount,
      failureRate: round(ratio(failureSignals, denominator)),
    });
  }

  summaries.sort((left, right) => {
    const leftSignals = left.notHelpfulCount + left.actionFailedCount;
    const rightSignals = right.notHelpfulCount + right.actionFailedCount;
    if (rightSignals !== leftSignals) return rightSignals - leftSignals;
    return right.failureRate - left.failureRate;
  });

  return summaries.slice(0, Math.max(0, limit));
}

function buildTopFailureCases(examples: AssistantGoldenExample[], limit: number): FailureCaseSummary[] {
  return examples
    .filter(isNotHelpful)
    .slice()
    .sort((left, right) => toTime(right.createdAt) - toTime(left.createdAt))
    .slice(0, Math.max(0, limit))
    .map((example) => ({
      id: example.id,
      route: normalizeRoute(example.route),
      reason: example.reason,
      userMessage: example.userMessage,
      assistantMessage: example.assistantMessage,
      correction: example.correction,
      createdAt: example.createdAt,
    }));
}

function evaluateReviewAlerts(report: AssistantReviewReport): AssistantReviewAlert[] {
  const alerts: AssistantReviewAlert[] = [];

  if (report.feedbackByReason.unsafe >= REVIEW_KPI_THRESHOLDS.unsafeFeedbackCritical) {
    alerts.push({
      id: "unsafe_feedback",
      level: "critical",
      metric: "feedback.unsafe",
      message: `Có ${report.feedbackByReason.unsafe} phản hồi gắn cờ unsafe trong kỳ. Cần điều tra ngay.`,
      value: report.feedbackByReason.unsafe,
      threshold: REVIEW_KPI_THRESHOLDS.unsafeFeedbackCritical,
    });
  }

  if (
    report.feedbackTotal >= MIN_FEEDBACK_SAMPLE &&
    report.notHelpfulRatio > REVIEW_KPI_THRESHOLDS.notHelpfulRatioWarn
  ) {
    alerts.push({
      id: "not_helpful_ratio",
      level: "warn",
      metric: "feedback.notHelpfulRatio",
      message: `Tỉ lệ thumbs-down ${(report.notHelpfulRatio * 100).toFixed(1)}% vượt ngưỡng ${(REVIEW_KPI_THRESHOLDS.notHelpfulRatioWarn * 100).toFixed(0)}%.`,
      value: report.notHelpfulRatio,
      threshold: REVIEW_KPI_THRESHOLDS.notHelpfulRatioWarn,
    });
  }

  if (report.feedbackTotal >= MIN_FEEDBACK_SAMPLE) {
    const wrongContextRatio = ratio(report.feedbackByReason.wrong_context, report.feedbackTotal);
    if (wrongContextRatio > REVIEW_KPI_THRESHOLDS.wrongContextRatioWarn) {
      alerts.push({
        id: "wrong_context_ratio",
        level: "warn",
        metric: "feedback.wrongContextRatio",
        message: `Tỉ lệ wrong_context ${(wrongContextRatio * 100).toFixed(1)}% vượt ngưỡng ${(REVIEW_KPI_THRESHOLDS.wrongContextRatioWarn * 100).toFixed(0)}%.`,
        value: round(wrongContextRatio),
        threshold: REVIEW_KPI_THRESHOLDS.wrongContextRatioWarn,
      });
    }
  }

  if (
    report.actionsProposed >= MIN_ACTION_SAMPLE &&
    report.actionAcceptanceRate < REVIEW_KPI_THRESHOLDS.actionAcceptanceRateWarn
  ) {
    alerts.push({
      id: "action_acceptance_rate",
      level: "warn",
      metric: "action.acceptanceRate",
      message: `Action acceptance ${(report.actionAcceptanceRate * 100).toFixed(1)}% dưới ngưỡng ${(REVIEW_KPI_THRESHOLDS.actionAcceptanceRateWarn * 100).toFixed(0)}%.`,
      value: report.actionAcceptanceRate,
      threshold: REVIEW_KPI_THRESHOLDS.actionAcceptanceRateWarn,
    });
  }

  if (
    report.actionsExecuted >= MIN_ACTION_SAMPLE &&
    report.actionSuccessRate < REVIEW_KPI_THRESHOLDS.actionSuccessRateWarn
  ) {
    alerts.push({
      id: "action_success_rate",
      level: "warn",
      metric: "action.successRate",
      message: `Action success ${(report.actionSuccessRate * 100).toFixed(1)}% dưới ngưỡng ${(REVIEW_KPI_THRESHOLDS.actionSuccessRateWarn * 100).toFixed(0)}%.`,
      value: report.actionSuccessRate,
      threshold: REVIEW_KPI_THRESHOLDS.actionSuccessRateWarn,
    });
  }

  return alerts;
}

export function formatAssistantReviewReport(report: AssistantReviewReport): string {
  const lines: string[] = [];
  lines.push("# Assistant Weekly Review");
  lines.push(`Kỳ: ${report.window.fromIso} -> ${report.window.toIso}`);
  lines.push("");
  lines.push("## Tổng quan");
  lines.push(`- Tin nhắn gửi/nhận: ${report.messagesSent}/${report.messagesReceived}`);
  lines.push(
    `- Action proposed/executed/verified/failed: ${report.actionsProposed}/${report.actionsExecuted}/${report.actionsVerified}/${report.actionsFailed}`,
  );
  lines.push(`- Action acceptance: ${(report.actionAcceptanceRate * 100).toFixed(1)}%`);
  lines.push(`- Action success: ${(report.actionSuccessRate * 100).toFixed(1)}%`);
  lines.push(
    `- Feedback helpful/not-helpful: ${report.feedbackHelpful}/${report.feedbackNotHelpful} (helpful ${(report.helpfulRatio * 100).toFixed(1)}%)`,
  );
  lines.push("");
  lines.push("## Feedback theo lý do");
  for (const reason of FEEDBACK_REASONS) {
    lines.push(`- ${reason}: ${report.feedbackByReason[reason]}`);
  }
  lines.push("");
  lines.push("## Route lỗi nhiều nhất");
  if (report.topFailureRoutes.length === 0) {
    lines.push("- Không có route lỗi nổi bật.");
  } else {
    for (const route of report.topFailureRoutes) {
      lines.push(
        `- ${route.route}: not-helpful ${route.notHelpfulCount}, action-failed ${route.actionFailedCount}, wrong-context ${route.wrongContextCount} (failure ${(route.failureRate * 100).toFixed(1)}%)`,
      );
    }
  }
  lines.push("");
  lines.push("## Top failure cases");
  if (report.topFailureCases.length === 0) {
    lines.push("- Không có case thumbs-down trong kỳ.");
  } else {
    for (const failure of report.topFailureCases) {
      const reason = failure.reason ? ` [${failure.reason}]` : "";
      lines.push(`- (${failure.route})${reason} "${failure.userMessage}"`);
    }
  }
  lines.push("");
  lines.push("## Cảnh báo");
  if (report.alerts.length === 0) {
    lines.push("- Không có cảnh báo nào vượt ngưỡng.");
  } else {
    for (const alert of report.alerts) {
      lines.push(`- [${alert.level.toUpperCase()}] ${alert.message}`);
    }
  }

  return lines.join("\n");
}
