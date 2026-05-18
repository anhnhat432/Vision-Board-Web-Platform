import { Send, X } from "lucide-react";
import { motion } from "motion/react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
} from "react";
import { OwlIcon } from "./OwlIcon";
import { useAssistant } from "./useAssistant";

interface AssistantPanelProps {
  open: boolean;
  onClose: () => void;
  route?: string;
}

export function AssistantPanel({ open, onClose, route }: AssistantPanelProps) {
  const { messages, isTyping, send, suggestions, error, retry } = useAssistant({ route });
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const handleSubmit = () => {
    const trimmed = inputText.trim();
    if (!trimmed || isTyping) return;
    void send(trimmed);
    setInputText("");
    window.requestAnimationFrame(resizeTextarea);
  };

  const handleTextareaKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(event.target.value);
    window.requestAnimationFrame(resizeTextarea);
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (isTyping) return;
    void send(suggestion);
  };

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/30 sm:hidden"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-x-0 bottom-0 z-[60] flex flex-col rounded-t-2xl bg-white shadow-2xl sm:bottom-6 sm:left-auto sm:right-6 sm:inset-x-auto sm:w-[420px] sm:max-w-[calc(100vw-3rem)] sm:rounded-2xl"
        style={{ height: "min(80vh, 720px)" }}
        role="dialog"
        aria-modal="true"
        aria-label="Trợ lý AI"
      >
        <div className="flex justify-center py-2 sm:hidden">
          <div className="h-1.5 w-12 rounded-full bg-gray-300" />
        </div>

        <div className="flex h-14 items-center gap-3 border-b px-4">
          <OwlIcon size={32} />
          <span className="font-semibold text-gray-900">Trợ lý</span>
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="flex flex-col gap-3">
              <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
                Bạn có thể hỏi mình về việc hôm nay, tiến độ tuần này, mục tiêu chính, hoặc reflection.
              </div>
              <div className="flex flex-col gap-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion)}
                    disabled={isTyping}
                    className="rounded-full bg-gray-50 px-3 py-1.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
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
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`min-w-[8rem] max-w-[90%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                      message.role === "user"
                        ? "rounded-br-sm bg-indigo-100 text-indigo-900"
                        : "rounded-bl-sm bg-gray-100 text-gray-900"
                    }`}
                  >
                    <span className="whitespace-pre-line break-words">
                      {message.content}
                      {message.status === "streaming" ? (
                        <span className="ml-0.5 inline-block h-4 w-1 translate-y-0.5 animate-pulse rounded-full bg-current" />
                      ) : null}
                    </span>
                  </div>
                </div>
              ))}
              {isTyping ? (
                <div className="flex justify-start" role="status" aria-label="Trợ lý đang trả lời">
                  <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-gray-100 px-3 py-2">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-gray-500" style={{ animationDelay: "0ms" }} />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-gray-500" style={{ animationDelay: "150ms" }} />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-gray-500" style={{ animationDelay: "300ms" }} />
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

        <div className="border-t p-3">
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={handleChange}
              onKeyDown={handleTextareaKeyDown}
              placeholder="Nhập tin nhắn..."
              rows={1}
              className="flex-1 resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              style={{ maxHeight: "72px", minHeight: "36px" }}
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!inputText.trim() || isTyping}
              className="rounded-lg bg-indigo-600 p-2 text-white transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Gửi"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
