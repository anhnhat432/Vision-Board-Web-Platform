import type { FeedbackReason, MemoryItem, MemoryItemType } from "./types";
import { getUserData } from "@/app/utils/storage";

export interface AssistantMemory {
  version: number;
  updatedAt: string;
  userPreferences: string[];
  recurringObstacles: string[];
  preferredCoachingStyle?: "direct" | "gentle" | "structured" | "brief";
  successfulPatterns: string[];
  rejectedPatterns: string[];
  recentCorrections: Array<{
    at: string;
    userSaid: string;
    assistantShouldDo: string;
  }>;
  taskBehaviorSignals: {
    oftenMissedTaskTitles: string[];
    preferredTaskTime?: string;
    commonRescheduleReason?: string;
  };
}

export interface AssistantMemorySummary {
  preferredCoachingStyle?: AssistantMemory["preferredCoachingStyle"];
  recurringObstacles: string[];
  userPreferences: string[];
  rejectedPatterns: string[];
  recentCorrections: string[];
  oftenMissedTasks: string[];
}

export const ASSISTANT_MEMORY_STORAGE_KEY = "assistant.memory";
const MEMORY_ITEMS_PREFIX = "assistant.memory_items:";

const MAX_ARRAY_SIZE = 15;
const MAX_SUMMARY_SIZE = 3;
const MAX_TEXT_LENGTH = 150;

function truncate(text: string, maxLength = MAX_TEXT_LENGTH): string {
  return text.trim().slice(0, maxLength);
}

function normalizeTextArray(value: unknown, limit = MAX_ARRAY_SIZE): string[] {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => truncate(item))
        .filter(Boolean)
        .slice(0, limit)
    : [];
}

function isPreferredCoachingStyle(value: unknown): value is AssistantMemory["preferredCoachingStyle"] {
  return value === "direct" || value === "gentle" || value === "structured" || value === "brief";
}

// Redact secrets, sensitive keys, emails
export function redactSensitive(text: string): string {
  return text
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, "[EMAIL_REDACTED]")
    .replace(/\b(?=[A-Za-z0-9_-]{20,}\b)(?=[A-Za-z0-9_-]*\d)[A-Za-z0-9_-]+\b/g, "[REDACTED]")
    .replace(
      /\b(api[_\s-]?key|access[_\s-]?token|refresh[_\s-]?token|secret|password|token|private[_\s-]?key|credentials)\b\s*[:=]\s*["']?[^"'\s,;]+/gi,
      "$1: [REDACTED]",
    )
    .replace(/\b[\w-]*(?:api[_\s-]?key|access[_\s-]?token|refresh[_\s-]?token|secret|password|token|private[_\s-]?key)[\w-]*\b/gi, "[REDACTED]")
    .replace(
      /\b(api[_\s-]?key|access[_\s-]?token|refresh[_\s-]?token|secret|password|token|private[_\s-]?key|credentials)\b/gi,
      "[REDACTED]",
    );
}

export function normalizeAssistantMemory(raw: unknown): AssistantMemory {
  const defaultMemory: AssistantMemory = {
    version: 1,
    updatedAt: new Date().toISOString(),
    userPreferences: [],
    recurringObstacles: [],
    successfulPatterns: [],
    rejectedPatterns: [],
    recentCorrections: [],
    taskBehaviorSignals: {
      oftenMissedTaskTitles: [],
    },
  };

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return defaultMemory;
  }

  const rawObj = raw as Record<string, unknown>;

  const memory: AssistantMemory = {
    version: typeof rawObj.version === "number" ? rawObj.version : 1,
    updatedAt: typeof rawObj.updatedAt === "string" ? rawObj.updatedAt : new Date().toISOString(),
    userPreferences: normalizeTextArray(rawObj.userPreferences),
    recurringObstacles: normalizeTextArray(rawObj.recurringObstacles),
    successfulPatterns: normalizeTextArray(rawObj.successfulPatterns),
    rejectedPatterns: normalizeTextArray(rawObj.rejectedPatterns),
    recentCorrections: Array.isArray(rawObj.recentCorrections)
      ? rawObj.recentCorrections
          .map((item) => {
            if (!item || typeof item !== "object" || Array.isArray(item)) return null;
            const obj = item as Record<string, unknown>;
            if (typeof obj.userSaid !== "string" || typeof obj.assistantShouldDo !== "string") return null;
            return {
              at: typeof obj.at === "string" ? obj.at : new Date().toISOString(),
              userSaid: truncate(obj.userSaid),
              assistantShouldDo: truncate(obj.assistantShouldDo),
            };
          })
          .filter((x): x is { at: string; userSaid: string; assistantShouldDo: string } => x !== null)
          .slice(0, MAX_ARRAY_SIZE)
      : [],
    taskBehaviorSignals: {
      oftenMissedTaskTitles: [],
    },
  };

  if (isPreferredCoachingStyle(rawObj.preferredCoachingStyle)) {
    memory.preferredCoachingStyle = rawObj.preferredCoachingStyle;
  }

  if (rawObj.taskBehaviorSignals && typeof rawObj.taskBehaviorSignals === "object" && !Array.isArray(rawObj.taskBehaviorSignals)) {
    const rawSignals = rawObj.taskBehaviorSignals as Record<string, unknown>;
    memory.taskBehaviorSignals.oftenMissedTaskTitles = normalizeTextArray(rawSignals.oftenMissedTaskTitles);
    if (typeof rawSignals.preferredTaskTime === "string") {
      memory.taskBehaviorSignals.preferredTaskTime = truncate(rawSignals.preferredTaskTime, 50);
    }
    if (typeof rawSignals.commonRescheduleReason === "string") {
      memory.taskBehaviorSignals.commonRescheduleReason = truncate(rawSignals.commonRescheduleReason);
    }
  }

  return memory;
}

