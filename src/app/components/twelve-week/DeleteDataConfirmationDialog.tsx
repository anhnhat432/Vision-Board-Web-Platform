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
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader className="items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-[var(--r-pill)] bg-rose-100">
            <Trash2 className="h-7 w-7 text-rose-600" />
          </div>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {isDemoMode ? (
              <>
                <span className="rounded-[var(--r-control)] bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                  Chỉ trên thiết bị này
                </span>{" "}
                trên trình duyệt này sẽ bị xóa vĩnh viễn.
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

        <div className="rounded-[var(--r-control)] border border-rose-200 bg-rose-50 px-4 py-3">
          <p className="text-sm font-semibold text-rose-800">Hành động này không thể hoàn tác.</p>
          <p className="mt-1 text-sm font-semibold text-rose-800">
            Tất cả dữ liệu của bạn sẽ bị xóa vĩnh viễn.
          </p>
          <ul className="mt-2 space-y-1 text-sm text-rose-700">
            <li>• Mục tiêu và kế hoạch 12 tuần sẽ bị xóa</li>
            <li>• Nhật ký, review và check-in sẽ bị xóa</li>
            {isSignedIn && !isDemoMode && <li>• Dữ liệu tài khoản sẽ bị xóa khỏi hệ thống</li>}
            {isSignedIn && !isDemoMode && <li>• Tài khoản sẽ bị vô hiệu hóa</li>}
            <li>• Cài đặt và trạng thái gói Plus sẽ bị xóa</li>
          </ul>
        </div>

        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <AlertDialogCancel disabled={isLoading}>Hủy</AlertDialogCancel>
          <AlertDialogAction
            className="w-full bg-rose-600 text-white hover:bg-rose-700 focus:bg-rose-700 disabled:opacity-50"
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
