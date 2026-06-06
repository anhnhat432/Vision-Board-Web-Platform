import {
  type AssistantActionType,
  isAssistantActionType,
  sanitizeActionPayload,
} from "@shared/assistantActionSchema";

export type { AssistantActionType } from "@shared/assistantActionSchema";

export interface AssistantAction {
  id: string;
  type: AssistantActionType;
  payload: Record<string, unknown>;
  label: string;
  autoExecute?: boolean;
}

export interface ParsedReply {
  textContent: string;
  actions: AssistantAction[];
}

function getRecordValue(record: Record<string, unknown>, key: string): unknown {
  return record[key];
}

function parseActionBlock(content: string): AssistantAction | null {
  try {
    const json = JSON.parse(content) as unknown;
    if (!json || typeof json !== "object" || Array.isArray(json)) return null;
    const record = json as Record<string, unknown>;

    if (typeof record.type !== "string") return null;
    if (!isAssistantActionType(record.type)) return null;

    if (typeof record.label !== "string" || record.label.length === 0) {
      return null;
    }

    const payload = getRecordValue(record, "payload");
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;

    const sanitizedPayload = sanitizeActionPayload(record.type, payload as Record<string, unknown>);
    if (!sanitizedPayload) return null;

    return {
      id: crypto.randomUUID(),
      type: record.type,
      payload: sanitizedPayload,
      label: record.label.slice(0, 80),
      autoExecute: record.autoExecute === true,
    };
  } catch {
    return null;
  }
}

export function parseAssistantReply(raw: string): ParsedReply {
  const actions: AssistantAction[] = [];
  const blocksToRemove: string[] = [];

  // 1. Quét tìm các code block có ba nháy ngược
  const actionBlockRegex = /```(action|json)\n([\s\S]*?)\n```/g;
  let match: RegExpExecArray | null;

  while (true) {
    match = actionBlockRegex.exec(raw);
    if (match === null) break;
    const blockType = match[1];
    const content = match[2].trim();
    const action = parseActionBlock(content);
    if (action) {
      actions.push(action);
      blocksToRemove.push(match[0]);
    } else if (blockType === "action") {
      // For legacy/compatibility, always hide block if it is explicitly tagged as ```action
      blocksToRemove.push(match[0]);
    }
  }

  let textContent = raw;
  for (const block of blocksToRemove) {
    textContent = textContent.replace(block, "");
  }

  // 2. Quét tìm các JSON block thô không có ba nháy ngược nhưng đứng sau từ khóa "action" hoặc "json"
  const rawActionRegex = /(?:^|\n)(?:action|json)\r?\n(\{[\s\S]*?\})(?=\n|$)/gi;
  let rawMatch: RegExpExecArray | null;
  const rawBlocksToRemove: string[] = [];

  rawActionRegex.lastIndex = 0;
  while (true) {
    rawMatch = rawActionRegex.exec(textContent);
    if (rawMatch === null) break;
    const content = rawMatch[1].trim();
    const action = parseActionBlock(content);
    if (action) {
      actions.push(action);
      rawBlocksToRemove.push(rawMatch[0]);
    }
  }

  for (const block of rawBlocksToRemove) {
    textContent = textContent.replace(block, "");
  }

  textContent = textContent.trim();
  return { textContent, actions };
}