// ----------------------------------------------------
// Memory Items API (Phase 7 Flat Memory Layer)
// ----------------------------------------------------

export function getMemoryItems(userId: string | null = null): MemoryItem[] {
  if (typeof localStorage === "undefined") return [];

  const targetUserId = userId ?? "anon";
  const itemsKey = `${MEMORY_ITEMS_PREFIX}${targetUserId}`;

  try {
    const rawItems = localStorage.getItem(itemsKey);
    if (rawItems) {
      return JSON.parse(rawItems);
    }

    // Tương thích ngược: migrate từ key legacy nếu có
    const legacyRaw = localStorage.getItem(ASSISTANT_MEMORY_STORAGE_KEY);
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw);
      const migrated: MemoryItem[] = [];
      const now = new Date().toISOString();

      if (legacy.userPreferences) {
        for (const pref of legacy.userPreferences) {
          migrated.push({
            id: `pref_${Math.random().toString(36).substring(2, 9)}`,
            userId: targetUserId,
            type: "user_preference",
            content: redactSensitive(pref),
            createdAt: now,
          });
        }
      }

      if (legacy.recurringObstacles) {
        for (const obs of legacy.recurringObstacles) {
          migrated.push({
            id: `obs_${Math.random().toString(36).substring(2, 9)}`,
            userId: targetUserId,
            type: "user_preference",
            content: redactSensitive(obs),
            tags: ["obstacle"],
            createdAt: now,
          });
        }
      }

      if (legacy.preferredCoachingStyle) {
        migrated.push({
          id: `style_${Math.random().toString(36).substring(2, 9)}`,
          userId: targetUserId,
          type: "user_preference",
          content: `Preferred coaching style: ${legacy.preferredCoachingStyle}`,
          tags: ["coaching_style", legacy.preferredCoachingStyle],
          createdAt: now,
        });
      }

      if (legacy.recentCorrections) {
        for (const corr of legacy.recentCorrections) {
          migrated.push({
            id: `corr_${Math.random().toString(36).substring(2, 9)}`,
            userId: targetUserId,
            type: "assistant_correction",
            content: redactSensitive(corr.assistantShouldDo),
            reason: redactSensitive(corr.userSaid),
            createdAt: corr.at || now,
          });
        }
      }

      if (legacy.taskBehaviorSignals) {
        if (legacy.taskBehaviorSignals.oftenMissedTaskTitles) {
          for (const title of legacy.taskBehaviorSignals.oftenMissedTaskTitles) {
            migrated.push({
              id: `miss_${Math.random().toString(36).substring(2, 9)}`,
              userId: targetUserId,
              type: "task_history",
              content: redactSensitive(title),
              tags: ["missed"],
              createdAt: now,
            });
          }
        }
        if (legacy.taskBehaviorSignals.preferredTaskTime) {
          migrated.push({
            id: `time_${Math.random().toString(36).substring(2, 9)}`,
            userId: targetUserId,
            type: "task_history",
            content: redactSensitive(legacy.taskBehaviorSignals.preferredTaskTime),
            tags: ["preferred_time"],
            createdAt: now,
          });
        }
        if (legacy.taskBehaviorSignals.commonRescheduleReason) {
          migrated.push({
            id: `resch_${Math.random().toString(36).substring(2, 9)}`,
            userId: targetUserId,
            type: "task_history",
            content: redactSensitive(legacy.taskBehaviorSignals.commonRescheduleReason),
            tags: ["reschedule_reason"],
            createdAt: now,
          });
        }
      }

      if (migrated.length > 0) {
        localStorage.setItem(itemsKey, JSON.stringify(migrated));
        return migrated;
      }
    }
  } catch {}

  return [];
}

