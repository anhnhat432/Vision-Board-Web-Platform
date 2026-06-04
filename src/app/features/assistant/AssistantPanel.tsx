import {
  CheckCircle2,
  Loader2,
  Mic,
  MicOff,
  Send,
  Sparkles,
  Square,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  WifiOff,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import {
  type ChangeEvent,
  type MouseEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { isRealMode } from "@/app/utils/app-mode";
import { useOptionalAutoCloudSyncContext } from "@/features/plan12week/hooks/AutoCloudSyncProvider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import { AssistantActionCard } from "./AssistantActionCard";
import { AssistantMessageContent } from "./AssistantMessageContent";
import { executeAction } from "./executeAction";
import type { AssistantAction } from "./parseActions";
import { filterCommands, getHelpMessage, type SlashCommand } from "./slashCommands";
import type { FeedbackReason } from "./types";
import { useAssistant } from "./useAssistant";
import { useSpeechToText } from "./useSpeechToText";

interface AssistantPanelProps {
  open: boolean;
  onClose: () => void;
  route?: string;
}

const FEEDBACK_REASON_VALUES: FeedbackReason[] = [
  "wrong_action",
  "wrong_context",
  "too_long",
  "too_generic",
  "unsafe",
  "other",
];

function normalizeFeedbackReason(value: string): FeedbackReason {
  return FEEDBACK_REASON_VALUES.includes(value as FeedbackReason) ? (value as FeedbackReason) : "other";
}

export function AssistantPanel({ open, onClose, route }: AssistantPanelProps) {
  const {
    messages,
    setMessages,
    isTyping,
    send,
    suggestions,
    error,
    retry,
    stopGeneration,
    clearHistory,
    submitFeedback,
    messageFeedback,
  } = useAssistant({ route });
  const [inputText, setInputText] = useState("");
  const [activeFeedbackMessageId, setActiveFeedbackMessageId] = useState<string | null>(null);
  const [feedbackReason, setFeedbackReason] = useState<FeedbackReason>("other");
  const [feedbackCorrection, setFeedbackCorrection] = useState("");

  const handleSpeechFinalResult = useCallback((text: string) => {
    setInputText((prev) => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed} ${text}` : text;
    });
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 72)}px`;
      }
    }, 50);
  }, []);

  const {
    isSupported: isSpeechSupported,
    isListening: isSpeechListening,
    interimTranscript,
    error: speechError,
    startListening: startSpeechListening,
    stopListening: stopSpeechListening,
  } = useSpeechToText({
    onFinalResult: handleSpeechFinalResult,
  });

  const [isClearHistoryOpen, setIsClearHistoryOpen] = useState(false);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [actionStatus, setActionStatus] = useState<
    Record<string, { status: "pending" | "executing" | "done" | "error" | "rejected"; errorMessage?: string; verified?: boolean; alreadyDone?: boolean }>
  >({});
  const syncState = useOptionalAutoCloudSyncContext();
  const realMode = isRealMode();

  const [showSyncSuccess, setShowSyncSuccess] = useState(false);
  const prevSyncingRef = useRef(false);
  const prevPendingCountRef = useRef(0);

  useEffect(() => {
    if (!syncState) return;
    const wasSyncing = prevSyncingRef.current;
    const wasPending = prevPendingCountRef.current > 0;

    if ((wasSyncing || wasPending) && !syncState.syncing && syncState.pendingCount === 0 && syncState.online) {
      setShowSyncSuccess(true);
      const timer = setTimeout(() => {
        setShowSyncSuccess(false);
      }, 3000);
      return () => clearTimeout(timer);
    }

    prevSyncingRef.current = syncState.syncing;
    prevPendingCountRef.current = syncState.pendingCount;
  }, [syncState?.syncing, syncState?.pendingCount, syncState?.online, syncState]);

  const renderSyncStatus = () => {
    if (!syncState || !realMode) return null;

    if (!syncState.online) {
      return (
        <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-amber-600 bg-amber-50 border-t border-amber-100/60 transition-all duration-300">
          <WifiOff size={12} className="shrink-0" />
          <span>Đang chạy ngoại tuyến. Dữ liệu đã lưu cục bộ trên máy.</span>
        </div>
      );
    }

    if (syncState.syncing) {
      return (
        <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-indigo-600 bg-indigo-50 border-t border-indigo-100/60 transition-all duration-300">
          <Loader2 size={12} className="shrink-0 animate-spin" />
          <span>Đang đồng bộ thay đổi lên đám mây...</span>
        </div>
      );
    }

    if (showSyncSuccess) {
      return (
        <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-green-600 bg-green-50 border-t border-green-100/60 transition-all duration-300 animate-in fade-in slide-in-from-bottom-1 duration-200">
          <CheckCircle2 size={12} className="shrink-0" />
          <span>Đã lưu và đồng bộ thành công lên tài khoản!</span>
        </div>
      );
    }

    return null;
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const trimmedInput = inputText.trim();
  const filteredCommands = filterCommands(trimmedInput);
  const isShowingCommands = trimmedInput.startsWith("/") && filteredCommands.length > 0;

  const handleExecuteAction = useCallback(async (action: AssistantAction) => {
    setActionStatus((prev) => ({ ...prev, [action.id]: { status: "executing" } }));
    try {
      const result = await executeAction(action);
      if (result.success) {
        setActionStatus((prev) => ({
          ...prev,
          [action.id]: {
            status: "done",
            verified: result.verified,
            alreadyDone: result.alreadyDone,
          },
        }));
      } else {
        setActionStatus((prev) => ({ ...prev, [action.id]: { status: "error", errorMessage: result.message } }));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setActionStatus((prev) => ({ ...prev, [action.id]: { status: "error", errorMessage } }));
    }
  }, []);

  const handleRejectAction = useCallback((action: AssistantAction) => {
    setActionStatus((prev) => ({ ...prev, [action.id]: { status: "rejected" } }));
  }, []);

  const resizeTextarea = useCallback(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 72)}px`;
  }, []);

  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === "function") {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  });

  useEffect(() => {
    if (!open || !textareaRef.current) return;
    textareaRef.current.focus();
    resizeTextarea();
  }, [open, resizeTextarea]);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const handleSubmit = useCallback(() => {
    const trimmed = inputText.trim();
    if (!trimmed || isTyping) return;
    void send(trimmed);
    setInputText("");
    window.requestAnimationFrame(resizeTextarea);
  }, [inputText, isTyping, resizeTextarea, send]);

  const handleSelectCommand = useCallback(
    (cmd: SlashCommand) => {
      if (cmd.action === "clear") {
        clearHistory();
        setInputText("");
        textareaRef.current?.focus();
      } else if (cmd.action === "help") {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: getHelpMessage(),
            createdAt: Date.now(),
            status: "complete",
          },
        ]);
        setInputText("");
        textareaRef.current?.focus();
      } else if (cmd.action === "audit") {
        let content = "**Nhật ký hành động (Audit Log):**\n\n";
        try {
          const raw = localStorage.getItem("assistant.action_audit_log");
          const logs = raw ? JSON.parse(raw) : [];
          if (!Array.isArray(logs) || logs.length === 0) {
            content += "*Chưa có hành động nào được thực hiện.*";
          } else {
            const recentLogs = logs.slice(0, 10);
            content += recentLogs
              .map((log: { success: boolean; timestamp: string; label: string; type: string; message: string }) => {
                const icon = log.success ? "✅" : "❌";
                const time = new Date(log.timestamp).toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                });
                return `${icon} **[${time}]** ${log.label || log.type} - *${log.message}*`;
              })
              .join("\n");
          }
        } catch {
          content += "*Lỗi khi đọc nhật ký hành động.*";
        }

        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content,
            createdAt: Date.now(),
            status: "complete",
          },
        ]);
        setInputText("");
        textareaRef.current?.focus();
      } else if (cmd.promptText) {
        const prompt = cmd.promptText;
        setInputText(prompt);
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(prompt.length, prompt.length);
          }
        }, 0);
      }
    },
    [clearHistory, setMessages],
  );

  const handleKeyDownWithCommands = useCallback(
    (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
      if (isShowingCommands) {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          setSelectedCommandIndex((prev) => (prev + 1) % filteredCommands.length);
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          setSelectedCommandIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
        } else if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          handleSelectCommand(filteredCommands[selectedCommandIndex]);
        } else if (event.key === "Escape") {
          event.preventDefault();
          setInputText("");
        } else if (event.key === "Tab") {
          event.preventDefault();
          handleSelectCommand(filteredCommands[selectedCommandIndex]);
        }
        return;
      }

      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        handleSubmit();
      }
    },
    [isShowingCommands, filteredCommands, selectedCommandIndex, handleSelectCommand, handleSubmit],
  );

  const handleTextareaKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
      handleKeyDownWithCommands(event);
    },
    [handleKeyDownWithCommands],
  );

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(event.target.value);
    setSelectedCommandIndex(0);
    window.requestAnimationFrame(resizeTextarea);
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (isTyping) return;
    void send(suggestion);
  };

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  const handleClearHistory = () => {
    setIsClearHistoryOpen(true);
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 sm:hidden" onClick={handleBackdropClick} aria-hidden="true" />

      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-x-0 bottom-0 z-[60] flex flex-col border border-app-line/45 dark:border-white/10 rounded-t-3xl bg-app-surface/85 backdrop-blur-2xl shadow-[0_24px_60px_rgba(0,0,0,0.18)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.38)] sm:bottom-6 sm:left-auto sm:right-6 sm:inset-x-auto sm:w-[420px] sm:max-w-[calc(100vw-3rem)] sm:rounded-3xl transition-all duration-300"
        style={{ height: "min(80vh, 720px)" }}
        role="dialog"
        aria-modal="true"
        aria-label="Trợ lý AI"
      >
        <div className="flex justify-center py-2 sm:hidden">
          <div className="h-1.5 w-12 rounded-full bg-gray-300" />
        </div>

        <div className="flex h-15 items-center gap-3 border-b border-app-line/45 dark:border-white/10 px-4 bg-gradient-to-r from-app-bg-subtle/40 via-app-bg-subtle/10 to-transparent">
          <span className="flex size-8.5 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.3)]">
            <Sparkles className="h-4.5 w-4.5 animate-pulse" strokeWidth={2.2} />
          </span>
          <div className="flex flex-col">
            <span className="font-serif text-[15px] font-extrabold tracking-wide bg-gradient-to-r from-emerald-600 to-teal-700 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent">Trợ lý Cú AI</span>
            <div className="flex items-center gap-1">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-[ping_1.8s_ease-in-out_infinite] absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]"></span>
              </span>
              <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Trực tuyến</span>
            </div>
          </div>
          <div className="flex-1" />
          {messages.length > 0 ? (
            <button
              type="button"
              onClick={handleClearHistory}
              aria-label="Xóa lịch sử chat"
              className="rounded-lg p-1.5 text-app-ink-soft transition-all hover:bg-app-bg hover:text-app-ink hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
            >
              <Trash2 size={16} />
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-lg p-1.5 text-app-ink-soft transition-all hover:bg-app-bg hover:text-app-ink hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="flex flex-col gap-3">
              <div className="rounded-xl bg-app-bg-subtle px-3.5 py-2.5 text-sm text-app-ink-soft border border-app-line/40">
                Bạn có thể hỏi mình về việc hôm nay, tiến độ tuần này, mục tiêu chính, hoặc reflection.
              </div>
              <div className="flex flex-col gap-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion)}
                    disabled={isTyping}
                    className="rounded-xl border border-app-line/60 bg-app-bg-subtle/50 px-3.5 py-2 text-left text-sm text-app-ink-soft transition-all duration-200 hover:bg-app-accent/15 hover:text-app-accent hover:border-app-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {messages.map((message) => {
                if (message.role === "assistant" && message.status === "streaming" && !message.content.trim()) {
                  return null;
                }
                return (
                  <div
                    key={message.id}
                    className={`flex flex-col ${message.role === "user" ? "items-end" : "items-start"}`}
                  >
                  <div
                    className={`min-w-[8rem] max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm transition-all duration-300 hover:translate-y-[-1px] ${
                      message.role === "user"
                        ? "rounded-tr-none bg-gradient-to-tr from-emerald-500 via-emerald-600 to-teal-600 text-white font-medium shadow-[0_4px_12px_rgba(16,185,129,0.18)]"
                        : "rounded-tl-none bg-app-bg-subtle/55 dark:bg-white/5 backdrop-blur-md border border-app-line/35 dark:border-white/5 text-app-ink"
                    }`}
                  >
                    {message.role === "user" ? (
                      <span className="whitespace-pre-line break-words">
                        {message.content}
                        {message.status === "streaming" ? (
                          <span className="ml-0.5 inline-block h-4 w-1 translate-y-0.5 animate-pulse rounded-full bg-current" />
                        ) : null}
                      </span>
                    ) : (
                      <AssistantMessageContent content={message.content} status={message.status} />
                    )}
                  </div>
                  {message.role === "assistant" && message.status !== "streaming" && !message.isWelcome && (
                    <>
                      {message.actions && message.actions.length > 0 && (
                        <div className="mt-2 w-full">
                          {message.actions.map((action) => (
                            <AssistantActionCard
                              key={action.id}
                              action={action}
                              onExecute={handleExecuteAction}
                              onReject={handleRejectAction}
                              status={actionStatus[action.id]?.status ?? "pending"}
                              errorMessage={actionStatus[action.id]?.errorMessage}
                              verified={actionStatus[action.id]?.verified}
                              alreadyDone={actionStatus[action.id]?.alreadyDone}
                            />
                          ))}
                        </div>
                      )}
                      <div className="mt-1 flex gap-1 pl-1">
                        <button
                          type="button"
                          onClick={() => submitFeedback(message.id, "up")}
                          aria-label="Phản hồi tốt"
                          className={`rounded p-1 text-xs transition ${
                            messageFeedback[message.id] === "up"
                              ? "bg-green-100 text-green-700"
                              : "text-gray-400 hover:bg-app-bg hover:text-app-ink-soft"
                          }`}
                          disabled={messageFeedback[message.id] === "up"}
                        >
                          <ThumbsUp size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveFeedbackMessageId(activeFeedbackMessageId === message.id ? null : message.id);
                            setFeedbackReason("other");
                            setFeedbackCorrection("");
                          }}
                          aria-label="Phản hồi tệ"
                          className={`rounded p-1 text-xs transition ${
                            messageFeedback[message.id] === "down"
                              ? "bg-red-100 text-red-700"
                              : "text-gray-400 hover:bg-app-bg hover:text-app-ink-soft"
                          }`}
                          disabled={messageFeedback[message.id] === "down"}
                        >
                          <ThumbsDown size={14} />
                        </button>
                      </div>

                      {activeFeedbackMessageId === message.id && (
                        <div className="mt-2 rounded-lg border border-red-200 bg-red-50/50 p-2 text-xs">
                          <div className="font-semibold text-app-ink mb-1">Gửi phản hồi chi tiết:</div>
                          <label className="block text-gray-600 mb-1">
                            Lý do:
                            <select
                              value={feedbackReason}
                              onChange={(e) => setFeedbackReason(normalizeFeedbackReason(e.target.value))}
                              className="ml-1 rounded border border-gray-300 bg-white p-1 text-xs"
                            >
                              <option value="other">Lý do khác</option>
                              <option value="too_long">Trả lời quá dài / rườm rà</option>
                              <option value="wrong_action">Đề xuất sai hành động</option>
                              <option value="wrong_context">Hiểu sai ngữ cảnh hiện tại</option>
                              <option value="too_generic">Lời khuyên chung chung</option>
                              <option value="unsafe">Nội dung không an toàn</option>
                            </select>
                          </label>
                          <label className="block text-gray-600 mb-2">
                            Ý kiến sửa đổi (tối đa 300 ký tự):
                            <textarea
                              value={feedbackCorrection}
                              onChange={(e) => setFeedbackCorrection(e.target.value.slice(0, 300))}
                              placeholder="Nên trả lời như thế nào..."
                              rows={2}
                              className="mt-1 w-full rounded border border-gray-300 bg-white p-1 text-xs resize-none"
                            />
                          </label>
                          <div className="flex gap-2 justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveFeedbackMessageId(null);
                                // Vẫn submit thumbs down nếu người dùng bấm Hủy sau khi mở form
                                setFeedbackReason("other");
                                setFeedbackCorrection("");
                                submitFeedback(message.id, "down");
                              }}
                              className="rounded px-2 py-1 bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
                            >
                              Hủy
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                submitFeedback(message.id, "down", {
                                  reason: feedbackReason,
                                  correction: feedbackCorrection,
                                });
                                setActiveFeedbackMessageId(null);
                                setFeedbackReason("other");
                                setFeedbackCorrection("");
                              }}
                              className="rounded px-2 py-1 bg-red-600 text-white hover:bg-red-700 transition"
                            >
                              Gửi
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
              {isTyping ? (
                <div className="flex justify-start" role="status" aria-label="Trợ lý đang trả lời">
                  <div className="max-w-[80%] rounded-2xl rounded-bl-none bg-app-bg-subtle/55 dark:bg-white/5 backdrop-blur-md border border-app-line/35 dark:border-white/5 px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 animate-[bounce_1.4s_infinite_ease-in-out] rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500"
                        style={{ animationDelay: "-0.32s" }}
                      />
                      <span
                        className="h-2 w-2 animate-[bounce_1.4s_infinite_ease-in-out] rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500"
                        style={{ animationDelay: "-0.16s" }}
                      />
                      <span
                        className="h-2 w-2 animate-[bounce_1.4s_infinite_ease-in-out] rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500"
                      />
                    </div>
                  </div>
                </div>
              ) : null}
              {error && !isTyping ? (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-red-50 px-3 py-2 text-sm text-red-700">
                    <p>{error.message}</p>
                    <button
                      type="button"
                      onClick={retry}
                      className="mt-1 text-xs font-medium underline hover:text-red-800"
                    >
                      Thử lại
                    </button>
                  </div>
                </div>
              ) : null}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {renderSyncStatus()}

        <div className="border-t border-app-line/45 dark:border-white/10 p-3 bg-gradient-to-t from-app-bg-subtle/40 via-app-bg-subtle/10 to-transparent">
          <div className="relative">
            {isShowingCommands && (
              <div
                ref={dropdownRef}
                className="absolute bottom-full left-0 right-0 mb-2 max-h-60 overflow-y-auto rounded-xl border border-app-line/80 bg-app-surface/95 backdrop-blur-xl shadow-app-xl z-10"
              >
                {filteredCommands.map((cmd, idx) => (
                  <button
                    key={cmd.command}
                    type="button"
                    onClick={() => handleSelectCommand(cmd)}
                    onMouseEnter={() => setSelectedCommandIndex(idx)}
                    className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
                      idx === selectedCommandIndex ? "bg-app-accent/10 text-app-accent font-medium" : "hover:bg-app-bg-subtle"
                    }`}
                  >
                    <span className="font-mono text-app-accent text-xs bg-app-accent-soft px-1.5 py-0.5 rounded">{cmd.command}</span>
                    <span className="text-app-ink-soft flex-1">{cmd.description}</span>
                  </button>
                ))}
              </div>
            )}
            {isSpeechListening && (
              <div className="px-1 py-1 text-xs text-app-accent italic animate-pulse font-medium">
                {interimTranscript ? `Đang nghe: ${interimTranscript}...` : "Đang lắng nghe..."}
              </div>
            )}
            {speechError && <div className="px-1 py-1 text-xs text-red-500 font-medium">{speechError}</div>}
            <div className="flex items-end gap-2 p-1.5 bg-app-bg-subtle/45 dark:bg-black/20 border border-app-line/50 dark:border-white/10 rounded-xl focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500/40 focus-within:shadow-[0_0_20px_rgba(16,185,129,0.08)] transition-all duration-300">
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={handleChange}
                onKeyDown={handleTextareaKeyDown}
                placeholder={isTyping ? "Đợi trợ lý xong rồi gõ nhé..." : "Nhập tin nhắn..."}
                rows={1}
                disabled={isTyping}
                className="flex-1 resize-none bg-transparent border-0 px-2 py-1 text-sm focus:outline-none focus:ring-0 text-app-ink placeholder:text-app-ink-muted disabled:cursor-not-allowed"
                style={{ maxHeight: "72px", minHeight: "36px" }}
              />
              {!isTyping && (
                <button
                  type="button"
                  disabled={!isSpeechSupported}
                  onClick={isSpeechListening ? stopSpeechListening : startSpeechListening}
                  className={`rounded-lg p-2 transition-all hover:scale-110 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-40 ${
                    isSpeechListening
                      ? "bg-red-100 text-red-700 animate-pulse hover:bg-red-200"
                      : "bg-app-bg-subtle text-app-ink-soft hover:bg-app-bg hover:text-app-ink"
                  }`}
                  title={
                    !isSpeechSupported
                      ? "Trình duyệt này không hỗ trợ nhập giọng nói"
                      : isSpeechListening
                        ? "Dừng nghe giọng nói"
                        : "Nhập bằng giọng nói (tiếng Việt)"
                  }
                  aria-label={
                    !isSpeechSupported
                      ? "Trình duyệt không hỗ trợ"
                      : isSpeechListening
                        ? "Dừng nghe"
                        : "Nhập bằng giọng nói"
                  }
                >
                  {isSpeechListening ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
              )}
              {isTyping ? (
                <button
                  type="button"
                  onClick={stopGeneration}
                  className="rounded-lg bg-red-50 dark:bg-red-950/30 p-2 text-red-700 dark:text-red-400 shadow-sm transition-all hover:scale-110 active:scale-90 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                  aria-label="Dừng"
                >
                  <Square size={18} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!inputText.trim()}
                  className="rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-600 p-2 text-white shadow-sm transition-all hover:scale-110 active:scale-90 hover:shadow-[0_0_12px_rgba(16,185,129,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Gửi"
                >
                  <Send size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <AlertDialog open={isClearHistoryOpen} onOpenChange={setIsClearHistoryOpen}>
        <AlertDialogContent className="surface-elevated rounded-2xl border border-app-line bg-app-surface shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-app-ink">Xóa lịch sử chat?</AlertDialogTitle>
            <AlertDialogDescription className="text-app-ink-soft">
              Hành động này sẽ xóa toàn bộ lịch sử tin nhắn của bạn với Trợ lý AI trên thiết bị này.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-app-line bg-app-surface text-app-ink hover:bg-app-bg">
              Quay lại
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-[color:var(--color-danger-fg)] text-white hover:bg-[color:var(--color-danger-fg)] hover:opacity-90 animate-none duration-0"
              onClick={() => {
                clearHistory();
                setIsClearHistoryOpen(false);
              }}
            >
              Xóa lịch sử
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
