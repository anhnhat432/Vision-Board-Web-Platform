import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthContext } from "@/lib/auth/AuthContext";
import { sendAssistantMessageStream } from "./assistantApi";
import { captureAssistantFeedback } from "./assistantFeedback";
import { type AssistantContext, buildAssistantContext } from "./buildAssistantContext";
import { parseAssistantReply } from "./parseActions";
import type { ChatHistoryMessage, FeedbackEntry, FeedbackRating, Message } from "./types";

const SUGGESTIONS = [
  "Hôm nay tôi nên làm gì?",
  "Tóm tắt tuần này",
  "Mục tiêu chính của tôi là gì?",
  "Gợi ý reflection",
];

const MAX_PERSISTED = 30;
const MAX_FEEDBACK = 100;

interface PersistedHistory {
  userId: string | null;
  savedAt: number;
  messages: Message[];
}

interface AssistantTurnSnapshot {
  userMessage: string;
  context: AssistantContext & { route: string };
}

export interface AssistantError {
  message: string;
  errorCode?: string;
}

export interface UseAssistantOptions {
  route?: string;
}

function getStorageKey(userId: string | null): string {
  return `assistant.chat.history:${userId ?? "anon"}`;
}

function getOnboardKey(userId: string | null): string {
  return `assistant.onboarded:${userId ?? "anon"}`;
}

function getFeedbackStorageKey(userId: string | null): string {
  return `assistant.feedback:${userId ?? "anon"}`;
}

function getFeedbackMapStorageKey(userId: string | null): string {
  return `assistant.feedback.map:${userId ?? "anon"}`;
}

