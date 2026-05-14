import { Copy, MessageSquareText, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { AnalyticsSource } from "../utils/analytics";
import {
  type DemoFeedbackCategory,
  type DemoFeedbackContext,
  type DemoFeedbackRating,
  formatDemoFeedbackForCopy,
  submitDemoFeedback,
} from "../utils/demo-feedback";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

interface FeedbackDialogProps {
  source: Extract<AnalyticsSource, "dashboard" | "settings" | "12_week_system">;
  context: DemoFeedbackContext;
  triggerLabel?: string;
  triggerClassName?: string;
}

const RATING_VALUES: DemoFeedbackRating[] = [1, 2, 3, 4, 5];

const CATEGORY_OPTIONS: Array<{ value: DemoFeedbackCategory; label: string }> = [
  { value: "core_flow", label: "Luồng chính" },
  { value: "life_balance", label: "Cân bằng cuộc sống" },
  { value: "smart_goal", label: "Mục tiêu SMART" },
  { value: "twelve_week_setup", label: "Setup 12 tuần" },
  { value: "today_tasks", label: "Việc hôm nay" },
  { value: "weekly_review", label: "Review tuần" },
  { value: "mock_billing", label: "Nâng cấp Plus" },
  { value: "local_data", label: "Lưu dữ liệu" },
  { value: "other", label: "Khác" },
];

export function FeedbackDialog({
  source,
  context,
  triggerLabel = "Góp ý",
  triggerClassName,
}: FeedbackDialogProps) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState<DemoFeedbackRating | null>(null);
  const [feedbackCategory, setFeedbackCategory] = useState<DemoFeedbackCategory>("core_flow");
  const [confusingText, setConfusingText] = useState("");
  const [nextHelpText, setNextHelpText] = useState("");
  const [copyText, setCopyText] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = rating !== null && confusingText.trim().length > 0;

  const resetForm = () => {
    setRating(null);
    setFeedbackCategory("core_flow");
    setConfusingText("");
    setNextHelpText("");
    setCopyText("");
    setSubmitted(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) resetForm();
  };

  const handleSubmit = () => {
    if (!rating || !canSubmit) return;

    const result = submitDemoFeedback({
      source,
      context,
      rating,
      feedbackCategory,
      confusingText,
      nextHelpText,
    });

    setCopyText(formatDemoFeedbackForCopy(result.record));
    setSubmitted(true);

    toast.success("Đã lưu góp ý trên thiết bị này.", {
      description: result.savedLocally
        ? "Nội dung góp ý chỉ dùng để cải thiện trải nghiệm, không cần gắn với tài khoản."
        : "Không lưu được góp ý cục bộ, nhưng app không gửi nội dung chi tiết ra công cụ phân tích ngoài.",
    });
  };

  const handleCopy = async () => {
    if (!copyText || typeof navigator === "undefined" || !navigator.clipboard) return;

    try {
      await navigator.clipboard.writeText(copyText);
      toast.success("Đã sao chép góp ý.");
    } catch {
      toast.error("Không thể sao chép tự động.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button type="button" variant="outline" size="sm" className={triggerClassName} onClick={() => setOpen(true)}>
        <MessageSquareText className="h-4 w-4" />
        {triggerLabel}
      </Button>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Góp ý nhanh</DialogTitle>
          <DialogDescription>
            Nội dung bạn nhập chỉ được lưu trên thiết bị này; công cụ phân tích ngoài chỉ nhận điểm chấm và nhóm góp ý.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="space-y-4">
            <div className="rounded-[var(--r-card)] border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm leading-6 text-emerald-900">
              Cảm ơn bạn. Góp ý đã được ghi nhận trên thiết bị này.
            </div>
            <div className="rounded-[var(--r-card)] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
              Nếu muốn gửi lại qua kênh riêng, bạn có thể sao chép nội dung vừa nhập. App không yêu cầu email và không
              bắt buộc kết nối tài khoản.
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCopy} disabled={!copyText}>
                <Copy className="h-4 w-4" />
                Sao chép góp ý
              </Button>
              <Button type="button" onClick={() => handleOpenChange(false)}>
                Đóng
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-5">
            <fieldset className="space-y-2">
              <legend id="feedback-rating-label" className="text-sm leading-5 font-medium tracking-normal">
                Bạn chấm trải nghiệm này mấy điểm?
              </legend>
              <div className="grid grid-cols-5 gap-2">
                {RATING_VALUES.map((value) => (
                  <Button
                    key={value}
                    type="button"
                    variant={rating === value ? "default" : "outline"}
                    className="h-10 rounded-[var(--r-control)] px-0"
                    aria-pressed={rating === value}
                    aria-label={`${value} điểm`}
                    onClick={() => setRating(value)}
                  >
                    {value}
                  </Button>
                ))}
              </div>
            </fieldset>

            <fieldset className="space-y-2">
              <legend id="feedback-category-label" className="text-sm leading-5 font-medium tracking-normal">
                Phần nào cần rõ hơn?
              </legend>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={feedbackCategory === option.value ? "secondary" : "outline"}
                    size="sm"
                    className="rounded-[var(--r-card)]"
                    aria-pressed={feedbackCategory === option.value}
                    onClick={() => setFeedbackCategory(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </fieldset>

            <div className="space-y-2">
              <Label htmlFor="demo-feedback-confusing">Điều gì khó hiểu nhất?</Label>
              <Textarea
                id="demo-feedback-confusing"
                value={confusingText}
                maxLength={500}
                placeholder="Ví dụ: không rõ bước tiếp theo, Setup 12 tuần dài, tab Hôm nay chưa dễ hiểu..."
                onChange={(event) => setConfusingText(event.target.value)}
              />
              <p className="text-xs leading-5 text-slate-500">
                Không nhập email, số điện thoại hoặc thông tin nhạy cảm.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="demo-feedback-next-help">
                Bạn muốn app giúp gì tiếp theo? <span className="text-slate-400">(tuỳ chọn)</span>
              </Label>
              <Textarea
                id="demo-feedback-next-help"
                value={nextHelpText}
                maxLength={500}
                placeholder="Ví dụ: nhắc review tuần, giải thích việc ưu tiên, xuất dữ liệu rõ hơn..."
                onChange={(event) => setNextHelpText(event.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
                Để sau
              </Button>
              <Button type="button" disabled={!canSubmit} onClick={handleSubmit}>
                <Send className="h-4 w-4" />
                Gửi góp ý
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
