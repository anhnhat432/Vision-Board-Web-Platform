import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthContext } from "@/lib/auth/AuthContext";
import { useAssistantPageContextValue } from "./AssistantPageContextProvider";
import { sendAssistantMessageStream } from "./assistantApi";
import {
  type AssistantClarificationCandidate,
  buildClarificationQuestion,
  clearPendingAssistantClarification,
  createTaskSelectionClarification,
  type PendingAssistantClarificationIntent,
  readStoredPendingAssistantClarification,
  resolveClarificationReply,
  setPendingAssistantClarification,
} from "./assistantConversationState";
import { captureAssistantFeedback } from "./assistantFeedback";
import { autoCaptureUserMemory, clearMemory, updateAssistantMemoryFromFeedback } from "./assistantMemory";
import { recordAssistantEvent } from "./assistantObservability";
import {
  type AssistantWorkflow,
  type AssistantWorkflowType,
  clearPendingWorkflow,
  createWorkflow,
  getPendingWorkflow,
  isCancelReply,
  isConfirmReply,
  setPendingWorkflow,
} from "./assistantWorkflow";
import { type AssistantContext, buildAssistantContext } from "./buildAssistantContext";
import { type ActionExecutionResult, executeAction } from "./executeAction";
import { type AssistantAction, parseAssistantReply } from "./parseActions";
import type { ChatHistoryMessage, FeedbackEntry, FeedbackRating, FeedbackReason, Message } from "./types";

const SUGGESTIONS = [
  "Hôm nay tôi nên làm gì?",
  "Tóm tắt tuần này",
  "Mục tiêu chính của tôi là gì?",
  "Gợi ý reflection",
];

const MAX_PERSISTED = 30;
const MAX_FEEDBACK = 100;
const SAFE_AUTO_EXECUTE_TYPES = new Set<AssistantAction["type"]>(["mark_task_done", "update_task_status"]);

interface PersistedHistory {
  userId: string | null;
  savedAt: number;
  messages: Message[];
}

interface AssistantTurnSnapshot {
  userMessage: string;
  context: AssistantContext & { route: string };
}

export interface AssistantError {
  message: string;
  errorCode?: string;
}

export interface UseAssistantOptions {
  route?: string;
}

function getStorageKey(userId: string | null): string {
  return `assistant.chat.history:${userId ?? "anon"}`;
}

function getOnboardKey(userId: string | null): string {
  return `assistant.onboarded:${userId ?? "anon"}`;
}

function getFeedbackStorageKey(userId: string | null): string {
  return `assistant.feedback:${userId ?? "anon"}`;
}

function getFeedbackMapStorageKey(userId: string | null): string {
  return `assistant.feedback.map:${userId ?? "anon"}`;
}

function getErrorMessage(error: unknown): string {
  const code = getErrorCode(error);
  if (code === "ASSISTANT_OFFLINE") {
    return "Bạn đang ngoại tuyến. Vui lòng kết nối mạng để tiếp tục sử dụng Trợ lý AI.";
  }
  if (code === "ASSISTANT_AUTH_ERROR") {
    return "Bạn cần đăng nhập tài khoản để sử dụng Trợ lý AI ở chế độ chính thức.";
  }
  if (code === "AI_PROVIDER_NOT_CONFIGURED" || code === "ASSISTANT_PROVIDER_NOT_CONFIGURED") {
    return "Dịch vụ AI chưa được cấu hình trên hệ thống. Vui lòng liên hệ quản trị viên.";
  }
  if (code === "AI_INTERNAL_ERROR" || code === "ASSISTANT_INTERNAL_ERROR") {
    return "Dịch vụ AI hiện không phản hồi. Vui lòng thử lại sau.";
  }
  if (code === "ASSISTANT_BACKEND_UNAVAILABLE" || code === "ASSISTANT_CONNECTION_ERROR") {
    return "Không thể kết nối với máy chủ backend. Vui lòng thử lại sau ít phút.";
  }
  if (code === "ASSISTANT_PROVIDER_RATE_LIMIT") {
    return "Trợ lý AI đang quá tải. Vui lòng đợi vài giây rồi thử lại.";
  }
  if (code === "ASSISTANT_PROVIDER_AUTH_ERROR") {
    return "Dịch vụ AI chưa xác thực được. Vui lòng liên hệ quản trị viên.";
  }
  if (code === "ASSISTANT_PROVIDER_SERVER_ERROR") {
    return "Dịch vụ AI đang gặp sự cố tạm thời. Vui lòng thử lại sau ít phút.";
  }
  if (code === "ASSISTANT_PROVIDER_PAYLOAD_TOO_LARGE") {
    return "Nội dung gửi tới trợ lý quá dài. Vui lòng rút gọn tin nhắn.";
  }
  if (code === "ASSISTANT_PROVIDER_TIMEOUT") {
    return "Trợ lý AI phản hồi quá lâu. Vui lòng thử lại.";
  }

  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }

  return "Xin lỗi, có lỗi xảy ra khi kết nối với trợ lý. Thử lại nhé.";
}


function getErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object" || !("errorCode" in error)) return undefined;
  const errorCode = (error as { errorCode?: unknown }).errorCode;
  return typeof errorCode === "string" ? errorCode : undefined;
}

function createMessage(role: Message["role"], content: string, isWelcome?: boolean): Message {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: Date.now(),
    isWelcome,
  };
}

function buildAutoExecutionSummary(action: AssistantAction, result: ActionExecutionResult): string {
  if (result.success && result.alreadyDone) {
    return result.message;
  }
  if (result.success) {
    return result.message;
  }
  return `Mình chưa thực hiện được "${action.label}": ${result.message}`;
}

async function executeSafeAutoActions(
  actions: AssistantAction[],
  userId: string | null = null,
): Promise<{ actions: AssistantAction[]; summary: string | null }> {
  const autoActions = actions.filter((action) => action.autoExecute && SAFE_AUTO_EXECUTE_TYPES.has(action.type));

  if (autoActions.length === 0) {
    return { actions, summary: null };
  }

  if (autoActions.length > 1) {
    return {
      actions: actions.map((action) => ({ ...action, autoExecute: false })),
      summary: "Mình chưa tự chạy vì có nhiều hành động cùng lúc. Bạn hãy chọn đúng hành động bằng nút Đồng ý.",
    };
  }

  const [action] = autoActions;

  recordAssistantEvent({
    type: "assistant_action_executed",
    userId,
    actionType: action.type,
    metadata: { label: action.label, payload: action.payload, autoExecute: true },
  });

  const result = await executeAction(action, userId);

  if (result.success) {
    recordAssistantEvent({
      type: "assistant_action_verified",
      userId,
      actionType: action.type,
      success: true,
      metadata: { label: action.label, message: result.message, alreadyDone: result.alreadyDone },
    });
  } else {
    recordAssistantEvent({
      type: "assistant_action_failed",
      userId,
      actionType: action.type,
      success: false,
      errorCode: "ACTION_EXECUTION_FAILED",
      metadata: { label: action.label, message: result.message },
    });
  }

  return {
    actions: actions.filter((item) => item.id !== action.id).map((item) => ({ ...item, autoExecute: false })),
    summary: buildAutoExecutionSummary(action, result),
  };
}

type AssistantTaskCandidate = AssistantClarificationCandidate & {
  done: boolean;
  scheduledDate?: string;
};

