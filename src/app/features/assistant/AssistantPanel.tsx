import { CheckCircle2, Loader2, Mic, MicOff, Send, Sparkles, Square, ThumbsDown, ThumbsUp, Trash2, WifiOff, X } from "lucide-react";
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
import { useAssistant } from "./useAssistant";
import { useSpeechToText } from "./useSpeechToText";

interface AssistantPanelProps {
  open: boolean;
  onClose: () => void;
  route?: string;
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
    Record<string, { status: "pending" | "executing" | "done" | "error" | "rejected"; errorMessage?: string }>
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
        setActionStatus((prev) => ({ ...prev, [action.id]: { status: "done" } }));
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
      <div className="fixed inset-0 z-50 bg-black/30 sm:hidden" onClick={handleBackdropClick} aria-hidden="true" />

      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-x-0 bottom-0 z-[60] flex flex-col rounded-t-2xl bg-app-surface shadow-2xl sm:bottom-6 sm:left-auto sm:right-6 sm:inset-x-auto sm:w-[420px] sm:max-w-[calc(100vw-3rem)] sm:rounded-2xl"
        style={{ height: "min(80vh, 720px)" }}
        role="dialog"
        aria-modal="true"
        aria-label="Trợ lý AI"
      >
        <div className="flex justify-center py-2 sm:hidden">
          <div className="h-1.5 w-12 rounded-full bg-gray-300" />
        </div>

        <div className="flex h-14 items-center gap-3 border-b px-4">
          <span className="flex size-8 items-center justify-center rounded-full bg-app-accent text-white">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="font-semibold text-gray-900">Trợ lý</span>
          <div className="flex-1" />
          {messages.length > 0 ? (
            <button
              type="button"
              onClick={handleClearHistory}
              aria-label="Xóa lịch sử chat"
              className="rounded p-1 text-app-ink-soft transition-colors hover:bg-app-bg hover:text-app-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <Trash2 size={18} />
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded p-1 text-app-ink-soft transition-colors hover:bg-app-bg hover:text-app-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="flex flex-col gap-3">
              <div className="rounded-lg bg-app-bg px-3 py-2 text-sm text-app-ink-soft">
                Bạn có thể hỏi mình về việc hôm nay, tiến độ tuần này, mục tiêu chính, hoặc reflection.
              </div>
              <div className="flex flex-col gap-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion)}
                    disabled={isTyping}
                    className="rounded-full bg-app-bg px-3 py-1.5 text-left text-sm text-app-ink-soft transition-colors hover:bg-app-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex flex-col ${message.role === "user" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`min-w-[8rem] max-w-[90%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                      message.role === "user"
                        ? "rounded-br-sm bg-indigo-100 text-indigo-900"
                        : "rounded-bl-sm bg-app-bg text-gray-900"
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
                          onClick={() => submitFeedback(message.id, "down")}
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
                    </>
                  )}
                </div>
              ))}
              {isTyping ? (
                <div className="flex justify-start" role="status" aria-label="Trợ lý đang trả lời">
                  <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-app-bg px-3 py-2">
                    <div className="flex gap-1">
                      <span
                        className="h-2 w-2 animate-bounce rounded-full bg-gray-500"
                        style={{ animationDelay: "0ms" }}
                      />
                      <span
                        className="h-2 w-2 animate-bounce rounded-full bg-gray-500"
                        style={{ animationDelay: "150ms" }}
                      />
                      <span
                        className="h-2 w-2 animate-bounce rounded-full bg-gray-500"
                        style={{ animationDelay: "300ms" }}
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

        <div className="border-t p-3">
          <div className="relative">
            {isShowingCommands && (
              <div
                ref={dropdownRef}
                className="absolute bottom-full left-0 right-0 mb-2 max-h-60 overflow-y-auto rounded-lg border border-app-line bg-app-surface shadow-lg z-10"
              >
                {filteredCommands.map((cmd, idx) => (
                  <button
                    key={cmd.command}
                    type="button"
                    onClick={() => handleSelectCommand(cmd)}
                    onMouseEnter={() => setSelectedCommandIndex(idx)}
                    className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
                      idx === selectedCommandIndex ? "bg-indigo-50" : "hover:bg-app-bg"
                    }`}
                  >
                    <span className="font-mono text-indigo-600 text-xs">{cmd.command}</span>
                    <span className="text-app-ink-soft flex-1">{cmd.description}</span>
                  </button>
                ))}
              </div>
            )}
            {isSpeechListening && (
              <div className="px-1 py-1 text-xs text-indigo-500/80 italic animate-pulse">
                {interimTranscript ? `Đang nghe: ${interimTranscript}...` : "Đang lắng nghe..."}
              </div>
            )}
            {speechError && (
              <div className="px-1 py-1 text-xs text-red-500">
                {speechError}
              </div>
            )}
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={handleChange}
                onKeyDown={handleTextareaKeyDown}
                placeholder={isTyping ? "Đợi trợ lý xong rồi gõ nhé..." : "Nhập tin nhắn..."}
                rows={1}
                disabled={isTyping}
                className="flex-1 resize-none rounded-lg border border-app-line px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-app-bg disabled:text-app-ink-soft"
                style={{ maxHeight: "72px", minHeight: "36px" }}
              />
              {!isTyping && (
                <button
                  type="button"
                  disabled={!isSpeechSupported}
                  onClick={isSpeechListening ? stopSpeechListening : startSpeechListening}
                  className={`rounded-lg p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-40 ${
                    isSpeechListening
                      ? "bg-red-100 text-red-700 animate-pulse hover:bg-red-200"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
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
                  className="rounded-lg bg-red-50 p-2 text-red-700 transition-colors hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                  aria-label="Dừng"
                >
                  <Square size={18} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!inputText.trim()}
                  className="rounded-lg bg-indigo-600 p-2 text-white transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
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
