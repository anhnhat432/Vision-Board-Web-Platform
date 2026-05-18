import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthContext } from "@/lib/auth/AuthContext";
import { buildAssistantContext, type AssistantContext } from "./buildAssistantContext";
import { sendAssistantMessageStream } from "./assistantApi";
import type { ChatHistoryMessage, Message } from "./types";

const SUGGESTIONS = [
  "Hôm nay tôi nên làm gì?",
  "Tóm tắt tuần này",
  "Mục tiêu chính của tôi là gì?",
  "Gợi ý reflection",
];

const MAX_PERSISTED = 30;

interface PersistedHistory {
  userId: string | null;
  savedAt: number;
  messages: Message[];
}

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

function getStorageKey(userId: string | null): string {
  return `assistant.chat.history:${userId ?? "anon"}`;
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

function loadPersistedMessages(userId: string | null): Message[] {
  if (typeof localStorage === "undefined") return [];

  const key = getStorageKey(userId);

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as Partial<PersistedHistory>;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return [];

    if (parsed.userId !== userId) {
      localStorage.removeItem(key);
      return [];
    }

    if (typeof parsed.savedAt !== "number" || !Number.isFinite(parsed.savedAt)) return [];
    if (!Array.isArray(parsed.messages)) return [];

    return parsed.messages
      .map(normalizePersistedMessage)
      .filter((message): message is Message => message !== null)
      .slice(-MAX_PERSISTED);
  } catch {
    return [];
  }
}

function savePersistedMessages(messages: Message[], userId: string | null): void {
  if (typeof localStorage === "undefined") return;

  try {
    const persisted = messages
      .filter((message) => message.content.trim() && message.status !== "streaming")
      .slice(-MAX_PERSISTED);
    const key = getStorageKey(userId);
    if (persisted.length === 0) {
      localStorage.removeItem(key);
      return;
    }

    const payload: PersistedHistory = {
      userId,
      savedAt: Date.now(),
      messages: persisted,
    };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {}
}

export function useAssistant(options?: UseAssistantOptions) {
  const route = options?.route ?? (typeof window !== "undefined" ? window.location.pathname : "/");
  const { user } = useAuthContext();
  const userId = user?.uid ?? null;
  const [messages, setMessages] = useState<Message[]>(() => loadPersistedMessages(userId));
  const [isTyping, setIsTyping] = useState(false);
  const [lastError, setLastError] = useState<AssistantError | null>(null);
  const [lastUserText, setLastUserText] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setMessages(loadPersistedMessages(userId));
    setLastError(null);
    setLastUserText(null);
  }, [userId]);

  useEffect(() => {
    if (isTyping) return undefined;

    const id = window.setTimeout(() => savePersistedMessages(messages, userId), 300);
    return () => window.clearTimeout(id);
  }, [messages, isTyping, userId]);

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
        ...buildAssistantContext(undefined, route),
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
      localStorage.removeItem(getStorageKey(userId));
    } catch {}
  }, [userId]);

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