export function saveMemoryItems(items: MemoryItem[], userId: string | null = null): void {
  if (typeof localStorage === "undefined") return;

  const targetUserId = userId ?? "anon";
  const itemsKey = `${MEMORY_ITEMS_PREFIX}${targetUserId}`;

  try {
    const sanitizedItems = items.map((item) => ({
      ...item,
      content: redactSensitive(truncate(item.content, 300)),
      reason: item.reason ? redactSensitive(truncate(item.reason, 300)) : undefined,
    }));
    localStorage.setItem(itemsKey, JSON.stringify(sanitizedItems));
  } catch {}
}

export function addMemoryItem(
  item: Omit<MemoryItem, "id" | "userId" | "createdAt"> & { createdAt?: string },
  userId: string | null = null,
): MemoryItem {
  const targetUserId = userId ?? "anon";
  const items = getMemoryItems(targetUserId);

  const newItem: MemoryItem = {
    id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    userId: targetUserId,
    type: item.type,
    content: redactSensitive(truncate(item.content, 300)),
    source: item.source,
    reason: item.reason ? redactSensitive(truncate(item.reason, 300)) : undefined,
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt,
    confidence: item.confidence,
    tags: item.tags,
  };

  items.unshift(newItem);
  saveMemoryItems(items, targetUserId);
  return newItem;
}

export function deleteMemoryItem(itemId: string, userId: string | null = null): void {
  const targetUserId = userId ?? "anon";
  const items = getMemoryItems(targetUserId);
  const filtered = items.filter((it) => it.id !== itemId);
  saveMemoryItems(filtered, targetUserId);
}

export function clearMemory(userId: string | null = null): void {
  if (typeof localStorage === "undefined") return;
  const targetUserId = userId ?? "anon";
  try {
    localStorage.removeItem(`${MEMORY_ITEMS_PREFIX}${targetUserId}`);
    localStorage.removeItem(ASSISTANT_MEMORY_STORAGE_KEY);
  } catch {}
}

// ----------------------------------------------------
// Legacy Wrapper (Tương thích ngược)
// ----------------------------------------------------

export function mapMemoryItemsToLegacy(items: MemoryItem[]): AssistantMemory {
  const userPreferences: string[] = [];
  const recurringObstacles: string[] = [];
  let preferredCoachingStyle: AssistantMemory["preferredCoachingStyle"] = undefined;
  const recentCorrections: AssistantMemory["recentCorrections"] = [];
  const oftenMissedTaskTitles: string[] = [];
  let preferredTaskTime: string | undefined = undefined;
  let commonRescheduleReason: string | undefined = undefined;
  const successfulPatterns: string[] = [];
  const rejectedPatterns: string[] = [];

  for (const item of items) {
    if (item.type === "user_preference") {
      const tags = item.tags || [];
      if (tags.includes("coaching_style")) {
        const style = tags.find((t) => t !== "coaching_style");
        if (style === "direct" || style === "gentle" || style === "structured" || style === "brief") {
          preferredCoachingStyle = style;
        }
      } else if (tags.includes("obstacle")) {
        recurringObstacles.push(item.content);
      } else if (tags.includes("success_pattern")) {
        successfulPatterns.push(item.content);
      } else if (tags.includes("rejected_pattern")) {
        rejectedPatterns.push(item.content);
      } else {
        userPreferences.push(item.content);
      }
    } else if (item.type === "assistant_correction") {
      recentCorrections.push({
        at: item.createdAt,
        userSaid: item.reason || "",
        assistantShouldDo: item.content,
      });
    } else if (item.type === "task_history") {
      const tags = item.tags || [];
      if (tags.includes("missed")) {
        oftenMissedTaskTitles.push(item.content);
      } else if (tags.includes("preferred_time")) {
        preferredTaskTime = item.content;
      } else if (tags.includes("reschedule_reason")) {
        commonRescheduleReason = item.content;
      }
    }
  }

  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    userPreferences,
    recurringObstacles,
    preferredCoachingStyle,
    successfulPatterns,
    rejectedPatterns,
    recentCorrections,
    taskBehaviorSignals: {
      oftenMissedTaskTitles,
      preferredTaskTime,
      commonRescheduleReason,
    },
  };
}