function normalizeCommandText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0111/g, "d")
    .replace(/\u0110/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectActiveTopic(text: string, goals: Array<{ title: string }>): string | null {
  if (!text || !goals || goals.length === 0) return null;
  const normalizedText = text.toLowerCase();
  for (const goal of goals) {
    const title = goal.title?.trim();
    if (title && title.length > 3 && normalizedText.includes(title.toLowerCase())) {
      return title;
    }
  }
  return null;
}

function getTaskCommandIntent(text: string): PendingAssistantClarificationIntent | null {
  const normalized = normalizeCommandText(text);
  const mentionsTask = /\b(task|viec|nhiem vu|cong viec)\b/.test(normalized);
  if (!mentionsTask) return null;

  if (/\b(bo tick|bo danh dau|chua xong|chua hoan thanh|undo|uncheck)\b/.test(normalized)) {
    return "update_task_status";
  }

  if (/\b(tick|hoan thanh|xong|danh dau|mark|done|complete|completed)\b/.test(normalized)) {
    return "mark_task_done";
  }

  return null;
}

function hasBulkTaskCommand(text: string): boolean {
  return /\b(tick het|xong het|hoan thanh het|tat ca|all)\b/.test(normalizeCommandText(text));
}

function shouldUseTodayOnly(text: string): boolean {
  return /\b(hom nay|today)\b/.test(normalizeCommandText(text));
}

function toTaskCandidate(task: {
  id: string;
  title: string;
  done?: boolean;
  scheduledDate?: string;
}): AssistantTaskCandidate {
  return {
    id: task.id,
    label: task.title,
    done: task.done === true,
    scheduledDate: task.scheduledDate,
  };
}

function uniqueTaskCandidates(candidates: AssistantTaskCandidate[]): AssistantTaskCandidate[] {
  const seen = new Set<string>();
  const unique: AssistantTaskCandidate[] = [];
  for (const candidate of candidates) {
    if (!candidate.id || !candidate.label || seen.has(candidate.id)) continue;
    seen.add(candidate.id);
    unique.push(candidate);
  }
  return unique;
}

function getClarificationCandidates(
  text: string,
  context: AssistantContext,
  intent: PendingAssistantClarificationIntent,
): AssistantTaskCandidate[] {
  const todayTasks = (context.todayTasks || []).map(toTaskCandidate);
  const overdueTasks = shouldUseTodayOnly(text)
    ? []
    : (context.stuckSignals?.overdueTasks || []).map((task) =>
        toTaskCandidate({
          id: task.id,
          title: task.title,
          done: false,
          scheduledDate: task.scheduledDate,
        }),
      );

  const all = uniqueTaskCandidates([...todayTasks, ...overdueTasks]);
  if (intent === "mark_task_done") return all.filter((task) => !task.done);
  return all.filter((task) => task.done);
}

function getAllTaskCandidates(text: string, context: AssistantContext): AssistantTaskCandidate[] {
  const todayTasks = (context.todayTasks || []).map(toTaskCandidate);
  const overdueTasks = shouldUseTodayOnly(text)
    ? []
    : (context.stuckSignals?.overdueTasks || []).map((task) =>
        toTaskCandidate({
          id: task.id,
          title: task.title,
          done: false,
          scheduledDate: task.scheduledDate,
        }),
      );
  return uniqueTaskCandidates([...todayTasks, ...overdueTasks]);
}

function buildTaskAction(
  intent: PendingAssistantClarificationIntent,
  candidate: AssistantClarificationCandidate,
): AssistantAction {
  if (intent === "mark_task_done") {
    return {
      id: crypto.randomUUID(),
      type: "mark_task_done",
      label: `Hoàn thành: ${candidate.label}`,
      payload: {
        taskId: candidate.id,
        done: true,
      },
      autoExecute: true,
    };
  }

  return {
    id: crypto.randomUUID(),
    type: "update_task_status",
    label: `Bỏ hoàn thành: ${candidate.label}`,
    payload: {
      taskId: candidate.id,
      completed: false,
    },
    autoExecute: true,
  };
}

async function executeTaskClarificationAction(
  intent: PendingAssistantClarificationIntent,
  candidate: AssistantClarificationCandidate,
  userId: string | null = null,
): Promise<string> {
  const action = buildTaskAction(intent, candidate);
  const result = await executeAction(action, userId);
  return buildAutoExecutionSummary(action, result);
}

function detectWorkflowTypeFromText(text: string): AssistantWorkflowType | null {
  const normalized = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0111/g, "d")
    .replace(/\u0110/g, "D")
    .toLowerCase()
    .trim();

  if (/\b(tao muc tieu|tao goal|them muc tieu|them goal|muc tieu moi|goal moi)\b/.test(normalized)) {
    return "create_goal_workflow";
  }
  if (/\b(lap ke hoach 12 tuan|chia 12 tuan|ke hoach 12 tuan|12 week plan)\b/.test(normalized)) {
    return "create_12_week_plan_workflow";
  }
  if (/\b(them task|tao task|them viec|tao viec|giao viec|them nhiem vu|tao nhiem vu)\b/.test(normalized)) {
    return "create_task_workflow";
  }
  if (/\b(weekly review|review tuan|danh gia tuan|nhin lai tuan)\b/.test(normalized)) {
    return "weekly_review_workflow";
  }
  if (/\b(reflection|suy ngam|nhat ky|insight)\b/.test(normalized)) {
    return "reflection_workflow";
  }
  return null;
}

export function isWorkflowExpired(workflow: AssistantWorkflow, referenceDate = new Date()): boolean {
  if (!workflow.expiresAt) return true;
  return Date.parse(workflow.expiresAt) <= referenceDate.getTime();
}

