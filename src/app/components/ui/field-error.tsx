import { AlertCircle } from "lucide-react";

import { cn } from "./utils";

export interface FieldErrorProps {
  message: string | null | undefined;
  id?: string;
  role?: string;
  className?: string;
}

export function FieldError({ message, id, role = "alert", className }: FieldErrorProps) {
  if (!message) return null;

  return (
    <div
      id={id}
      role={role}
      className={cn(
        "mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-app-warm dark:text-app-warm",
        className,
      )}
    >
      <AlertCircle className="h-3.5 w-3.5 shrink-0 text-app-warm" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