export function getAssistantMemory(userId: string | null = null): AssistantMemory {
  const items = getMemoryItems(userId);
  return mapMemoryItemsToLegacy(items);
}

export function saveAssistantMemory(memory: AssistantMemory, userId: string | null = null): void {
  const targetUserId = userId ?? "anon";
  const items = getMemoryItems(targetUserId);

  // Giữ lại các items không thuộc legacy types để tránh bị mất
  const nonLegacyItems = items.filter(
    (item) =>
      item.type !== "user_preference" &&
      item.type !== "assistant_correction" &&
      item.type !== "task_history"
  );

  const now = new Date().toISOString();
  const migratedItems: MemoryItem[] = [];

  for (const pref of memory.userPreferences) {
    migratedItems.push({
      id: `pref_${Math.random().toString(36).substring(2, 9)}`,
      userId: targetUserId,
      type: "user_preference",
      content: pref,
      createdAt: now,
    });
  }

  for (const obs of memory.recurringObstacles) {
    migratedItems.push({
      id: `obs_${Math.random().toString(36).substring(2, 9)}`,
      userId: targetUserId,
      type: "user_preference",
      content: obs,
      tags: ["obstacle"],
      createdAt: now,
    });
  }

  if (memory.preferredCoachingStyle) {
    migratedItems.push({
      id: `style_${Math.random().toString(36).substring(2, 9)}`,
      userId: targetUserId,
      type: "user_preference",
      content: `Preferred coaching style: ${memory.preferredCoachingStyle}`,
      tags: ["coaching_style", memory.preferredCoachingStyle],
      createdAt: now,
    });
  }

  for (const succ of memory.successfulPatterns) {
    migratedItems.push({
      id: `succ_${Math.random().toString(36).substring(2, 9)}`,
      userId: targetUserId,
      type: "user_preference",
      content: succ,
      tags: ["success_pattern"],
      createdAt: now,
    });
  }

  for (const rej of memory.rejectedPatterns) {
    migratedItems.push({
      id: `rej_${Math.random().toString(36).substring(2, 9)}`,
      userId: targetUserId,
      type: "user_preference",
      content: rej,
      tags: ["rejected_pattern"],
      createdAt: now,
    });
  }

  for (const corr of memory.recentCorrections) {
    migratedItems.push({
      id: `corr_${Math.random().toString(36).substring(2, 9)}`,
      userId: targetUserId,
      type: "assistant_correction",
      content: corr.assistantShouldDo,
      reason: corr.userSaid,
      createdAt: corr.at || now,
    });
  }

  if (memory.taskBehaviorSignals) {
    for (const title of memory.taskBehaviorSignals.oftenMissedTaskTitles || []) {
      migratedItems.push({
        id: `miss_${Math.random().toString(36).substring(2, 9)}`,
        userId: targetUserId,
        type: "task_history",
        content: title,
        tags: ["missed"],
        createdAt: now,
      });
    }
    if (memory.taskBehaviorSignals.preferredTaskTime) {
      migratedItems.push({
        id: `time_${Math.random().toString(36).substring(2, 9)}`,
        userId: targetUserId,
        type: "task_history",
        content: memory.taskBehaviorSignals.preferredTaskTime,
        tags: ["preferred_time"],
        createdAt: now,
      });
    }
    if (memory.taskBehaviorSignals.commonRescheduleReason) {
      migratedItems.push({
        id: `resch_${Math.random().toString(36).substring(2, 9)}`,
        userId: targetUserId,
        type: "task_history",
        content: memory.taskBehaviorSignals.commonRescheduleReason,
        tags: ["reschedule_reason"],
        createdAt: now,
      });
    }
  }

  saveMemoryItems([...nonLegacyItems, ...migratedItems], targetUserId);
}

function addToUniqueArray(arr: string[], val: string, limit: number): string[] {
  const filtered = arr.filter((x) => x.toLowerCase() !== val.toLowerCase());
  filtered.unshift(val);
  return filtered.slice(0, limit);
}