async function resolvePendingWorkflowTurn(
  userId: string | null,
  text: string,
  _context: AssistantContext,
  updatePendingWorkflow: (wf: AssistantWorkflow | null) => void,
): Promise<{ content: string; actions: AssistantAction[] } | null> {
  const workflow = getPendingWorkflow(userId);
  if (!workflow) return null;

  if (isWorkflowExpired(workflow)) {
    updatePendingWorkflow(null);
    return {
      content: "Kế hoạch đang xử lý trước đó đã hết hạn (quá 30 phút). Bạn vui lòng yêu cầu lại nhé.",
      actions: [],
    };
  }

  if (isCancelReply(text)) {
    updatePendingWorkflow(null);
    recordAssistantEvent({
      type: "assistant_workflow_failed",
      userId,
      workflowType: workflow.type,
      success: false,
      errorCode: "WORKFLOW_CANCELLED",
      metadata: { reason: "User cancelled pending workflow" },
    });
    return {
      content: "Đã hủy bỏ kế hoạch/hành động đang chuẩn bị.",
      actions: [],
    };
  }

  if (isConfirmReply(text)) {
    recordAssistantEvent({
      type: "assistant_workflow_confirmed",
      userId,
      workflowType: workflow.type,
      metadata: { actionsCount: workflow.proposedActions.length },
    });

    const executingWf: AssistantWorkflow = {
      ...workflow,
      status: "executing",
      updatedAt: new Date().toISOString(),
    };
    updatePendingWorkflow(executingWf);

    const results: typeof workflow.executionResults = [];
    let hasFailed = false;
    let failedActionLabel = "";
    let failureMsg = "";

    for (const action of workflow.proposedActions) {
      try {
        recordAssistantEvent({
          type: "assistant_action_executed",
          userId,
          actionType: action.type,
          metadata: { label: action.label, payload: action.payload, workflowType: workflow.type },
        });

        const res = await executeAction(action, userId);
        const status = res.success ? (res.alreadyDone ? "alreadyDone" : "success") : "failed";

        results.push({
          actionId: action.id,
          status,
          message: res.message,
        });

        if (res.success) {
          recordAssistantEvent({
            type: "assistant_action_verified",
            userId,
            actionType: action.type,
            success: true,
            metadata: {
              label: action.label,
              message: res.message,
              alreadyDone: res.alreadyDone,
              workflowType: workflow.type,
            },
          });
        } else {
          recordAssistantEvent({
            type: "assistant_action_failed",
            userId,
            actionType: action.type,
            success: false,
            errorCode: "WORKFLOW_ACTION_FAILED",
            metadata: { label: action.label, message: res.message, workflowType: workflow.type },
          });
          hasFailed = true;
          failedActionLabel = action.label;
          failureMsg = res.message;
          break;
        }
      } catch (err) {
        hasFailed = true;
        failedActionLabel = action.label;
        failureMsg = err instanceof Error ? err.message : String(err);

        recordAssistantEvent({
          type: "assistant_action_failed",
          userId,
          actionType: action.type,
          success: false,
          errorCode: "WORKFLOW_ACTION_EXCEPTION",
          metadata: { label: action.label, message: failureMsg, workflowType: workflow.type },
        });

        results.push({
          actionId: action.id,
          status: "failed",
          message: failureMsg,
        });
        break;
      }
    }

    if (hasFailed) {
      const failedWf: AssistantWorkflow = {
        ...executingWf,
        status: "failed",
        executionResults: results,
        updatedAt: new Date().toISOString(),
      };
      updatePendingWorkflow(failedWf);

      recordAssistantEvent({
        type: "assistant_workflow_failed",
        userId,
        workflowType: workflow.type,
        success: false,
        errorCode: "WORKFLOW_EXECUTION_FAILED",
        metadata: { failedActionLabel, failureMsg },
      });

      return {
        content: `Thực hiện thất bại ở bước "${failedActionLabel}": ${failureMsg}`,
        actions: [],
      };
    } else {
      const completedWf: AssistantWorkflow = {
        ...executingWf,
        status: "completed",
        executionResults: results,
        updatedAt: new Date().toISOString(),
      };
      updatePendingWorkflow(completedWf);
      updatePendingWorkflow(null); // Clear pending workflow on success

      recordAssistantEvent({
        type: "assistant_workflow_completed",
        userId,
        workflowType: workflow.type,
        success: true,
        metadata: { actionsCount: workflow.proposedActions.length },
      });

      const successLabels = workflow.proposedActions
        .map((a) => {
          const res = results.find((r) => r.actionId === a.id);
          const prefix = res?.status === "alreadyDone" ? "[Đã làm trước đó] " : "";
          return `- ${prefix}${a.label}`;
        })
        .join("\n");

      return {
        content: `Đã thực hiện thành công các hành động sau:\n${successLabels}`,
        actions: [],
      };
    }
  }

  return null;
}

async function resolvePendingClarificationTurn(userId: string | null, text: string): Promise<string | null> {
  const pending = readStoredPendingAssistantClarification(userId);
  if (!pending) return null;

  const resolution = resolveClarificationReply(text, pending);
  if (resolution.status === "expired") {
    clearPendingAssistantClarification(userId);
    return "Yêu cầu chọn task trước đó đã hết hạn. Bạn nói lại task cần thao tác nhé.";
  }

  if (resolution.status === "cancelled") {
    clearPendingAssistantClarification(userId);
    return "Đã hủy lựa chọn task trước đó.";
  }

  if (resolution.status === "unresolved") {
    return resolution.question;
  }

  recordAssistantEvent({
    type: "assistant_clarification_resolved",
    userId,
    metadata: {
      intent: pending.intent,
      selectedId: resolution.candidate.id,
      selectedLabel: resolution.candidate.label,
    },
  });

  const summary = await executeTaskClarificationAction(resolution.pending.intent, resolution.candidate, userId);
  clearPendingAssistantClarification(userId);
  return summary;
}

