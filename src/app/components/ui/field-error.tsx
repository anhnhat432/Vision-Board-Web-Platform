import { AlertCircle } from "lucide-react";

import { cn } from "./utils";

export interface FieldErrorProps {
  message: string | null | undefined;
  id?: string;
  role?: string;
  className?: string;
}

export function FieldError({ message, id, role, className }: FieldErrorProps) {
  if (!message) return null;

  return (
    <div
      id={id}
      role={role}
      className={cn("mt-1.5 flex items-center gap-1.5 text-xs font-medium text-red-600", className)}
    >
      <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
