import { useCallback, useRef, useState } from "react";
import { buildAssistantContext, type AssistantContext } from "./buildAssistantContext";
import { sendAssistantMessageStream } from "./assistantApi";
import type { ChatHistoryMessage, Message } from "./types";

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

export function useAssistant(options?: UseAssistantOptions) {
  const route = options?.route ?? (typeof window !== "undefined" ? window.location.pathname : "/");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [lastError, setLastError] = useState<AssistantError | null>(null);
  const [lastUserText, setLastUserText] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    setMessages((prev) => [...prev, createMessage("user", trimmed)]);
    setLastUserText(trimmed);
    setIsTyping(true);
    setLastError(null);

    const messageId = crypto.randomUUID();
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

    abortControllerRef.current = new AbortController();

    try {
      const context: AssistantContext & { route: string } = {
        ...buildAssistantContext(),
        route,
      };

      const history: ChatHistoryMessage[] = messages
        .slice(-6)
        .map(m => ({ role: m.role, content: m.content }));

      await sendAssistantMessageStream(
        { message: trimmed, context, history },
        (delta) => {
          setMessages((prev) =>
            prev.map((message) =>
              message.id === messageId ? { ...message, content: message.content + delta } : message,
            ),
          );
        },
        abortControllerRef.current.signal,
      );

      setMessages((prev) =>
        prev.map((message) =>
          message.id === messageId ? { ...message, status: "complete" } : message,
        ),
      );
    } catch (error) {
      if (error && typeof error === "object" && "errorCode" in error && (error as { errorCode?: string }).errorCode === "ABORT_ERROR") {
        // User aborted, don't show error
        setMessages((prev) =>
          prev.map((message) =>
            message.id === messageId ? { ...message, status: "complete" } : message,
          ),
        );
      } else {
        const message = getErrorMessage(error);
        setLastError({
          message,
          errorCode: getErrorCode(error),
        });
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      }
    } finally {
      setIsTyping(false);
      abortControllerRef.current = null;
    }
  }, [isTyping, messages, route]);

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
    stopGeneration,
  };
}