async function resolveDirectTaskCommandTurn(
  userId: string | null,
  text: string,
  context: AssistantContext,
): Promise<string | null> {
  const intent = getTaskCommandIntent(text);
  if (!intent) return null;

  const candidates = getClarificationCandidates(text, context, intent);
  const allCandidates = getAllTaskCandidates(text, context);
  const temporaryPending = createTaskSelectionClarification({
    intent,
    candidates: allCandidates,
    question: buildClarificationQuestion(intent, allCandidates),
  });
  const directResolution = resolveClarificationReply(text, temporaryPending);

  if (directResolution.status === "selected") {
    const matchedCandidate = allCandidates.find((candidate) => candidate.id === directResolution.candidate.id);
    if (intent === "mark_task_done" && matchedCandidate?.done) {
      return `Task "${matchedCandidate.label}" đã hoàn thành từ trước rồi.`;
    }
    if (intent === "update_task_status" && matchedCandidate && !matchedCandidate.done) {
      return `Task "${matchedCandidate.label}" hiện chưa được đánh dấu hoàn thành, nên mình không cần bỏ tick.`;
    }
    return executeTaskClarificationAction(intent, directResolution.candidate, userId);
  }

  if (candidates.length === 0) {
    return intent === "mark_task_done"
      ? "Mình chưa thấy task chưa hoàn thành nào phù hợp để tick."
      : "Mình chưa thấy task nào đang hoàn thành để bỏ tick.";
  }

  if (candidates.length === 1 && !hasBulkTaskCommand(text)) {
    return executeTaskClarificationAction(intent, candidates[0], userId);
  }

  const questionPrefix =
    hasBulkTaskCommand(text) && intent === "mark_task_done" ? "Mình chưa tick hàng loạt để tránh đánh dấu nhầm.\n" : "";
  const question = `${questionPrefix}${buildClarificationQuestion(intent, candidates)}`;
  const pending = createTaskSelectionClarification({
    intent,
    candidates,
    question,
  });
  setPendingAssistantClarification(userId, pending);

  recordAssistantEvent({
    type: "assistant_clarification_created",
    userId,
    metadata: { intent, candidatesCount: candidates.length },
  });

  return `${pending.question}\n\nBạn có thể trả lời bằng số thứ tự, ví dụ "cái thứ 2", hoặc gõ tên task.`;
}

function normalizePersistedMessage(value: unknown): Message | null {
  if (!value || typeof value !== "object") return null;

  const message = value as Partial<Message>;
  if (typeof message.id !== "string" || !message.id.trim()) return null;
  if (message.role !== "user" && message.role !== "assistant") return null;
  if (typeof message.content !== "string" || !message.content.trim()) return null;
  if (typeof message.createdAt !== "number" || !Number.isFinite(message.createdAt)) return null;

  const status = message.status === "streaming" || message.status === "complete" ? "complete" : undefined;
  const feedback = message.feedback === "helpful" || message.feedback === "not_helpful" ? message.feedback : undefined;

  return {
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt,
    status,
    feedback,
  };
}

function loadPersistedMessages(userId: string | null): Message[] {
  if (typeof localStorage === "undefined") return [];

  const key = getStorageKey(userId);

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as Partial<PersistedHistory>;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return [];

    if (parsed.userId !== userId) {
      localStorage.removeItem(key);
      return [];
    }

    if (typeof parsed.savedAt !== "number" || !Number.isFinite(parsed.savedAt)) return [];
    if (!Array.isArray(parsed.messages)) return [];

    return parsed.messages
      .map(normalizePersistedMessage)
      .filter((message): message is Message => message !== null)
      .slice(-MAX_PERSISTED);
  } catch {
    return [];
  }
}

