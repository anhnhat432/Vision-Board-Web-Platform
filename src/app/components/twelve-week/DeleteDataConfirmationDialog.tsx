import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

interface DeleteDataConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isDemoMode: boolean;
  isSignedIn: boolean;
  onConfirm: () => void | Promise<void>;
  isLoading?: boolean;
}

export function DeleteDataConfirmationDialog({
  open,
  onOpenChange,
  isDemoMode,
  isSignedIn,
  onConfirm,
  isLoading = false,
}: DeleteDataConfirmationDialogProps) {
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");

  useEffect(() => {
    if (!open) {
      setIsConfirmed(false);
      setConfirmationText("");
    }
  }, [open]);

  const expectedText = isSignedIn && !isDemoMode ? "XOATAIKHOAN" : "XOADULIEU";

  const title = isDemoMode
    ? "Xóa dữ liệu trên thiết bị?"
    : isSignedIn
      ? "Xóa tài khoản và dữ liệu?"
      : "Xóa dữ liệu trên thiết bị?";

  const actionLabel = isDemoMode
    ? "Xóa dữ liệu trên thiết bị"
    : isSignedIn
      ? "Xóa tài khoản và dữ liệu"
      : "Xóa dữ liệu trên thiết bị";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md surface-raised rounded-xl border border-app-line bg-app-surface">
        <AlertDialogHeader className="items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[color:var(--color-danger-bg)]">
            <Trash2 className="h-7 w-7 text-[color:var(--color-danger-fg)]" />
          </div>
          <AlertDialogTitle className="font-serif text-xl font-medium text-app-ink">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-6 text-app-ink-soft">
            {isDemoMode ? (
              <>
                <span className="rounded-full bg-app-warm-soft px-2 py-0.5 text-xs font-medium text-app-warm">
                  Chỉ trên thiết bị này
                </span>{" "}
                sẽ bị xóa vĩnh viễn.
              </>
            ) : isSignedIn ? (
              <>
                Tất cả dữ liệu trên đám mây và thiết bị sẽ bị xóa vĩnh viễn, bao gồm mục tiêu, kế hoạch 12 tuần, nhật
                ký, review và cài đặt. Tài khoản sẽ không còn có thể truy cập.
              </>
            ) : (
              <>
                Tất cả dữ liệu trên thiết bị này sẽ bị xóa vĩnh viễn, bao gồm mục tiêu, kế hoạch 12 tuần, nhật ký,
                review và cài đặt.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="rounded-lg border border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-bg)] px-4 py-3">
          <p className="text-sm font-semibold text-[color:var(--color-danger-fg)]">Hành động này không thể hoàn tác.</p>
          <p className="mt-1 text-sm font-semibold text-[color:var(--color-danger-fg)]">
            Tất cả dữ liệu của bạn sẽ bị xóa vĩnh viễn.
          </p>
          <ul className="mt-2 space-y-1 text-sm text-[color:var(--color-danger-fg)]">
            <li>• Mục tiêu và kế hoạch 12 tuần sẽ bị xóa</li>
            <li>• Nhật ký, review và check-in sẽ bị xóa</li>
            {isSignedIn && !isDemoMode && <li>• Dữ liệu tài khoản sẽ bị xóa khỏi hệ thống</li>}
            {isSignedIn && !isDemoMode && <li>• Tài khoản sẽ bị vô hiệu hóa</li>}
            <li>• Cài đặt và trạng thái gói Plus sẽ bị xóa</li>
          </ul>
        </div>

        <div className="flex items-start gap-2.5 px-1 py-1">
          <Checkbox
            id="delete-confirm-checkbox"
            checked={isConfirmed}
            onCheckedChange={(checked) => setIsConfirmed(checked === true)}
            disabled={isLoading}
          />
          <Label
            htmlFor="delete-confirm-checkbox"
            className="text-sm font-medium leading-relaxed text-app-ink-soft select-none cursor-pointer pt-3"
          >
            Tôi hiểu hành động này là không thể rút lại và đồng ý xóa vĩnh viễn.
          </Label>
        </div>

        <div className="space-y-1.5 px-1 py-1">
          <Label htmlFor="delete-confirm-text-input" className="text-xs font-semibold text-app-ink-soft">
            Nhập chữ <span className="font-bold text-[color:var(--color-danger-fg)]">{expectedText}</span> để xác nhận:
          </Label>
          <Input
            id="delete-confirm-text-input"
            type="text"
            placeholder={expectedText}
            className="border-app-line/60 rounded-xl"
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <AlertDialogCancel
            disabled={isLoading}
            className="border-app-line bg-app-surface text-app-ink hover:bg-app-bg"
          >
            Hủy
          </AlertDialogCancel>
          <AlertDialogAction
            className="w-full bg-[color:var(--color-danger-fg)] text-white hover:bg-[color:var(--color-danger-fg)]/90 focus:bg-[color:var(--color-danger-fg)]/90 disabled:opacity-50"
            disabled={isLoading || !isConfirmed || confirmationText !== expectedText}
            onClick={(event) => {
              event.preventDefault();
              void onConfirm();
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {isLoading ? "Đang xóa..." : actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
