import { useEffect, type JSX } from "react";
import { useBeforeUnload, useBlocker } from "react-router";
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

interface UnsavedChangesGuardProps {
  hasUnsavedChanges: boolean;
}

export function UnsavedChangesGuard({ hasUnsavedChanges }: UnsavedChangesGuardProps): JSX.Element {
  const blocker = useBlocker(hasUnsavedChanges);

  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = "";
    }
  };

  useBeforeUnload(handleBeforeUnload);

  return (
    <AlertDialog
      open={blocker.state === "blocked"}
      onOpenChange={(open) => {
        if (!open && blocker.state === "blocked") {
          blocker.reset();
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Rời khỏi bảng khi chưa lưu?</AlertDialogTitle>
          <AlertDialogDescription>
            Bạn đang có thay đổi chưa được lưu. Nếu rời trang bây giờ, các thay đổi trên bảng sẽ bị mất.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => {
              if (blocker.state === "blocked") blocker.reset();
            }}
          >
            Ở lại
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-[color:var(--color-danger-fg)] text-white hover:bg-[color:var(--color-danger-fg)]/90"
            onClick={() => {
              if (blocker.state === "blocked") blocker.proceed();
            }}
          >
            Rời khỏi trang
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