// ----------------------------------------------------
// Memory Capture Triggers
// ----------------------------------------------------

export function updateAssistantMemoryFromFeedback(
  rating: "helpful" | "not_helpful",
  userText: string,
  replyText: string,
  options?: {
    reason?: FeedbackReason;
    correction?: string;
  },
  userId: string | null = null,
): void {
  const targetUserId = userId ?? "anon";
  const memory = getAssistantMemory(targetUserId);
  const truncatedUser = truncate(userText);

  if (rating === "not_helpful") {
    let reason = "Trả lời tập trung và chính xác hơn.";
    const finalReason = options?.reason;

    if (finalReason === "too_long" || replyText.length > 800) {
      memory.rejectedPatterns = addToUniqueArray(memory.rejectedPatterns, "nói quá dài", MAX_ARRAY_SIZE);
      reason = "Nói cực kỳ ngắn gọn và đi thẳng vào vấn đề.";
      memory.preferredCoachingStyle = "brief";
    } else if (finalReason === "wrong_action") {
      memory.rejectedPatterns = addToUniqueArray(memory.rejectedPatterns, "đề xuất sai hành động", MAX_ARRAY_SIZE);
      reason = "Chỉ đề xuất hành động khi có taskId hoặc mục tiêu rõ ràng.";
    } else if (finalReason === "wrong_context") {
      memory.rejectedPatterns = addToUniqueArray(memory.rejectedPatterns, "hiểu sai ngữ cảnh hiện tại", MAX_ARRAY_SIZE);
      reason = "Tập trung bám sát trang hiện tại của người dùng.";
    } else if (finalReason === "too_generic") {
      memory.rejectedPatterns = addToUniqueArray(memory.rejectedPatterns, "câu trả lời chung chung", MAX_ARRAY_SIZE);
      reason = "Đưa ra lời khuyên cụ thể dựa trên danh sách task và goal.";
    }

    if (!finalReason) {
      const lowerUser = userText.toLowerCase();
      if (lowerUser.includes("dài") || lowerUser.includes("rườm rà")) {
        memory.rejectedPatterns = addToUniqueArray(memory.rejectedPatterns, "giải thích rườm rà", MAX_ARRAY_SIZE);
        reason = "Nói ngắn gọn hơn.";
        memory.preferredCoachingStyle = "brief";
      } else if (lowerUser.includes("sai") || lowerUser.includes("không đúng") || lowerUser.includes("lạc đề")) {
        memory.rejectedPatterns = addToUniqueArray(memory.rejectedPatterns, "lạc đề", MAX_ARRAY_SIZE);
        reason = "Không tự ý đề xuất hành động không liên quan hoặc sai ngữ cảnh.";
      }
    }

    if (options?.correction && options.correction.trim()) {
      reason = truncate(options.correction, 300);
    }

    // Thêm trực tiếp vào MemoryItem mới dạng assistant_correction
    addMemoryItem(
      {
        type: "assistant_correction",
        content: reason,
        reason: truncatedUser,
        source: "user_feedback_correction",
      },
      targetUserId,
    );

    memory.recentCorrections.unshift({
      at: new Date().toISOString(),
      userSaid: truncatedUser,
      assistantShouldDo: reason,
    });
    memory.recentCorrections = memory.recentCorrections.slice(0, MAX_ARRAY_SIZE);
  } else if (rating === "helpful") {
    let pattern = "phản hồi hữu ích";
    if (replyText.includes("mark_task_done")) {
      pattern = "hoàn thành task nhanh";
    } else if (replyText.includes("create_goal")) {
      pattern = "gợi ý mục tiêu tốt";
    } else if (replyText.includes("reschedule_task")) {
      pattern = "dời lịch linh hoạt";
    }

    memory.successfulPatterns = addToUniqueArray(memory.successfulPatterns, pattern, MAX_ARRAY_SIZE);
    
    // Lưu vào action outcome
    addMemoryItem(
      {
        type: "action_outcome",
        content: `Successful interaction: ${pattern}`,
        source: "user_feedback_helpful",
        tags: ["helpful", "pattern"],
      },
      targetUserId,
    );
  }

  saveAssistantMemory(memory, targetUserId);
}

