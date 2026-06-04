import { describe, expect, it } from "vitest";
import { parseAssistantReply } from "../parseActions";

describe("parseAssistantReply", () => {
  it("parses single action block correctly", () => {
    const raw = `Dưới đây là việc bạn nên làm:

\`\`\`action
{
  "type": "create_task",
  "payload": { "title": "Đọc 5 trang sách", "scheduledDate": "today", "isCore": false },
  "label": "Thêm task: Đọc 5 trang sách"
}
\`\`\``;

    const result = parseAssistantReply(raw);

    expect(result.textContent).toBe("Dưới đây là việc bạn nên làm:");
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].type).toBe("create_task");
    expect(result.actions[0].label).toBe("Thêm task: Đọc 5 trang sách");
    expect(result.actions[0].payload.title).toBe("Đọc 5 trang sách");
  });

  it("parses multiple action blocks", () => {
    const raw = `Gợi ý cho bạn:

\`\`\`action
{
  "type": "create_task",
  "payload": { "title": "Việc A", "scheduledDate": "today", "isCore": true },
  "label": "Thêm: Việc A"
}
\`\`\`

\`\`\`action
{
  "type": "navigate_to",
  "payload": { "route": "/today" },
  "label": "Mở trang Hôm nay"
}
\`\`\``;

    const result = parseAssistantReply(raw);

    expect(result.textContent).toBe("Gợi ý cho bạn:");
    expect(result.actions).toHaveLength(2);
    expect(result.actions[0].type).toBe("create_task");
    expect(result.actions[1].type).toBe("navigate_to");
  });

  it("skips invalid JSON blocks", () => {
    const raw = `Đây là gợi ý:

\`\`\`action
{ invalid json here }
\`\`\`

\`\`\`action
{
  "type": "create_task",
  "payload": { "title": "Valid task", "scheduledDate": "today", "isCore": false },
  "label": "Valid"
}
\`\`\``;

    const result = parseAssistantReply(raw);

    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].label).toBe("Valid");
  });

  it("skips unknown action types", () => {
    const raw = `\`\`\`action
{
  "type": "unknown_type",
  "payload": {},
  "label": "Should skip"
}
\`\`\``;

    const result = parseAssistantReply(raw);

    expect(result.actions).toHaveLength(0);
  });

  it("truncates long title in create_task", () => {
    const longTitle = "A".repeat(300);
    const raw = `\`\`\`action
{
  "type": "create_task",
  "payload": { "title": "${longTitle}", "scheduledDate": "today", "isCore": false },
  "label": "Long title task"
}
\`\`\``;

    const result = parseAssistantReply(raw);

    expect(result.actions).toHaveLength(1);
    expect((result.actions[0].payload as { title: string }).title.length).toBe(200);
  });

  it("validates scheduledDate format", () => {
    const raw1 = `\`\`\`action
{
  "type": "create_task",
  "payload": { "title": "Task 1", "scheduledDate": "invalid", "isCore": false },
  "label": "Task 1"
}
\`\`\``;

    const result1 = parseAssistantReply(raw1);
    expect(result1.actions).toHaveLength(0);

    const raw2 = `\`\`\`action
{
  "type": "create_task",
  "payload": { "title": "Task 2", "scheduledDate": "2025-01-15", "isCore": false },
  "label": "Task 2"
}
\`\`\``;

    const result2 = parseAssistantReply(raw2);
    expect(result2.actions).toHaveLength(1);
  });

  it("validates navigate_to route whitelist", () => {
    const raw1 = `\`\`\`action
{
  "type": "navigate_to",
  "payload": { "route": "/unknown-route" },
  "label": "Should skip"
}
\`\`\``;

    const result1 = parseAssistantReply(raw1);
    expect(result1.actions).toHaveLength(0);

    const raw2 = `\`\`\`action
{
  "type": "navigate_to",
  "payload": { "route": "/today" },
  "label": "Should include"
}
\`\`\``;

    const result2 = parseAssistantReply(raw2);
    expect(result2.actions).toHaveLength(1);
  });

  it("validates mark_task_done payload", () => {
    const raw = `\`\`\`action
{
  "type": "mark_task_done",
  "payload": { "taskId": "task_123", "done": true },
  "label": "Đánh dấu xong: Task 123",
  "autoExecute": true
}
\`\`\``;

    const result = parseAssistantReply(raw);

    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].payload.taskId).toBe("task_123");
    expect(result.actions[0].payload.done).toBe(true);
    expect(result.actions[0].autoExecute).toBe(true);
  });

  it("truncates long label", () => {
    const raw = `\`\`\`action
{
  "type": "create_task",
  "payload": { "title": "Task", "scheduledDate": "today", "isCore": false },
  "label": "${"A".repeat(100)}"
}
\`\`\``;

    const result = parseAssistantReply(raw);

    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].label.length).toBe(80);
  });

  it("validates create_goal payload", () => {
    const raw = `\`\`\`action
{
  "type": "create_goal",
  "payload": { "title": "Học tiếng Nhật", "category": "career", "description": "Học N3", "deadline": "2026-12-31" },
  "label": "Tạo mục tiêu: Học tiếng Nhật"
}
\`\`\``;

    const result = parseAssistantReply(raw);

    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].type).toBe("create_goal");
    expect(result.actions[0].payload.title).toBe("Học tiếng Nhật");
    expect(result.actions[0].payload.category).toBe("career");
    expect(result.actions[0].payload.description).toBe("Học N3");
    expect(result.actions[0].payload.deadline).toBe("2026-12-31");
  });

  it("handles empty input", () => {
    const result = parseAssistantReply("");
    expect(result.textContent).toBe("");
    expect(result.actions).toHaveLength(0);
  });

  it("handles text without action blocks", () => {
    const raw = "Đây chỉ là text bình thường không có action nào.";
    const result = parseAssistantReply(raw);

    expect(result.textContent).toBe(raw);
    expect(result.actions).toHaveLength(0);
  });

  it("skips actions with incorrect payload types for done and completed", () => {
    const raw1 = `\`\`\`action
{
  "type": "mark_task_done",
  "payload": { "taskId": "task_123", "done": "true" },
  "label": "Should skip"
}
\`\`\``;
    expect(parseAssistantReply(raw1).actions).toHaveLength(0);

    const raw2 = `\`\`\`action
{
  "type": "update_task_status",
  "payload": { "taskId": "task_123", "completed": 1 },
  "label": "Should skip"
}
\`\`\``;
    expect(parseAssistantReply(raw2).actions).toHaveLength(0);

    const raw3 = `\`\`\`action
{
  "type": "update_task_status",
  "payload": { "taskId": "   ", "completed": true },
  "label": "Should skip empty task"
}
\`\`\``;
    expect(parseAssistantReply(raw3).actions).toHaveLength(0);
  });
});
