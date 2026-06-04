import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearPendingWorkflow,
  createWorkflow,
  getPendingWorkflow,
  isCancelReply,
  isConfirmReply,
  isWorkflowExpired,
  normalizeWorkflow,
  setPendingWorkflow,
} from "../assistantWorkflow";
import type { AssistantPageContextHint } from "../buildAssistantContext";
import * as parseActions from "../parseActions";
import { useAssistant } from "../useAssistant";

const authContextMock = vi.hoisted(() => ({
  useAuthContext: vi.fn(),
}));

const pageContextMock = vi.hoisted(() => ({
  useAssistantPageContextValue: vi.fn<() => AssistantPageContextHint | null>(() => null),
}));

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuthContext: authContextMock.useAuthContext,
}));

vi.mock("../AssistantPageContextProvider", () => ({
  useAssistantPageContextValue: pageContextMock.useAssistantPageContextValue,
}));

vi.mock("../buildAssistantContext", () => ({
  buildAssistantContext: vi.fn((_refDate, _route, _hint, _trimmed, userId) => ({
    currentWeek: 5,
    weeksTotal: 12,
    goals: [],
    todayTasks: [],
    lastReflectionDate: null,
    feasibility: null,
    latestWeeklyReview: null,
    stuckSignals: {
      latestObstacle: null,
      missedCommitments: [],
      overdueOpenCount: 0,
      overdueTasks: [],
    },
    trend: { completionLast4Weeks: [], direction: "unknown" },
    streak: { daysWithCompletedTask: 0 },
    upcomingDeadlines: [],
    pendingWorkflow: getPendingWorkflow(userId),
  })),
}));

vi.mock("../assistantApi", () => ({
  sendAssistantMessageStream: vi.fn(),
}));

vi.mock("../executeAction", () => ({
  executeAction: vi.fn(),
}));

import { sendAssistantMessageStream } from "../assistantApi";
import { executeAction } from "../executeAction";

const mockedSendAssistantMessageStream = vi.mocked(sendAssistantMessageStream);
const mockedExecuteAction = vi.mocked(executeAction);

const TEST_USER = "wf-test-user";

function setAuthContext(userId: string | null = null) {
  authContextMock.useAuthContext.mockReturnValue({
    user: userId ? { uid: userId } : null,
    userProfile: null,
    userProfileLoading: false,
    userProfileError: null,
    authLoading: false,
    error: null,
    login: vi.fn().mockResolvedValue(null),
    logout: vi.fn().mockResolvedValue(undefined),
    refreshUserProfile: vi.fn(),
    isConfigured: true,
  });
}

