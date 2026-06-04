import type { AssistantAction } from "./parseActions";

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  status?: "streaming" | "complete";
  feedback?: "helpful" | "not_helpful";
  actions?: AssistantAction[];
  isWelcome?: boolean;
};

export type ChatHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

export type FeedbackRating = "up" | "down";
export type FeedbackReason = "wrong_action" | "wrong_context" | "too_long" | "too_generic" | "unsafe" | "other";

export interface FeedbackEntry {
  messageId: string;
  userText: string;
  replyText: string;
  rating: FeedbackRating;
  timestamp: number;
  route?: string;
  reason?: FeedbackReason;
  correction?: string;
  expectedActionType?: string;
  expectedTaskTitle?: string;
  actionExecution?: {
    actionType: string;
    success: boolean;
    message: string;
  };
}

export type MemoryItemType =
  | "user_preference"
  | "goal_context"
  | "task_history"
  | "reflection_insight"
  | "assistant_correction"
  | "action_outcome";

export interface MemoryItem {
  id: string;
  userId: string;
  type: MemoryItemType;
  content: string;
  source?: string;
  reason?: string;
  createdAt: string;
  updatedAt?: string;
  confidence?: number;
  tags?: string[];
}

export interface AssistantRetrievedMemory {
  source: "goal" | "task" | "weekly_review" | "reflection" | "assistant_memory";
  title: string;
  snippet: string;
  score: number;
  date?: string;
  goalId?: string;
  taskId?: string;
}
