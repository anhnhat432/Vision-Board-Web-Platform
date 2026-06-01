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
import { Label } from "../ui/label";

interface DeleteCloudWorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  isLoading?: boolean;
}

export function DeleteCloudWorkspaceDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading = false,
}: DeleteCloudWorkspaceDialogProps) {
  const [isConfirmed, setIsConfirmed] = useState(false);

  useEffect(() => {
    if (!open) {
      setIsConfirmed(false);
    }
  }, [open]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md surface-raised rounded-xl border border-app-line bg-app-surface">
        <AlertDialogHeader className="items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[color:var(--color-danger-bg)]">
            <Trash2 className="h-7 w-7 text-[color:var(--color-danger-fg)]" />
          </div>
          <AlertDialogTitle className="font-serif text-xl font-medium text-app-ink">
            Xóa dữ liệu 12 tuần đã đồng bộ?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-6 text-app-ink-soft">
            Hành động này sẽ xóa dữ liệu chu kỳ 12 tuần của bạn trên đám mây. Dữ liệu cục bộ trên thiết bị này vẫn được
            giữ nguyên.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="rounded-lg border border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-bg)] px-4 py-3">
          <p className="text-sm font-semibold text-[color:var(--color-danger-fg)]">Hành động này không thể hoàn tác.</p>
          <p className="mt-1 text-xs text-[color:var(--color-danger-fg)]">
            Tất cả bản sao lưu của chu kỳ này trên máy chủ đám mây sẽ bị xóa vĩnh viễn.
          </p>
        </div>

        <div className="flex items-start gap-2.5 px-1 py-1">
          <Checkbox
            id="delete-cloud-confirm-checkbox"
            checked={isConfirmed}
            onCheckedChange={(checked) => setIsConfirmed(checked === true)}
            disabled={isLoading}
          />
          <Label
            htmlFor="delete-cloud-confirm-checkbox"
            className="text-sm font-medium leading-relaxed text-app-ink-soft select-none cursor-pointer pt-3"
          >
            Tôi hiểu hành động này là không thể rút lại và đồng ý xóa vĩnh viễn.
          </Label>
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
            disabled={isLoading || !isConfirmed}
            onClick={(event) => {
              event.preventDefault();
              void onConfirm();
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {isLoading ? "Đang xóa..." : "Xóa dữ liệu đã đồng bộ"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