describe("Assistant Workflow Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setAuthContext(TEST_USER);
    // Skip welcome message injection by marking onboarded
    localStorage.setItem(`assistant.onboarded:${TEST_USER}`, "1");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Workflow helpers and states", () => {
    it("creates workflow with proper TTL and properties", () => {
      const wf = createWorkflow({
        type: "create_goal_workflow",
        userId: TEST_USER,
        summary: "Thiết lập mục tiêu",
        sourceUserText: "tạo mục tiêu học tiếng Anh",
        missingFields: ["category", "deadline"],
      });

      expect(wf.id).toBeDefined();
      expect(wf.type).toBe("create_goal_workflow");
      expect(wf.status).toBe("needs_clarification");
      expect(wf.missingFields).toEqual(["category", "deadline"]);
      expect(wf.expiresAt).toBeDefined();
      expect(isWorkflowExpired(wf)).toBe(false);
    });

    it("identifies expired workflow properly", () => {
      const now = new Date();
      const wfExpired = createWorkflow({
        type: "create_goal_workflow",
        userId: TEST_USER,
        summary: "Expired",
        sourceUserText: "test",
        now: new Date(now.getTime() - 40 * 60 * 1000), // created 40 mins ago
      });

      expect(isWorkflowExpired(wfExpired, now)).toBe(true);
    });

    it("identifies confirm and cancel messages properly", () => {
      expect(isConfirmReply("Đồng ý")).toBe(true);
      expect(isConfirmReply("ok làm đi")).toBe(true);
      expect(isConfirmReply("xác nhận")).toBe(true);
      expect(isConfirmReply("cancel")).toBe(false);

      expect(isCancelReply("hủy")).toBe(true);
      expect(isCancelReply("thôi bỏ đi")).toBe(true);
      expect(isCancelReply("bỏ qua")).toBe(true);
      expect(isCancelReply("cancel")).toBe(true);
      expect(isCancelReply("làm đi")).toBe(false);
    });

    it("normalizes workflow safely and rejects malformed data", () => {
      expect(normalizeWorkflow(null)).toBeNull();
      expect(normalizeWorkflow({ type: "unknown", status: "ready_for_confirmation" })).toBeNull();
      expect(normalizeWorkflow({ type: "create_goal_workflow", status: "bad" })).toBeNull();

      const wf = normalizeWorkflow({
        id: "wf_secret_abcdefghijklmnopqrstuvwxyz",
        type: "create_goal_workflow",
        status: "ready_for_confirmation",
        createdAt: "2026-06-04T10:00:00.000Z",
        updatedAt: "2026-06-04T10:00:00.000Z",
        expiresAt: "2026-06-04T10:30:00.000Z",
        userId: TEST_USER,
        summary: "Tạo goal password: mySecretPassword123",
        missingFields: ["deadline"],
        proposedActions: [{ id: "act_1", type: "create_goal", label: "Tạo api_key: abcdefghijklmnopqrstuvwxyz", payload: { title: "Goal token: abcdefghijklmnopqrstuvwxyz" } }],
        executionResults: [{ actionId: "act_1", status: "alreadyDone", message: "ok" }],
        sourceUserText: "tạo goal secret: abcdefghijklmnopqrstuvwxyz",
        metadata: { note: "access_token: abcdefghijklmnopqrstuvwxyz", nested: { unsafe: "drop" } },
      });

      expect(wf).not.toBeNull();
      expect(wf?.summary).toContain("[REDACTED]");
      expect(wf?.sourceUserText).toContain("[REDACTED]");
      expect(wf?.proposedActions[0].label).toContain("[REDACTED]");
      expect(String(wf?.proposedActions[0].payload.title)).toContain("[REDACTED]");
      expect(wf?.metadata?.note).toContain("[REDACTED]");
      expect(wf?.metadata).not.toHaveProperty("nested");
    });

    it("saves, reads, clears, expires, and scopes pending workflow by user", () => {
      const now = new Date("2026-06-04T10:00:00.000Z");
      const wf = createWorkflow({
        type: "create_task_workflow",
        userId: TEST_USER,
        summary: "Tạo task",
        sourceUserText: "tạo task",
        now,
      });

      setPendingWorkflow(TEST_USER, wf);
      expect(getPendingWorkflow(TEST_USER, now)?.id).toBe(wf.id);
      expect(getPendingWorkflow("other-user", now)).toBeNull();
      expect(getPendingWorkflow(null, now)).toBeNull();
      expect(getPendingWorkflow(TEST_USER, new Date(now.getTime() + 31 * 60 * 1000))).toBeNull();

      setPendingWorkflow(null, { ...wf, userId: null, id: "wf_anon" });
      expect(getPendingWorkflow(null, now)?.id).toBe("wf_anon");
      clearPendingWorkflow(null);
      expect(getPendingWorkflow(null, now)).toBeNull();
    });

    it("does not crash when localStorage is unavailable", () => {
      const originalLocalStorage = globalThis.localStorage;
      Object.defineProperty(globalThis, "localStorage", { value: undefined, configurable: true });
      expect(() => getPendingWorkflow(TEST_USER)).not.toThrow();
      expect(() => setPendingWorkflow(TEST_USER, createWorkflow({ type: "create_goal_workflow", userId: TEST_USER, summary: "x", sourceUserText: "x" }))).not.toThrow();
      expect(() => clearPendingWorkflow(TEST_USER)).not.toThrow();
      Object.defineProperty(globalThis, "localStorage", { value: originalLocalStorage, configurable: true });
    });
  });

  describe("useAssistant integration", () => {
    it("handles cancel workflow message client-side directly", async () => {
      const wf = createWorkflow({
        type: "create_goal_workflow",
        userId: TEST_USER,
        summary: "Tạo goal nháp",
        sourceUserText: "tạo goal",
        proposedActions: [{ id: "act_1", type: "create_goal", label: "Tạo mục tiêu", payload: {} }],
      });
      setPendingWorkflow(TEST_USER, wf);

      const { result } = renderHook(() => useAssistant());

      await act(async () => {
        await result.current.send("Hủy bỏ");
      });

      expect(mockedSendAssistantMessageStream).not.toHaveBeenCalled();
      expect(mockedExecuteAction).not.toHaveBeenCalled();
      expect(getPendingWorkflow(TEST_USER)).toBeNull();

      const assistantMsg = result.current.messages.find((m) => m.role === "assistant");
      expect(assistantMsg?.content).toContain("Đã hủy bỏ");
    });

    it("executes workflow proposed actions sequentially and marks completed", async () => {
      const wf = createWorkflow({
        type: "create_task_workflow",
        userId: TEST_USER,
        summary: "Tạo nhiều task",
        sourceUserText: "tạo task đọc sách và chạy bộ",
        proposedActions: [
          { id: "act_1", type: "create_task", label: "Tạo task đọc sách", payload: {} },
          { id: "act_2", type: "create_task", label: "Tạo task chạy bộ", payload: {} },
        ],
      });
      setPendingWorkflow(TEST_USER, wf);

      mockedExecuteAction.mockResolvedValue({
        success: true,
        message: "Thành công",
      });

      const { result } = renderHook(() => useAssistant());

      await act(async () => {
        await result.current.send("Đồng ý");
      });

      expect(mockedExecuteAction).toHaveBeenCalledTimes(2);
      expect(mockedExecuteAction).toHaveBeenNthCalledWith(1, { ...wf.proposedActions[0], autoExecute: false }, TEST_USER);
      expect(mockedExecuteAction).toHaveBeenNthCalledWith(2, { ...wf.proposedActions[1], autoExecute: false }, TEST_USER);
      expect(getPendingWorkflow(TEST_USER)).toBeNull();

      const assistantMsg = result.current.messages.find((m) => m.role === "assistant");
      expect(assistantMsg?.content).toContain("Đã thực hiện thành công các hành động");
      expect(assistantMsg?.content).toContain("Tạo task đọc sách");
      expect(assistantMsg?.content).toContain("Tạo task chạy bộ");
    });

    it("reports alreadyDone workflow action without failure", async () => {
      const wf = createWorkflow({
        type: "create_task_workflow",
        userId: TEST_USER,
        summary: "Tick task",
        sourceUserText: "tick task",
        proposedActions: [{ id: "act_1", type: "mark_task_done", label: "Tick task đọc sách", payload: { taskId: "task_1", done: true } }],
      });
      setPendingWorkflow(TEST_USER, wf);

      mockedExecuteAction.mockResolvedValue({
        success: true,
        alreadyDone: true,
        message: "Task này đã hoàn thành từ trước rồi.",
      });

      const { result } = renderHook(() => useAssistant());

      await act(async () => {
        await result.current.send("xác nhận");
      });

      expect(mockedExecuteAction).toHaveBeenCalledTimes(1);
      expect(getPendingWorkflow(TEST_USER)).toBeNull();
      const assistantMsg = result.current.messages.find((m) => m.role === "assistant");
      expect(assistantMsg?.content).toContain("[Đã làm trước đó]");
    });

    it("stops workflow execution and sets failed status if an action fails", async () => {
      const wf = createWorkflow({
        type: "create_task_workflow",
        userId: TEST_USER,
        summary: "Tạo nhiều task",
        sourceUserText: "tạo task",
        proposedActions: [
          { id: "act_1", type: "create_task", label: "Tạo task 1", payload: {} },
          { id: "act_2", type: "create_task", label: "Tạo task 2", payload: {} },
        ],
      });
      setPendingWorkflow(TEST_USER, wf);

      mockedExecuteAction.mockResolvedValueOnce({
        success: false,
        message: "Lỗi lưu trữ",
      });

      const { result } = renderHook(() => useAssistant());

      await act(async () => {
        await result.current.send("Đồng ý");
      });

      expect(mockedExecuteAction).toHaveBeenCalledTimes(1); // Dừng ngay sau action 1
      const stored = getPendingWorkflow(TEST_USER);
      // Khi fail, chúng ta cập nhật status là failed trong pending workflow state
      expect(stored?.status).toBe("failed");
      expect(stored?.executionResults[0]).toMatchObject({
        actionId: "act_1",
        status: "failed",
        message: "Lỗi lưu trữ",
      });

      const assistantMsg = result.current.messages.find((m) => m.role === "assistant");
      expect(assistantMsg?.content).toContain('Thực hiện thất bại ở bước "Tạo task 1"');
    });

    it("creates goal workflow preview before execution", async () => {
      mockedSendAssistantMessageStream.mockImplementationOnce(async (_req, onDelta) => {
        onDelta("Mình đã chuẩn bị bản nháp mục tiêu.");
      });
      vi.spyOn(parseActions, "parseAssistantReply").mockReturnValueOnce({
        textContent: "Preview mục tiêu học tiếng Anh. Gõ đồng ý để tạo.",
        actions: [
          {
            id: "act_goal",
            type: "create_goal",
            label: "Tạo mục tiêu: Học tiếng Anh",
            payload: { title: "Học tiếng Anh", category: "career", deadline: "2026-09-01" },
            autoExecute: true,
          },
        ],
      });

      const { result } = renderHook(() => useAssistant());

      await act(async () => {
        await result.current.send("tạo mục tiêu học tiếng Anh deadline 2026-09-01");
      });

      const stored = getPendingWorkflow(TEST_USER);
      expect(stored?.type).toBe("create_goal_workflow");
      expect(stored?.status).toBe("ready_for_confirmation");
      expect(stored?.proposedActions[0].autoExecute).toBe(false);
      expect(mockedExecuteAction).not.toHaveBeenCalled();
    });

    it("creates task workflow preview before execution", async () => {
      mockedSendAssistantMessageStream.mockImplementationOnce(async (_req, onDelta) => {
        onDelta("Mình đã chuẩn bị task nháp.");
      });
      vi.spyOn(parseActions, "parseAssistantReply").mockReturnValueOnce({
        textContent: "Preview task đọc sách. Gõ đồng ý để tạo.",
        actions: [
          {
            id: "act_task",
            type: "create_task",
            label: "Tạo task: Đọc sách",
            payload: { title: "Đọc sách", scheduledDate: "today", isCore: false },
            autoExecute: true,
          },
        ],
      });

      const { result } = renderHook(() => useAssistant());

      await act(async () => {
        await result.current.send("tạo task đọc sách hôm nay");
      });

      const stored = getPendingWorkflow(TEST_USER);
      expect(stored?.type).toBe("create_task_workflow");
      expect(stored?.proposedActions[0].autoExecute).toBe(false);
      expect(mockedExecuteAction).not.toHaveBeenCalled();
    });

    it("does not execute automatically and packages large/multi proposed actions as pending workflow", async () => {
      mockedSendAssistantMessageStream.mockImplementationOnce(async (_req, onDelta) => {
        onDelta("Mình đã chuẩn bị sẵn bản nháp kế hoạch cho bạn.");
      });

      // Mock AI response parsing to return 2 tasks
      vi.spyOn(parseActions, "parseAssistantReply").mockReturnValueOnce({
        textContent: "Mình đề xuất 2 task học tiếng Anh.",
        actions: [
          { id: "act_1", type: "create_task", label: "Học từ vựng", payload: {}, autoExecute: true },
          { id: "act_2", type: "create_task", label: "Nghe audio", payload: {}, autoExecute: true },
        ],
      });

      const { result } = renderHook(() => useAssistant());

      await act(async () => {
        await result.current.send("tạo 2 task học tiếng Anh");
      });

      // Phải có pending workflow được lưu
      const stored = getPendingWorkflow(TEST_USER);
      expect(stored).not.toBeNull();
      expect(stored?.type).toBe("create_task_workflow");
      expect(stored?.status).toBe("ready_for_confirmation");
      expect(stored?.proposedActions.every((a) => !a.autoExecute)).toBe(true);

      // Thẻ actions trong chat message được tắt autoExecute
      const assistantMsg = result.current.messages.find(
        (m) => m.role === "assistant" && m.content.includes("đề xuất 2 task"),
      );
      expect(assistantMsg).toBeDefined();
      expect(assistantMsg?.actions).toBeDefined();
      expect(assistantMsg?.actions?.every((a) => !a.autoExecute)).toBe(true);
      expect(mockedExecuteAction).not.toHaveBeenCalled();
    });
  });
});