function getErrorMessage(error: unknown): string {
  const code = getErrorCode(error);
  if (code === "ASSISTANT_OFFLINE") {
    return "Bạn đang ngoại tuyến. Vui lòng kết nối mạng để tiếp tục sử dụng Trợ lý AI.";
  }
  if (code === "ASSISTANT_AUTH_ERROR") {
    return "Bạn cần đăng nhập tài khoản để sử dụng Trợ lý AI ở chế độ chính thức.";
  }
  if (code === "AI_PROVIDER_NOT_CONFIGURED" || code === "ASSISTANT_PROVIDER_NOT_CONFIGURED") {
    return "Dịch vụ AI chưa được cấu hình trên hệ thống. Vui lòng liên hệ quản trị viên.";
  }
  if (code === "AI_INTERNAL_ERROR" || code === "ASSISTANT_INTERNAL_ERROR") {
    return "Dịch vụ AI hiện không phản hồi. Vui lòng thử lại sau.";
  }
  if (code === "ASSISTANT_BACKEND_UNAVAILABLE" || code === "ASSISTANT_CONNECTION_ERROR") {
    return "Không thể kết nối với máy chủ backend. Vui lòng thử lại sau ít phút.";
  }

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

function createMessage(role: Message["role"], content: string, isWelcome?: boolean): Message {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: Date.now(),
    isWelcome,
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
  const feedback = message.feedback === "helpful" || message.feedback === "not_helpful" ? message.feedback : undefined;

  return {
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt,
    status,
    feedback,
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
      .filter((message) => message.content.trim() && message.status !== "streaming" && !message.isWelcome)
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
  const turnSnapshotsRef = useRef<Record<string, AssistantTurnSnapshot>>({});

  const [messageFeedback, setMessageFeedback] = useState<Record<string, FeedbackRating>>(() => {
    try {
      const raw = typeof localStorage !== "undefined" ? localStorage.getItem(getFeedbackMapStorageKey(userId)) : null;
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const [onboarded, setOnboarded] = useState<boolean>(() => {
    try {
      return typeof localStorage !== "undefined" ? localStorage.getItem(getOnboardKey(userId)) === "1" : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    setMessages(loadPersistedMessages(userId));
    setLastError(null);
    setLastUserText(null);
    setMessageFeedback(() => {
      try {
        const raw = typeof localStorage !== "undefined" ? localStorage.getItem(getFeedbackMapStorageKey(userId)) : null;
        return raw ? JSON.parse(raw) : {};
      } catch {
        return {};
      }
    });
    try {
      setOnboarded(localStorage.getItem(getOnboardKey(userId)) === "1");
    } catch {
      setOnboarded(false);
    }
  }, [userId]);

  useEffect(() => {
    if (onboarded || messages.length > 0) return;

    const welcomeMessage: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: `Chào bạn 👋 Mình là **Cú**, trợ lý 12-week của bạn trong Vision Board.

Mình có thể giúp bạn:
- Xem việc cần làm hôm nay
- Tóm tắt tiến độ tuần này
- Gợi ý reflection cuối tuần
- Giải thích các khái niệm như SMART, OKR, 12-week

Bạn cứ thoải mái hỏi mình bất cứ gì về kế hoạch của bạn.`,
      createdAt: Date.now(),
      status: "complete",
      isWelcome: true,
    };

    setMessages([welcomeMessage]);
    setOnboarded(true);
    try {
      localStorage.setItem(getOnboardKey(userId), "1");
    } catch {}
  }, [onboarded, messages.length, userId]);

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

  const send = useCallback(
    async (text: string) => {
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
        turnSnapshotsRef.current[messageId] = {
          userMessage: trimmed,
          context,
        };

        const history: ChatHistoryMessage[] = messages.slice(-6).map((m) => ({ role: m.role, content: m.content }));

        let finalContent = "";
        await sendAssistantMessageStream(
          { message: trimmed, context, history },
          (delta) => {
            finalContent += delta;
            setMessages((prev) =>
              prev.map((message) =>
                message.id === messageId ? { ...message, content: message.content + delta } : message,
              ),
            );
          },
          abortControllerRef.current.signal,
        );

        const parsed = parseAssistantReply(finalContent);
        setMessages((prev) =>
          prev.map((message) =>
            message.id === messageId
              ? { ...message, content: parsed.textContent, actions: parsed.actions, status: "complete" }
              : message,
          ),
        );
      } catch (error) {
        if (
          error &&
          typeof error === "object" &&
          "errorCode" in error &&
          (error as { errorCode?: string }).errorCode === "ABORT_ERROR"
        ) {
          // User aborted, don't show error
          setMessages((prev) =>
            prev.map((message) => (message.id === messageId ? { ...message, status: "complete" } : message)),
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
    },
    [isTyping, messages, route],
  );

  const retry = useCallback(() => {
    if (!lastUserText || isTyping) return;
    void send(lastUserText);
  }, [isTyping, lastUserText, send]);

  const clearHistory = useCallback(() => {
    setMessages([]);
    setLastError(null);
    setLastUserText(null);
    turnSnapshotsRef.current = {};
    try {
      localStorage.removeItem(getStorageKey(userId));
      localStorage.removeItem(getOnboardKey(userId));
      setOnboarded(false);
    } catch {}
  }, [userId]);

  const submitFeedback = useCallback(
    (messageId: string, rating: FeedbackRating) => {
      try {
        setMessages((prev) => {
          const targetIndex = prev.findIndex((message) => message.id === messageId);
          const target = prev[targetIndex];
          if (!target || target.role !== "assistant" || !target.content.trim()) return prev;

          const snapshot = turnSnapshotsRef.current[messageId];
          const previousUserMessage =
            [...prev.slice(0, targetIndex)].reverse().find((message) => message.role === "user")?.content ?? "";

          // Capture feedback via existing helper (keeps compatibility)
          const context = snapshot?.context ?? {
            ...buildAssistantContext(undefined, route),
            route,
          };

          captureAssistantFeedback({
            userId,
            route,
            rating: rating === "up" ? "helpful" : "not_helpful",
            userMessage: snapshot?.userMessage ?? previousUserMessage,
            assistantMessage: target.content,
            context,
          });

          // Save to new feedback storage with user-scoped key
          const entry: FeedbackEntry = {
            messageId,
            userText: snapshot?.userMessage ?? previousUserMessage,
            replyText: target.content,
            rating,
            timestamp: Date.now(),
            route,
          };

          if (typeof localStorage !== "undefined") {
            const raw = localStorage.getItem(getFeedbackStorageKey(userId));
            const entries: FeedbackEntry[] = raw ? JSON.parse(raw) : [];
            const nextEntries = [...entries, entry].slice(-MAX_FEEDBACK);
            localStorage.setItem(getFeedbackStorageKey(userId), JSON.stringify(nextEntries));

            // Update map for quick lookup
            const mapKey = getFeedbackMapStorageKey(userId);
            const rawMap = localStorage.getItem(mapKey);
            const map: Record<string, FeedbackRating> = rawMap ? JSON.parse(rawMap) : {};
            map[messageId] = rating;
            localStorage.setItem(mapKey, JSON.stringify(map));
          }

          setMessageFeedback((prevFeedback) => ({
            ...prevFeedback,
            [messageId]: rating,
          }));

          return prev.map((message) =>
            message.id === messageId ? { ...message, feedback: rating === "up" ? "helpful" : "not_helpful" } : message,
          );
        });
      } catch {
        // Silent fail for feedback storage
      }
    },
    [route, userId],
  );

  return {
    messages,
    setMessages,
    isTyping,
    send,
    suggestions: SUGGESTIONS,
    error: lastError,
    retry,
    stopGeneration,
    clearHistory,
    submitFeedback,
    messageFeedback,
  };
}
