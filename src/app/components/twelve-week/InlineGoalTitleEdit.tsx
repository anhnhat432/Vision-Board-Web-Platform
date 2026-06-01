import { Check, Pencil, X } from "lucide-react";
import { type KeyboardEvent, useEffect, useState } from "react";

import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { cn } from "@/app/components/ui/utils";

interface InlineGoalTitleEditProps {
  title: string;
  fallbackTitle?: string;
  onSave?: (nextTitle: string) => void | Promise<void>;
  headingLevel?: 1 | 2 | 3;
  className?: string;
  titleClassName?: string;
  inputClassName?: string;
  editButtonLabel?: string;
}

function GoalTitleText({ level, className, children }: { level: 1 | 2 | 3; className?: string; children: string }) {
  if (level === 1) return <h1 className={className}>{children}</h1>;
  if (level === 2) return <h2 className={className}>{children}</h2>;
  return <h3 className={className}>{children}</h3>;
}

export function InlineGoalTitleEdit({
  title,
  fallbackTitle = "Kế hoạch hiện tại",
  onSave,
  headingLevel = 2,
  className,
  titleClassName,
  inputClassName,
  editButtonLabel = "Đổi tên mục tiêu",
}: InlineGoalTitleEditProps) {
  const displayTitle = title.trim() || fallbackTitle;
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(displayTitle);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setDraftTitle(displayTitle);
    }
  }, [displayTitle, isEditing]);

  const cancelEditing = () => {
    setDraftTitle(displayTitle);
    setIsEditing(false);
  };

  const saveTitle = async () => {
    const nextTitle = draftTitle.trim();
    if (!nextTitle) {
      setDraftTitle(displayTitle);
      setIsEditing(false);
      return;
    }

    if (!onSave || nextTitle === displayTitle) {
      setDraftTitle(nextTitle);
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await Promise.resolve(onSave(nextTitle));
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      cancelEditing();
    }
  };

  if (!isEditing || !onSave) {
    return (
      <div className={cn("group/goal-title flex min-w-0 items-start gap-2", className)}>
        <GoalTitleText level={headingLevel} className={titleClassName}>
          {displayTitle}
        </GoalTitleText>
        {onSave ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="mt-1 size-9 shrink-0 text-app-ink-muted opacity-80 hover:text-app-ink sm:opacity-0 sm:transition-opacity sm:group-hover/goal-title:opacity-100 sm:focus-visible:opacity-100"
            onClick={() => {
              setDraftTitle(displayTitle);
              setIsEditing(true);
            }}
            aria-label={editButtonLabel}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <form
      className={cn("flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start", className)}
      onSubmit={(event) => {
        event.preventDefault();
        void saveTitle();
      }}
    >
      <Input
        value={draftTitle}
        onChange={(event) => setDraftTitle(event.target.value)}
        onKeyDown={handleKeyDown}
        aria-label="Tên mục tiêu 12 tuần"
        autoFocus
        className={cn("min-w-0 flex-1", inputClassName)}
        disabled={isSaving}
      />
      <div className="flex shrink-0 items-center gap-1.5">
        <Button type="submit" size="icon" variant="secondary" loading={isSaving} aria-label="Lưu tên mục tiêu">
          <Check className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button type="button" size="icon" variant="ghost" onClick={cancelEditing} aria-label="Hủy đổi tên mục tiêu">
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </form>
  );
}
