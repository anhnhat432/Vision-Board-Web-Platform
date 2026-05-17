import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../ui/alert-dialog";
import { Trash2 } from "lucide-react";

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
      <AlertDialogContent className="max-w-md rounded-card border border-app-line bg-app-surface">
        <AlertDialogHeader className="items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[color:var(--color-danger-bg)]">
            <Trash2 className="h-7 w-7 text-[color:var(--color-danger-fg)]" />
          </div>
          <AlertDialogTitle className="font-serif text-xl font-medium text-app-ink">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-[14px] leading-6 text-app-ink-soft">
            {isDemoMode ? (
              <>
                <span className="rounded-full bg-app-warm-soft px-2 py-0.5 text-xs font-medium text-app-warm">
                  Chỉ trên thiết bị này
                </span>{" "}
                sẽ bị xóa vĩnh viễn.
              </>
            ) : isSignedIn ? (
              <>
                Tất cả dữ liệu trên đám mây và thiết bị sẽ bị xóa vĩnh viễn, bao gồm mục tiêu, kế hoạch 12 tuần,
                nhật ký, review và cài đặt. Tài khoản sẽ không còn có thể truy cập.
              </>
            ) : (
              <>
                Tất cả dữ liệu trên thiết bị này sẽ bị xóa vĩnh viễn, bao gồm mục tiêu, kế hoạch 12 tuần,
                nhật ký, review và cài đặt.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="rounded-lg border border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-bg)] px-4 py-3">
          <p className="text-[14px] font-semibold text-[color:var(--color-danger-fg)]">Hành động này không thể hoàn tác.</p>
          <p className="mt-1 text-[14px] font-semibold text-[color:var(--color-danger-fg)]">
            Tất cả dữ liệu của bạn sẽ bị xóa vĩnh viễn.
          </p>
          <ul className="mt-2 space-y-1 text-[14px] text-[color:var(--color-danger-fg)]">
            <li>• Mục tiêu và kế hoạch 12 tuần sẽ bị xóa</li>
            <li>• Nhật ký, review và check-in sẽ bị xóa</li>
            {isSignedIn && !isDemoMode && <li>• Dữ liệu tài khoản sẽ bị xóa khỏi hệ thống</li>}
            {isSignedIn && !isDemoMode && <li>• Tài khoản sẽ bị vô hiệu hóa</li>}
            <li>• Cài đặt và trạng thái gói Plus sẽ bị xóa</li>
          </ul>
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
            disabled={isLoading}
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