export function updateAssistantMemoryFromActionResult(
  actionType: string,
  label: string,
  success: boolean,
  message: string,
  userId: string | null = null,
): void {
  const targetUserId = userId ?? "anon";
  const memory = getAssistantMemory(targetUserId);

  if (success) {
    if (actionType === "mark_task_done" || actionType === "update_task_status") {
      memory.successfulPatterns = addToUniqueArray(memory.successfulPatterns, "hoàn thành công việc nhanh", MAX_ARRAY_SIZE);
    } else if (actionType === "reschedule_task") {
      memory.taskBehaviorSignals.commonRescheduleReason = "dời lịch khi bận";
      memory.userPreferences = addToUniqueArray(memory.userPreferences, "thường xuyên dời lịch task", MAX_ARRAY_SIZE);
    }

    // Lưu action outcome mới
    addMemoryItem(
      {
        type: "action_outcome",
        content: `Thực hiện thành công hành động ${actionType}: ${label}`,
        source: "action_orchestrator",
        tags: ["success", actionType],
      },
      targetUserId,
    );
  } else {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes("không tìm thấy") || lowerMessage.includes("chưa có") || lowerMessage.includes("thiếu")) {
      memory.rejectedPatterns = addToUniqueArray(memory.rejectedPatterns, "chưa rõ mục tiêu hoặc task trong context", MAX_ARRAY_SIZE);
    }

    addMemoryItem(
      {
        type: "action_outcome",
        content: `Thất bại hành động ${actionType}: ${label}. Lỗi: ${message}`,
        source: "action_orchestrator",
        tags: ["failure", actionType],
      },
      targetUserId,
    );
  }

  saveAssistantMemory(memory, targetUserId);
}

// Capture preferences/goals directly from user chat inputs
export function autoCaptureUserMemory(text: string, userId: string | null = null): void {
  const targetUserId = userId ?? "anon";
  const normalized = text.toLowerCase().trim();

  // 1. Sở thích làm việc
  if (
    normalized.includes("tôi thích") ||
    normalized.includes("thích làm") ||
    normalized.includes("thích học") ||
    normalized.includes("đừng nhắc") ||
    normalized.includes("không thích") ||
    normalized.includes("thích nghe")
  ) {
    const items = getMemoryItems(targetUserId);
    const content = text.trim();
    if (!items.some((it) => it.content.toLowerCase() === content.toLowerCase())) {
      addMemoryItem(
        {
          type: "user_preference",
          content,
          source: "user_chat_capture",
          tags: ["preference"],
        },
        targetUserId,
      );
    }
  }

  // 2. Mục tiêu chính
  if (
    normalized.includes("mục tiêu chính") ||
    normalized.includes("mục tiêu của tôi") ||
    normalized.includes("muốn thi ielts") ||
    normalized.includes("muốn thi toeic") ||
    normalized.includes("học toeic") ||
    normalized.includes("học ielts")
  ) {
    const items = getMemoryItems(targetUserId);
    const content = text.trim();
    if (!items.some((it) => it.content.toLowerCase() === content.toLowerCase())) {
      addMemoryItem(
        {
          type: "goal_context",
          content,
          source: "user_chat_capture",
          tags: ["goal"],
        },
        targetUserId,
      );
    }
  }

  // 3. Trở ngại thường gặp (Obstacles)
  if (
    normalized.includes("bận quá") ||
    normalized.includes("không có thời gian") ||
    normalized.includes("lười quá") ||
    normalized.includes("quên việc") ||
    normalized.includes("mệt mỏi") ||
    normalized.includes("không tập trung") ||
    normalized.includes("lười nhác") ||
    normalized.includes("quên mất")
  ) {
    const items = getMemoryItems(targetUserId);
    const content = text.trim();
    if (!items.some((it) => it.content.toLowerCase() === content.toLowerCase())) {
      addMemoryItem(
        {
          type: "user_preference",
          content,
          source: "user_chat_capture",
          tags: ["obstacle"],
        },
        targetUserId,
      );
    }
  }

  // 4. Thói quen thời gian làm việc (Preferred Work Time)
  if (
    normalized.includes("thường làm việc") ||
    normalized.includes("thường học") ||
    normalized.includes("tập trung vào ban đêm") ||
    normalized.includes("tập trung vào buổi tối") ||
    normalized.includes("chỉ rảnh cuối tuần") ||
    normalized.includes("sáng sớm") ||
    normalized.includes("ban đêm") ||
    normalized.includes("cuối tuần") ||
    normalized.includes("buổi sáng") ||
    normalized.includes("buổi tối") ||
    normalized.includes("buổi chiều")
  ) {
    const items = getMemoryItems(targetUserId);
    const content = text.trim();
    if (!items.some((it) => it.content.toLowerCase() === content.toLowerCase())) {
      addMemoryItem(
        {
          type: "user_preference",
          content,
          source: "user_chat_capture",
          tags: ["preferred_time"],
        },
        targetUserId,
      );
    }
  }
}

