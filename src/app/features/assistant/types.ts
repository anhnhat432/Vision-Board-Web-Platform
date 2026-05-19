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

export interface FeedbackEntry {
  messageId: string;
  userText: string;
  replyText: string;
  rating: FeedbackRating;
  timestamp: number;
  route?: string;
}
