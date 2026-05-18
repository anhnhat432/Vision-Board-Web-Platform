import { useCallback, useRef, useState } from "react";
import { buildAssistantContext, type AssistantContext } from "./buildAssistantContext";
import { sendAssistantMessage } from "./assistantApi";
import type { Message } from "./types";

const SUGGESTIONS = [
  "Hôm nay tôi nên làm gì?",
  "Tóm tắt tuần này",
  "Mục tiêu chính của tôi là gì?",
  "Gợi ý reflection",
];

export interface AssistantError {
  message: string;
  errorCode?: string;
}

export interface UseAssistantOptions {
  route?: string;
}

function getErrorMessage(error: unknown): string {
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

function createMessage(role: Message["role"], content: string): Message {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: Date.now(),
  };
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function getRevealStep(content: string): number {
  if (content.length > 480) return 12;
  if (content.length > 240) return 8;
  return 5;
}

export function useAssistant(options?: UseAssistantOptions) {
  const route = options?.route ?? (typeof window !== "undefined" ? window.location.pathname : "/");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [lastError, setLastError] = useState<AssistantError | null>(null);
  const [lastUserText, setLastUserText] = useState<string | null>(null);
  const revealRunRef = useRef(0);

  const revealAssistantMessage = useCallback(async (content: string) => {
    const runId = revealRunRef.current + 1;
    revealRunRef.current = runId;
    const messageId = crypto.randomUUID();
    const step = getRevealStep(content);

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

    for (let index = step; index < content.length; index += step) {
      if (revealRunRef.current !== runId) return;
      const partial = content.slice(0, index);
      setMessages((prev) =>
        prev.map((message) =>
          message.id === messageId ? { ...message, content: partial } : message,
        ),
      );
      await wait(18);
    }

    if (revealRunRef.current !== runId) return;
    setMessages((prev) =>
      prev.map((message) =>
        message.id === messageId
          ? { ...message, content, status: "complete" }
          : message,
      ),
    );
  }, []);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    setMessages((prev) => [...prev, createMessage("user", trimmed)]);
    setLastUserText(trimmed);
    setIsTyping(true);
    setLastError(null);

    try {
      const context: AssistantContext & { route: string } = {
        ...buildAssistantContext(),
        route,
      };

      const response = await sendAssistantMessage({
        message: trimmed,
        context,
      });

      await revealAssistantMessage(response.message);
    } catch (error) {
      const message = getErrorMessage(error);
      setLastError({
        message,
        errorCode: getErrorCode(error),
      });
    } finally {
      setIsTyping(false);
    }
  }, [isTyping, revealAssistantMessage, route]);

  const retry = useCallback(() => {
    if (!lastUserText || isTyping) return;
    void send(lastUserText);
  }, [isTyping, lastUserText, send]);

  return {
    messages,
    isTyping,
    send,
    suggestions: SUGGESTIONS,
    error: lastError,
    retry,
  };
}
