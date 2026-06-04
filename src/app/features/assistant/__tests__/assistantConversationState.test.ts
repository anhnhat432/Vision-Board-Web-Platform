import { beforeEach, describe, expect, it } from "vitest";
import {
  type AssistantClarificationCandidate,
  buildClarificationQuestion,
  clearPendingAssistantClarification,
  createTaskSelectionClarification,
  getPendingAssistantClarification,
  isPendingAssistantClarificationExpired,
  readStoredPendingAssistantClarification,
  resolveClarificationReply,
  setPendingAssistantClarification,
} from "../assistantConversationState";

const NOW = new Date("2026-06-04T10:00:00.000Z");

const candidates: AssistantClarificationCandidate[] = [
  { id: "task_read", label: "Đọc sách 20 phút" },
  { id: "task_run", label: "Chạy bộ 2km" },
  { id: "task_toeic", label: "Làm đề TOEIC mini" },
];

describe("assistantConversationState", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("saves, reads and clears pending clarification by user scope", () => {
    const pending = createTaskSelectionClarification({
      intent: "mark_task_done",
      candidates,
      now: NOW,
    });

    setPendingAssistantClarification("user-a", pending);

    expect(getPendingAssistantClarification("user-a", NOW)?.candidates).toHaveLength(3);
    expect(getPendingAssistantClarification("user-b", NOW)).toBeNull();

    clearPendingAssistantClarification("user-a");
    expect(getPendingAssistantClarification("user-a", NOW)).toBeNull();
  });

  it("treats expired pending clarification as unavailable", () => {
    const pending = createTaskSelectionClarification({
      intent: "mark_task_done",
      candidates,
      now: NOW,
      ttlMs: 1000,
    });

    setPendingAssistantClarification("user-a", pending);

    const later = new Date(NOW.getTime() + 2000);
    expect(isPendingAssistantClarificationExpired(pending, later)).toBe(true);
    expect(readStoredPendingAssistantClarification("user-a")).not.toBeNull();
    expect(getPendingAssistantClarification("user-a", later)).toBeNull();
  });

  it("resolves numeric and ordinal replies", () => {
    const pending = createTaskSelectionClarification({
      intent: "mark_task_done",
      candidates,
      now: NOW,
    });

    expect(resolveClarificationReply("1", pending, NOW)).toMatchObject({
      status: "selected",
      candidate: { id: "task_read" },
    });
    expect(resolveClarificationReply("cái thứ 2", pending, NOW)).toMatchObject({
      status: "selected",
      candidate: { id: "task_run" },
    });
    expect(resolveClarificationReply("task thứ ba", pending, NOW)).toMatchObject({
      status: "selected",
      candidate: { id: "task_toeic" },
    });
  });

  it("resolves fuzzy text replies", () => {
    const pending = createTaskSelectionClarification({
      intent: "mark_task_done",
      candidates,
      now: NOW,
    });

    expect(resolveClarificationReply("đọc sách", pending, NOW)).toMatchObject({
      status: "selected",
      candidate: { id: "task_read" },
    });
    expect(resolveClarificationReply("TOEIC", pending, NOW)).toMatchObject({
      status: "selected",
      candidate: { id: "task_toeic" },
    });
  });

  it("cancels or confirms only when safe", () => {
    const multi = createTaskSelectionClarification({
      intent: "mark_task_done",
      candidates,
      now: NOW,
    });
    const single = createTaskSelectionClarification({
      intent: "mark_task_done",
      candidates: [candidates[0]],
      now: NOW,
    });

    expect(resolveClarificationReply("hủy", multi, NOW)).toMatchObject({ status: "cancelled" });
    expect(resolveClarificationReply("ok tick đi", multi, NOW)).toMatchObject({ status: "unresolved" });
    expect(resolveClarificationReply("ok tick đi", single, NOW)).toMatchObject({
      status: "selected",
      candidate: { id: "task_read" },
    });
  });

  it("keeps unresolved replies as a follow-up question", () => {
    const pending = createTaskSelectionClarification({
      intent: "update_task_status",
      candidates,
      now: NOW,
    });

    const result = resolveClarificationReply("không rõ lắm", pending, NOW);

    expect(result.status).toBe("unresolved");
    if (result.status !== "unresolved") throw new Error("Expected unresolved clarification");
    expect(result.question).toContain("Bạn muốn bỏ tick task nào?");
  });

  it("redacts sensitive-looking labels before storing", () => {
    const pending = createTaskSelectionClarification({
      intent: "mark_task_done",
      candidates: [{ id: "task_secret", label: "Check api-key: superSecretTokenValue1234567890" }],
      now: NOW,
    });

    setPendingAssistantClarification("user-a", pending);

    const stored = getPendingAssistantClarification("user-a", NOW);
    expect(stored?.candidates[0].label).toContain("[REDACTED]");
    expect(stored?.candidates[0].label).not.toContain("superSecretTokenValue");
  });

  it("builds a compact clarification question", () => {
    const question = buildClarificationQuestion("mark_task_done", candidates);

    expect(question).toContain("Bạn muốn tick task nào?");
    expect(question).toContain("1. Đọc sách 20 phút");
    expect(question).toContain("2. Chạy bộ 2km");
  });
});
