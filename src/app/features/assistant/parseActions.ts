export interface AssistantAction {
  id: string;
  type: "create_task" | "mark_task_done" | "navigate_to";
  payload: Record<string, unknown>;
  label: string;
}

export interface ParsedReply {
  textContent: string;
  actions: AssistantAction[];
}

const VALID_ACTION_TYPES = ["create_task", "mark_task_done", "navigate_to"];
const VALID_ROUTES = ["/twelve-week", "/today", "/reflection", "/dashboard"];

function sanitizeCreateTaskPayload(payload: Record<string, unknown>): { title: string; scheduledDate: string; isCore: boolean } | null {
  if (typeof payload.title !== "string") return null;
  const title = payload.title.slice(0, 200);

  const scheduledDateRaw = payload.scheduledDate;
  let scheduledDate: string;
  if (scheduledDateRaw === "today" || scheduledDateRaw === "tomorrow") {
    scheduledDate = scheduledDateRaw;
  } else if (typeof scheduledDateRaw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(scheduledDateRaw)) {
    scheduledDate = scheduledDateRaw;
  } else {
    return null;
  }

  const isCore = payload.isCore === true;

  return { title, scheduledDate, isCore };
}

function sanitizeMarkTaskDonePayload(payload: Record<string, unknown>): { taskId: string; done: boolean } | null {
  if (typeof payload.taskId !== "string") return null;
  const taskId = payload.taskId.slice(0, 100);
  const done = payload.done === true;

  if (!done) return null;

  return { taskId, done };
}

function sanitizeNavigateToPayload(payload: Record<string, unknown>): { route: string } | null {
  if (typeof payload.route !== "string") return null;
  const route = payload.route;

  if (!route.startsWith("/")) return null;
  if (!VALID_ROUTES.includes(route)) return null;

  return { route };
}

function parseActionBlock(content: string): AssistantAction | null {
  try {
    const json = JSON.parse(content);

    if (typeof json.type !== "string") return null;
    if (!VALID_ACTION_TYPES.includes(json.type)) return null;

    if (typeof json.label !== "string" || json.label.length === 0) {
      return null;
    }

    if (!json.payload || typeof json.payload !== "object") return null;

    let sanitizedPayload: Record<string, unknown> | null;

    switch (json.type) {
      case "create_task":
        sanitizedPayload = sanitizeCreateTaskPayload(json.payload);
        break;
      case "mark_task_done":
        sanitizedPayload = sanitizeMarkTaskDonePayload(json.payload);
        break;
      case "navigate_to":
        sanitizedPayload = sanitizeNavigateToPayload(json.payload);
        break;
      default:
        return null;
    }

    if (!sanitizedPayload) return null;

    return {
      id: crypto.randomUUID(),
      type: json.type as "create_task" | "mark_task_done" | "navigate_to",
      payload: sanitizedPayload,
      label: json.label.slice(0, 80),
    };
  } catch {
    return null;
  }
}

export function parseAssistantReply(raw: string): ParsedReply {
  const actionBlockRegex = /```action\n([\s\S]*?)\n```/g;

  const actions: AssistantAction[] = [];
  let match: RegExpExecArray | null;

  while (true) {
    match = actionBlockRegex.exec(raw);
    if (match === null) break;
    const content = match[1].trim();
    const action = parseActionBlock(content);
    if (action) {
      actions.push(action);
    }
  }

  const textContent = raw.replace(/```action[\s\S]*?```/g, "").trim();

  return { textContent, actions };
}