export function autoCaptureFromAppData(userId: string | null = null): void {
  const targetUserId = userId ?? "anon";

  try {
    const data = getUserData();
    if (!data) return;

    const existingItems = getMemoryItems(targetUserId);
    const existingKeys = new Set(
      existingItems.map((item) => `${item.type}:${item.source ?? ""}:${item.content.toLowerCase()}`),
    );

    const addIfNew = (item: Omit<MemoryItem, "id" | "userId" | "createdAt"> & { createdAt?: string }) => {
      const content = truncate(redactSensitive(item.content), 300);
      if (!content) return;

      const key = `${item.type}:${item.source ?? ""}:${content.toLowerCase()}`;
      if (existingKeys.has(key)) return;

      existingKeys.add(key);
      addMemoryItem({ ...item, content }, targetUserId);
    };

    for (const goal of (data.goals ?? []).slice(0, 5)) {
      if (!goal?.title) continue;

      addIfNew({
        type: "goal_context",
        content: `Goal: ${goal.title}`,
        source: `app_goal:${goal.id}`,
        confidence: 0.75,
        tags: ["goal", goal.category || "other"],
        createdAt: goal.createdAt,
      });
    }

    const latestReflections = [...(data.reflections ?? [])]
      .filter((reflection) => reflection?.content || reflection?.title)
      .sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")))
      .slice(0, 3);

    for (const reflection of latestReflections) {
      const content = [reflection.title, reflection.content].filter(Boolean).join(": ");
      addIfNew({
        type: "reflection_insight",
        content,
        source: `app_reflection:${reflection.id}`,
        confidence: 0.7,
        tags: ["reflection"],
        createdAt: reflection.date,
      });
    }

    for (const goal of (data.goals ?? []).slice(0, 5)) {
      const reviews = [...(goal.twelveWeekSystem?.weeklyReviews ?? [])]
        .filter((review) => review.reviewCompleted)
        .sort((a, b) => String(b.lastReviewAt ?? "").localeCompare(String(a.lastReviewAt ?? "")))
        .slice(0, 2);

      for (const review of reviews) {
        const content = [
          review.mainObstacle ? `Obstacle: ${review.mainObstacle}` : null,
          review.nextWeekPriority ? `Next priority: ${review.nextWeekPriority}` : null,
          review.insights ? `Insight: ${review.insights}` : null,
        ]
          .filter(Boolean)
          .join("; ");

        addIfNew({
          type: "reflection_insight",
          content,
          source: `app_weekly_review:${goal.id}:${review.weekNumber}`,
          confidence: 0.75,
          tags: ["weekly_review", `week_${review.weekNumber}`],
          createdAt: review.lastReviewAt,
        });
      }
    }
  } catch {}
}

// ----------------------------------------------------
// Context Summary
// ----------------------------------------------------

export function summarizeAssistantMemoryForContext(memory: AssistantMemory): AssistantMemorySummary | undefined {
  const summary: AssistantMemorySummary = {
    preferredCoachingStyle: memory.preferredCoachingStyle,
    recurringObstacles: memory.recurringObstacles.slice(0, MAX_SUMMARY_SIZE),
    userPreferences: memory.userPreferences.slice(0, MAX_SUMMARY_SIZE),
    rejectedPatterns: memory.rejectedPatterns.slice(0, MAX_SUMMARY_SIZE),
    recentCorrections: memory.recentCorrections.slice(0, MAX_SUMMARY_SIZE).map((c) => c.assistantShouldDo),
    oftenMissedTasks: memory.taskBehaviorSignals.oftenMissedTaskTitles.slice(0, MAX_SUMMARY_SIZE),
  };

  const hasMemorySignal =
    !!summary.preferredCoachingStyle ||
    summary.recurringObstacles.length > 0 ||
    summary.userPreferences.length > 0 ||
    summary.rejectedPatterns.length > 0 ||
    summary.recentCorrections.length > 0 ||
    summary.oftenMissedTasks.length > 0;

  return hasMemorySignal ? summary : undefined;
}
