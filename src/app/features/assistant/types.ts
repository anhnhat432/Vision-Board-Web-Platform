export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  status?: "streaming" | "complete";
};

export type ChatHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};
