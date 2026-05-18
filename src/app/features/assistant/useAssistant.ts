import { useCallback, useEffect, useRef, useState } from "react";
import { buildAssistantContext, type AssistantContext } from "./buildAssistantContext";
import { sendAssistantMessageStream } from "./assistantApi";
import type { ChatHistoryMessage, Message } from "./types";

const SUGGESTIONS = [
  "Hôm nay tôi nên làm gì?",
  "Tóm tắt tuần này",
  "Mục tiêu chính của tôi là gì?",
  "Gợi ý reflection",
];

const STORAGE_KEY = "assistant.chat.history";
const MAX_PERSISTED = 30;

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

function normalizePersistedMessage(value: unknown): Message | null {
  if (!value || typeof value !== "object") return null;

  const message = value as Partial<Message>;
  if (typeof message.id !== "string" || !message.id.trim()) return null;
  if (message.role !== "user" && message.role !== "assistant") return null;
  if (typeof message.content !== "string" || !message.content.trim()) return null;
  if (typeof message.createdAt !== "number" || !Number.isFinite(message.createdAt)) return null;

  const status = message.status === "streaming" || message.status === "complete" ? "complete" : undefined;

  return {
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt,
    status,
  };
}

function loadPersistedMessages(): Message[] {
  if (typeof localStorage === "undefined") return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map(normalizePersistedMessage)
      .filter((message): message is Message => message !== null)
      .slice(-MAX_PERSISTED);
  } catch {
    return [];
  }
}

function savePersistedMessages(messages: Message[]): void {
  if (typeof localStorage === "undefined") return;

  try {
    const persisted = messages
      .filter((message) => message.content.trim() && message.status !== "streaming")
      .slice(-MAX_PERSISTED);
    if (persisted.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  } catch {}
}

export function useAssistant(options?: UseAssistantOptions) {
  const route = options?.route ?? (typeof window !== "undefined" ? window.location.pathname : "/");
  const [messages, setMessages] = useState<Message[]>(loadPersistedMessages);
  const [isTyping, setIsTyping] = useState(false);
  const [lastError, setLastError] = useState<AssistantError | null>(null);
  const [lastUserText, setLastUserText] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (isTyping) return undefined;

    const id = window.setTimeout(() => savePersistedMessages(messages), 300);
    return () => window.clearTimeout(id);
  }, [messages, isTyping]);

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

  const clearHistory = useCallback(() => {
    setMessages([]);
    setLastError(null);
    setLastUserText(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  return {
    messages,
    isTyping,
    send,
    suggestions: SUGGESTIONS,
    error: lastError,
    retry,
    stopGeneration,
    clearHistory,
  };
}
