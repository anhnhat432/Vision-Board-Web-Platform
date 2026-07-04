import { Lock, Mail, MailOpen } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { TwelveWeekSystem } from "@/app/utils/storage";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";
import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { cn } from "@/app/components/ui/utils";

interface FutureSelfLetterProps {
  goalId: string;
  progress: number;
  system?: TwelveWeekSystem;
}

export function FutureSelfLetter({ goalId, progress, system }: FutureSelfLetterProps) {
  const [letterText, setLetterText] = useState<string | null>(null);
  const [isWriteOpen, setIsWriteOpen] = useState(false);
  const [isReadOpen, setIsReadOpen] = useState(false);
  const [tempText, setTempText] = useState("");
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);

  const handleWriteOpenChange = (open: boolean) => {
    if (!open) {
      const isDirty = tempText.trim() !== (letterText || "").trim();
      if (isDirty) {
        setDiscardConfirmOpen(true);
        return;
      }
    }
    setIsWriteOpen(open);
  };

  const handleConfirmDiscard = () => {
    setDiscardConfirmOpen(false);
    setIsWriteOpen(false);
  };

  const discardLetterAlertDialog = (
    <AlertDialog open={discardConfirmOpen} onOpenChange={setDiscardConfirmOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Bỏ thay đổi trên thư?</AlertDialogTitle>
          <AlertDialogDescription>
            Nội dung thư thay đổi chưa được lưu/niêm phong sẽ bị mất. Bạn vẫn muốn đóng chứ?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Tiếp tục viết</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirmDiscard}
            className="bg-app-status-error hover:bg-app-status-error/90 text-white"
          >
            Bỏ thay đổi
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  useEffect(() => {
    const saved = localStorage.getItem(`future_letter_${goalId}`);
    setLetterText(saved);
  }, [goalId]);

  const handleOpenWrite = () => {
    setTempText(letterText || "");
    setIsReadOpen(false);
    setIsWriteOpen(true);
  };

  const handleSave = () => {
    if (!tempText.trim()) {
      localStorage.removeItem(`future_letter_${goalId}`);
      setLetterText(null);
      toast.info("Đã xóa thư nháp.");
    } else {
      localStorage.setItem(`future_letter_${goalId}`, tempText);
      setLetterText(tempText);
      toast.success("Bức thư gửi tương lai đã được niêm phong!");
    }
    setIsWriteOpen(false);
  };

  const isUnlocked = useMemo(() => {
    if (progress === 100) return true;
    if (!system) return false;

    if (system.currentWeek >= 12) return true;
    try {
      const today = new Date();
      const end = new Date(system.endDate);
      if (today > end) return true;
    } catch {}

    return false;
  }, [progress, system]);

  const handleReadClick = () => {
    if (!isUnlocked) {
      toast.info("Thư đang được niêm phong 🔒", {
        description: "Đạt 100% tiến độ hoặc hoàn thành tuần 12 để mở.",
      });
      return;
    }
    setIsReadOpen(true);
  };

  if (!letterText) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpenWrite}
          className="h-auto rounded-full border border-app-line bg-app-surface px-4 py-2.5 text-xs font-semibold text-app-ink-soft transition-all inline-flex items-center gap-2 hover:bg-app-bg"
        >
          <Mail className="h-4 w-4 text-app-accent" />
          Viết thư tuần 12
        </Button>

        <Dialog open={isWriteOpen} onOpenChange={handleWriteOpenChange}>
          <DialogContent className="max-w-lg p-5 sm:p-6 bg-app-surface border border-app-line rounded-[var(--app-radius-card)] shadow-[var(--app-shadow-lg)]">
            <DialogHeader className="space-y-1.5 text-left border-b border-app-line/45 pb-3">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-app-accent shrink-0" />
                <DialogTitle className="font-serif text-lg font-bold text-app-ink">
                  Gửi tôi ở tuần thứ 12
                </DialogTitle>
              </div>
            </DialogHeader>
            <DialogDescription className="text-sm text-app-ink-soft leading-relaxed mt-2">
              Viết một vài dòng nhắn nhủ, cam kết hoặc khích lệ bản thân lúc này. Bức thư sẽ được khóa lại và chỉ mở ra
              khi bạn đạt 100% tiến độ hoặc hoàn thành chu kỳ 12 tuần.
            </DialogDescription>

            <div className="pt-2">
              <textarea
                className="w-full min-h-[160px] rounded-[var(--app-radius-control)] border border-app-line bg-app-bg p-3.5 text-sm text-app-ink placeholder:text-app-ink-muted focus:outline-none focus:ring-2 focus:ring-app-accent/25 resize-none transition-all"
                placeholder="Gửi bản thân thân mến ở tuần 12…"
                value={tempText}
                onChange={(e) => setTempText(e.target.value)}
                maxLength={500}
              />
            </div>

            <DialogFooter className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mt-3">
              <span className="text-xs sm:text-sm text-app-ink-muted w-full sm:w-auto text-left font-medium">
                {tempText.length}/500 ký tự
              </span>
              <div className="flex gap-2.5 w-full sm:w-auto justify-end shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsWriteOpen(false)}
                  className="rounded-lg border border-app-line bg-app-surface text-app-ink hover:bg-app-bg h-9 px-4 py-2 font-bold text-xs sm:text-sm"
                >
                  Hủy
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  className="rounded-lg bg-app-accent text-white hover:bg-app-accent-hover font-bold h-9 px-4 py-2 text-xs sm:text-sm"
                >
                  Niêm phong thư
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {discardLetterAlertDialog}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={isUnlocked ? () => setIsReadOpen(true) : handleReadClick}
        className={cn(
          "rounded-lg border px-3.5 py-2 text-xs font-bold transition-all inline-flex items-center gap-1.5 h-9",
          isUnlocked
            ? "border-app-accent/30 bg-app-accent-soft text-app-accent hover:bg-app-accent-subtle"
            : "border-app-status-warning/30 bg-app-status-warning/10 text-app-status-warning hover:bg-app-status-warning/20",
        )}
      >
        {isUnlocked ? (
          <>
            <MailOpen className="h-4 w-4 text-app-accent" />
            Đọc thư
          </>
        ) : (
          <>
            <Lock className="h-3.5 w-3.5 text-app-status-warning" />
            Thư tuần 12 (Khóa)
          </>
        )}
      </button>

      <Dialog open={isReadOpen} onOpenChange={setIsReadOpen}>
        <DialogContent className="max-w-lg p-5 sm:p-6 bg-app-surface border border-app-line rounded-[var(--app-radius-card)] shadow-[var(--app-shadow-lg)]">
          <DialogHeader className="space-y-1.5 text-left border-b border-app-line pb-3">
            <div className="flex items-center gap-2">
              <MailOpen className="h-5 w-5 text-app-accent shrink-0" />
              <DialogTitle className="font-serif text-lg font-bold text-app-ink">
                Thư gửi từ quá khứ
              </DialogTitle>
            </div>
          </DialogHeader>
          <DialogDescription className="text-sm text-app-ink-soft mt-2">
            Bức thư bạn tự tay viết khi bắt đầu hành trình chinh phục mục tiêu này.
          </DialogDescription>

          <div className="bg-app-bg-subtle dark:bg-app-bg-subtle/40 rounded-xl p-4 border border-app-line/60 my-2">
            <p className="text-sm italic leading-relaxed text-app-ink whitespace-pre-wrap font-serif">
              "{letterText}"
            </p>
          </div>

          <DialogFooter className="flex flex-row justify-between items-center gap-3 w-full mt-2">
            <button
              type="button"
              onClick={handleOpenWrite}
              className="text-xs sm:text-sm text-app-accent hover:underline font-bold"
            >
              Chỉnh sửa thư
            </button>
            <Button
              size="sm"
              onClick={() => setIsReadOpen(false)}
              className="rounded-lg bg-app-accent hover:bg-app-accent-hover text-app-ink-on-accent font-bold h-9 px-4 py-2 text-xs sm:text-sm"
            >
              Tuyệt vời
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isWriteOpen} onOpenChange={handleWriteOpenChange}>
        <DialogContent className="max-w-lg p-5 sm:p-6 bg-app-surface border border-app-line rounded-[var(--app-radius-card)] shadow-[var(--app-shadow-lg)]">
          <DialogHeader className="space-y-1.5 text-left border-b border-app-line/45 pb-3">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-app-accent shrink-0" />
              <DialogTitle className="font-serif text-lg font-bold text-app-ink">
                Chỉnh sửa thư gửi tuần 12
              </DialogTitle>
            </div>
          </DialogHeader>
          <DialogDescription className="text-sm text-app-ink-soft leading-relaxed mt-2">
            Chỉnh sửa hoặc xóa bức thư gửi cho chính bạn ở cuối hành trình mục tiêu.
          </DialogDescription>

          <div className="pt-2">
            <textarea
              className="w-full min-h-[160px] rounded-[var(--app-radius-control)] border border-app-line bg-app-bg p-3.5 text-sm text-app-ink placeholder:text-app-ink-muted focus:outline-none focus:ring-2 focus:ring-app-accent/25 resize-none transition-all"
              placeholder="Gửi bản thân thân mến…"
              value={tempText}
              onChange={(e) => setTempText(e.target.value)}
              maxLength={500}
            />
          </div>

          <DialogFooter className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mt-3">
            <span className="text-xs sm:text-sm text-app-ink-muted w-full sm:w-auto text-left font-medium">
              {tempText.length}/500 ký tự
            </span>
            <div className="flex gap-2.5 w-full sm:w-auto justify-end shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsWriteOpen(false)}
                className="rounded-lg border border-app-line bg-app-surface text-app-ink hover:bg-app-bg h-9 px-4 py-2 font-bold text-xs sm:text-sm"
              >
                Hủy
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                className="rounded-lg bg-app-accent text-white hover:bg-app-accent-hover font-bold h-9 px-4 py-2 text-xs sm:text-sm"
              >
                Lưu thay đổi
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {discardLetterAlertDialog}
    </>
  );
}