function savePersistedMessages(messages: Message[], userId: string | null): void {
  if (typeof localStorage === "undefined") return;

  try {
    const persisted = messages
      .filter((message) => message.content.trim() && message.status !== "streaming" && !message.isWelcome)
      .slice(-MAX_PERSISTED);
    const key = getStorageKey(userId);
    if (persisted.length === 0) {
      localStorage.removeItem(key);
      return;
    }

    const payload: PersistedHistory = {
      userId,
      savedAt: Date.now(),
      messages: persisted,
    };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {}
}

export function useAssistant(options?: UseAssistantOptions) {
  const route = options?.route ?? (typeof window !== "undefined" ? window.location.pathname : "/");
  const { user } = useAuthContext();
  const userId = user?.uid ?? null;
  const pageContextHintValue = useAssistantPageContextValue() || undefined;
  const [messages, setMessages] = useState<Message[]>(() => loadPersistedMessages(userId));
  const [isTyping, setIsTyping] = useState(false);
  const [lastError, setLastError] = useState<AssistantError | null>(null);
  const [lastUserText, setLastUserText] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const turnSnapshotsRef = useRef<Record<string, AssistantTurnSnapshot>>({});

  const [messageFeedback, setMessageFeedback] = useState<Record<string, FeedbackRating>>(() => {
    try {
      const raw = typeof localStorage !== "undefined" ? localStorage.getItem(getFeedbackMapStorageKey(userId)) : null;
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const [onboarded, setOnboarded] = useState<boolean>(() => {
    try {
      return typeof localStorage !== "undefined" ? localStorage.getItem(getOnboardKey(userId)) === "1" : false;
    } catch {
      return false;
    }
  });

  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [pendingWorkflow, setPendingWorkflowState] = useState<AssistantWorkflow | null>(() =>
    getPendingWorkflow(userId, new Date(), true),
  );

  const updatePendingWorkflow = useCallback(
    (wf: AssistantWorkflow | null) => {
      if (wf) {
        setPendingWorkflow(userId, wf);
      } else {
        clearPendingWorkflow(userId);
      }
      setPendingWorkflowState(wf);
    },
    [userId],
  );

  useEffect(() => {
    setMessages(loadPersistedMessages(userId));
    setLastError(null);
    setLastUserText(null);
    setPendingWorkflowState(getPendingWorkflow(userId, new Date(), true));
    setMessageFeedback(() => {
      try {
        const raw = typeof localStorage !== "undefined" ? localStorage.getItem(getFeedbackMapStorageKey(userId)) : null;
        return raw ? JSON.parse(raw) : {};
      } catch {
        return {};
      }
    });
    try {
      setOnboarded(localStorage.getItem(getOnboardKey(userId)) === "1");
    } catch {
      setOnboarded(false);
    }
  }, [userId]);

  useEffect(() => {
    if (onboarded || messages.length > 0) return;

    const welcomeMessage: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: `Chào bạn 👋 Mình là **Cú**, trợ lý 12-week của bạn trong Vision Board.

Mình có thể giúp bạn:
- Xem việc cần làm hôm nay
- Tóm tắt tiến độ tuần này
- Gợi ý reflection cuối tuần
- Giải thích các khái niệm như SMART, OKR, 12-week

Bạn cứ thoải mái hỏi mình bất cứ gì về kế hoạch của bạn.`,
      createdAt: Date.now(),
      status: "complete",
      isWelcome: true,
    };

    setMessages([welcomeMessage]);
    setOnboarded(true);
    try {
      localStorage.setItem(getOnboardKey(userId), "1");
    } catch {}
  }, [onboarded, messages.length, userId]);

  useEffect(() => {
    if (isTyping) return undefined;

    const id = window.setTimeout(() => savePersistedMessages(messages, userId), 300);
    return () => window.clearTimeout(id);
  }, [messages, isTyping, userId]);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isTyping) return;

      const turnStartedAt = Date.now();

      // Tự động capture memory từ chat input
      autoCaptureUserMemory(trimmed, userId);

      const userMessage = createMessage("user", trimmed);
      recordAssistantEvent({
        type: "assistant_message_sent",
        userId,
        route,
        messageId: userMessage.id,
        metadata: { length: trimmed.length },
      });

      setMessages((prev) => [...prev, userMessage]);
      setLastUserText(trimmed);
      setIsTyping(true);
      setLastError(null);

      const messageId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        {
          id: messageId,
          role: "assistant",
          content: "",
          createdAt: Date.now(),
          status: "streaming",
        },
      ]);

      abortControllerRef.current = new AbortController();

      try {
        const contextObj = buildAssistantContext(undefined, route, pageContextHintValue, trimmed, userId, activeTopic);
        const newTopic = detectActiveTopic(trimmed, contextObj.goals || []);
        if (newTopic) {
          setActiveTopic(newTopic);
          contextObj.activeTopic = newTopic;
        }

        const context: AssistantContext & { route: string } = {
          ...contextObj,
          route,
        };
        turnSnapshotsRef.current[messageId] = {
          userMessage: trimmed,
          context,
        };

        const pendingWfTurn = await resolvePendingWorkflowTurn(userId, trimmed, context, updatePendingWorkflow);
        if (pendingWfTurn) {
          recordAssistantEvent({
            type: "assistant_workflow_completed",
            userId,
            route,
            messageId,
            success: true,
            latencyMs: Date.now() - turnStartedAt,
            metadata: { localResolution: true },
          });
          setMessages((prev) =>
            prev.map((message) =>
              message.id === messageId
                ? { ...message, content: pendingWfTurn.content, actions: pendingWfTurn.actions, status: "complete" }
                : message,
            ),
          );
          recordAssistantEvent({
            type: "assistant_message_received",
            userId,
            route,
            messageId,
            success: true,
            latencyMs: Date.now() - turnStartedAt,
            metadata: { length: pendingWfTurn.content.length, source: "pending_workflow" },
          });
          return;
        }

        const pendingTurn = await resolvePendingClarificationTurn(userId, trimmed);
        if (pendingTurn) {
          setMessages((prev) =>
            prev.map((message) =>
              message.id === messageId
                ? { ...message, content: pendingTurn, actions: [], status: "complete" }
                : message,
            ),
          );
          recordAssistantEvent({
            type: "assistant_message_received",
            userId,
            route,
            messageId,
            success: true,
            latencyMs: Date.now() - turnStartedAt,
            metadata: { length: pendingTurn.length, source: "pending_clarification" },
          });
          return;
        }

        const directTaskTurn = await resolveDirectTaskCommandTurn(userId, trimmed, context);
        if (directTaskTurn) {
          setMessages((prev) =>
            prev.map((message) =>
              message.id === messageId
                ? { ...message, content: directTaskTurn, actions: [], status: "complete" }
                : message,
            ),
          );
          recordAssistantEvent({
            type: "assistant_message_received",
            userId,
            route,
            messageId,
            success: true,
            latencyMs: Date.now() - turnStartedAt,
            metadata: { length: directTaskTurn.length, source: "direct_task_command" },
          });
          return;
        }

        const history: ChatHistoryMessage[] = messages.slice(-6).map((m) => ({ role: m.role, content: m.content }));

        let finalContent = "";
        await sendAssistantMessageStream(
          { message: trimmed, context, history },
          (delta) => {
            finalContent += delta;
            setMessages((prev) =>
              prev.map((message) =>
                message.id === messageId ? { ...message, content: message.content + delta } : message,
              ),
            );
          },
          abortControllerRef.current.signal,
        );

        recordAssistantEvent({
          type: "assistant_message_received",
          userId,
          route,
          messageId,
          success: true,
          latencyMs: Date.now() - turnStartedAt,
          metadata: { length: finalContent.length },
        });

        const parsed = parseAssistantReply(finalContent);

        if (parsed.actions && parsed.actions.length > 0) {
          for (const action of parsed.actions) {
            recordAssistantEvent({
              type: "assistant_action_proposed",
              userId,
              actionType: action.type,
              metadata: { label: action.label, payload: action.payload },
            });
          }
        }

        const isGoalWorkflow = parsed.actions.some((a) => a.type === "create_goal");
        const isPlanWorkflow = parsed.actions.some((a) => a.type === "create_twelve_week_plan_draft");
        const isMultiTaskWorkflow = parsed.actions.filter((a) => a.type === "create_task").length >= 2;
        const isWeeklyReviewWorkflow = parsed.actions.some((a) => a.type === "add_weekly_review");

        let workflowType = detectWorkflowTypeFromText(trimmed);

        const existingWf = getPendingWorkflow(userId);
        if (!workflowType && existingWf) {
          workflowType = existingWf.type;
        }

        if (!workflowType) {
          if (isGoalWorkflow) workflowType = "create_goal_workflow";
          else if (isPlanWorkflow) workflowType = "create_12_week_plan_workflow";
          else if (isMultiTaskWorkflow) workflowType = "create_task_workflow";
          else if (isWeeklyReviewWorkflow) workflowType = "weekly_review_workflow";
        }

        if (workflowType) {
          const actionsWithNoAuto = parsed.actions.map((act) => ({
            ...act,
            autoExecute: false,
          }));

          const missingFields: string[] = [];
          if (workflowType === "create_goal_workflow") {
            const goalAction = parsed.actions.find((a) => a.type === "create_goal");
            if (goalAction) {
              const payload = goalAction.payload as { title?: string; category?: string; deadline?: string };
              if (!payload.title) missingFields.push("title");
              if (!payload.category || payload.category === "other") missingFields.push("category");
            } else {
              missingFields.push("title");
              missingFields.push("category");
            }
          } else if (workflowType === "create_task_workflow") {
            if (parsed.actions.length === 0) {
              missingFields.push("goal");
            }
          }

          const newWorkflow = createWorkflow({
            type: workflowType,
            userId,
            summary: parsed.textContent.slice(0, 500),
            sourceUserText: trimmed,
            missingFields,
            proposedActions: actionsWithNoAuto,
          });

          updatePendingWorkflow(newWorkflow);

          recordAssistantEvent({
            type: "assistant_workflow_created",
            userId,
            workflowType,
            metadata: { actionsCount: actionsWithNoAuto.length, missingFields },
          });

          setMessages((prev) =>
            prev.map((message) =>
              message.id === messageId
                ? { ...message, content: parsed.textContent, actions: actionsWithNoAuto, status: "complete" }
                : message,
            ),
          );
        } else {
          const autoExecution = await executeSafeAutoActions(parsed.actions, userId);
          const finalText = autoExecution.summary
            ? `${parsed.textContent}\n\n${autoExecution.summary}`.trim()
            : parsed.textContent;
          setMessages((prev) =>
            prev.map((message) =>
              message.id === messageId
                ? { ...message, content: finalText, actions: autoExecution.actions, status: "complete" }
                : message,
            ),
          );
        }
      } catch (error) {
        const latencyMs = Date.now() - turnStartedAt;
        const errCode = getErrorCode(error);
        if (
          error &&
          typeof error === "object" &&
          "errorCode" in error &&
          (error as { errorCode?: string }).errorCode === "ABORT_ERROR"
        ) {
          // User aborted, don't show error
          recordAssistantEvent({
            type: "assistant_message_received",
            userId,
            route,
            messageId,
            success: false,
            latencyMs,
            errorCode: "ABORT_ERROR",
            metadata: { reason: "User aborted generation" },
          });
          setMessages((prev) =>
            prev.map((message) => (message.id === messageId ? { ...message, status: "complete" } : message)),
          );
        } else {
          const message = getErrorMessage(error);
          recordAssistantEvent({
            type: "assistant_message_received",
            userId,
            route,
            messageId,
            success: false,
            latencyMs,
            errorCode: errCode ?? "UNKNOWN_STREAM_ERROR",
            metadata: { errorMessage: message },
          });
          setLastError({
            message,
            errorCode: errCode,
          });
          setMessages((prev) => prev.filter((m) => m.id !== messageId));
        }
      } finally {
        setIsTyping(false);
        abortControllerRef.current = null;
      }
    },
    [isTyping, messages, route, pageContextHintValue, userId, activeTopic, updatePendingWorkflow],
  );

  const retry = useCallback(() => {
    if (!lastUserText || isTyping) return;
    void send(lastUserText);
  }, [isTyping, lastUserText, send]);

  const clearHistory = useCallback(() => {
    setMessages([]);
    setLastError(null);
    setLastUserText(null);
    turnSnapshotsRef.current = {};
    try {
      clearMemory(userId);
      localStorage.removeItem(getStorageKey(userId));
      localStorage.removeItem(getOnboardKey(userId));
      setOnboarded(false);
    } catch {}
  }, [userId]);

  const submitFeedback = useCallback(
    (
      messageId: string,
      rating: FeedbackRating,
      options?: {
        reason?: FeedbackReason;
        correction?: string;
        expectedActionType?: string;
        expectedTaskTitle?: string;
        actionExecution?: {
          actionType: string;
          success: boolean;
          message: string;
        };
      },
    ) => {
      try {
        setMessages((prev) => {
          const targetIndex = prev.findIndex((message) => message.id === messageId);
          const target = prev[targetIndex];
          if (!target || target.role !== "assistant" || !target.content.trim()) return prev;

          const snapshot = turnSnapshotsRef.current[messageId];
          const previousUserMessage =
            [...prev.slice(0, targetIndex)].reverse().find((message) => message.role === "user")?.content ?? "";

          // Capture feedback via existing helper (keeps compatibility)
          const context = snapshot?.context ?? {
            ...buildAssistantContext(undefined, route, pageContextHintValue, undefined, userId),
            route,
          };

          recordAssistantEvent({
            type: "assistant_feedback_submitted",
            userId,
            route,
            messageId,
            metadata: {
              rating,
              reason: options?.reason,
              correction: options?.correction,
              expectedActionType: options?.expectedActionType,
              expectedTaskTitle: options?.expectedTaskTitle,
              actionExecution: options?.actionExecution,
            },
          });

          captureAssistantFeedback({
            userId,
            route,
            rating: rating === "up" ? "helpful" : "not_helpful",
            userMessage: snapshot?.userMessage ?? previousUserMessage,
            assistantMessage: target.content,
            context,
            reason: options?.reason,
            correction: options?.correction,
            expectedActionType: options?.expectedActionType,
            expectedTaskTitle: options?.expectedTaskTitle,
            actionExecution: options?.actionExecution,
          });

          updateAssistantMemoryFromFeedback(
            rating === "up" ? "helpful" : "not_helpful",
            snapshot?.userMessage ?? previousUserMessage,
            target.content,
            options,
            userId,
          );

          // Save to new feedback storage with user-scoped key
          const entry: FeedbackEntry = {
            messageId,
            userText: snapshot?.userMessage ?? previousUserMessage,
            replyText: target.content,
            rating,
            timestamp: Date.now(),
            route,
            reason: options?.reason,
            correction: options?.correction,
            expectedActionType: options?.expectedActionType,
            expectedTaskTitle: options?.expectedTaskTitle,
            actionExecution: options?.actionExecution,
          };

          if (typeof localStorage !== "undefined") {
            const raw = localStorage.getItem(getFeedbackStorageKey(userId));
            const entries: FeedbackEntry[] = raw ? JSON.parse(raw) : [];
            const nextEntries = [...entries, entry].slice(-MAX_FEEDBACK);
            localStorage.setItem(getFeedbackStorageKey(userId), JSON.stringify(nextEntries));

            // Update map for quick lookup
            const mapKey = getFeedbackMapStorageKey(userId);
            const rawMap = localStorage.getItem(mapKey);
            const map: Record<string, FeedbackRating> = rawMap ? JSON.parse(rawMap) : {};
            map[messageId] = rating;
            localStorage.setItem(mapKey, JSON.stringify(map));
          }

          setMessageFeedback((prevFeedback) => ({
            ...prevFeedback,
            [messageId]: rating,
          }));

          return prev.map((message) =>
            message.id === messageId ? { ...message, feedback: rating === "up" ? "helpful" : "not_helpful" } : message,
          );
        });
      } catch {
        // Silent fail for feedback storage
      }
    },
    [route, userId, pageContextHintValue],
  );

  return {
    messages,
    setMessages,
    isTyping,
    send,
    suggestions: SUGGESTIONS,
    error: lastError,
    retry,
    stopGeneration,
    clearHistory,
    submitFeedback,
    messageFeedback,
    pendingWorkflow: pendingWorkflow && !isWorkflowExpired(pendingWorkflow) ? pendingWorkflow : null,
    updatePendingWorkflow,
  };
}
