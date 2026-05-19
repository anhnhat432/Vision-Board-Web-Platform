import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { cn } from "../ui/utils";

interface NextWeekCommitmentsEditorProps {
  value: string[];
  onChange: (next: string[]) => void;
  maxItems?: number;
  disabled?: boolean;
}

function normalizeCommitment(value: string): string {
  return value.trim();
}

function normalizeDuplicateKey(value: string): string {
  return normalizeCommitment(value).toLocaleLowerCase();
}

export function NextWeekCommitmentsEditor({
  value,
  onChange,
  maxItems = 5,
  disabled = false,
}: NextWeekCommitmentsEditorProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const duplicateTimerRef = useRef<number | null>(null);
  const [draft, setDraft] = useState("");
  const [duplicateKey, setDuplicateKey] = useState<string | null>(null);
  const commitments = value.map(normalizeCommitment).filter(Boolean).slice(0, maxItems);
  const isAtMax = commitments.length >= maxItems;
  const inputDisabled = disabled || isAtMax;

  useEffect(() => {
    return () => {
      if (duplicateTimerRef.current !== null) {
        window.clearTimeout(duplicateTimerRef.current);
      }
    };
  }, []);

  const flashDuplicate = (key: string) => {
    setDuplicateKey(key);
    inputRef.current?.focus();
    if (duplicateTimerRef.current !== null) {
      window.clearTimeout(duplicateTimerRef.current);
    }
    duplicateTimerRef.current = window.setTimeout(() => {
      setDuplicateKey(null);
      duplicateTimerRef.current = null;
    }, 600);
  };

  const commitDraft = (rawValue: string): boolean => {
    const normalized = normalizeCommitment(rawValue);
    if (!normalized) return false;

    const nextDuplicateKey = normalizeDuplicateKey(normalized);
    if (commitments.some((item) => normalizeDuplicateKey(item) === nextDuplicateKey)) {
      flashDuplicate(nextDuplicateKey);
      return false;
    }
    if (commitments.length >= maxItems) return false;

    onChange([...commitments, normalized]);
    setDraft("");
    return true;
  };

  const handleDraftChange = (nextDraft: string) => {
    if (!nextDraft.includes(",")) {
      setDraft(nextDraft);
      return;
    }

    const parts = nextDraft.split(",");
    const trailingDraft = parts.pop() ?? "";
    let nextCommitments = commitments;
    let hitDuplicateKey: string | null = null;

    for (const part of parts) {
      const normalized = normalizeCommitment(part);
      if (!normalized || nextCommitments.length >= maxItems) continue;

      const key = normalizeDuplicateKey(normalized);
      if (nextCommitments.some((item) => normalizeDuplicateKey(item) === key)) {
        hitDuplicateKey = key;
        continue;
      }
      nextCommitments = [...nextCommitments, normalized];
    }

    if (nextCommitments !== commitments) onChange(nextCommitments);
    setDraft(nextCommitments.length >= maxItems ? "" : trailingDraft);
    if (hitDuplicateKey) flashDuplicate(hitDuplicateKey);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commitDraft(draft);
      return;
    }

    if (event.key === "Backspace" && draft.length === 0 && commitments.length > 0 && !inputDisabled) {
      event.preventDefault();
      onChange(commitments.slice(0, -1));
    }
  };

  const removeCommitment = (commitmentToRemove: string) => {
    onChange(commitments.filter((commitment) => commitment !== commitmentToRemove));
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  return (
    <div className="mt-2 stack-tight">
      {commitments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {commitments.map((commitment) => {
            const key = normalizeDuplicateKey(commitment);

            return (
              <fieldset
                key={commitment}
                aria-label={`Cam kết: ${commitment}`}
                data-state={duplicateKey === key ? "duplicate" : "idle"}
                className={cn(
                  "inline-flex max-w-full min-w-0 items-center gap-1 rounded-full border bg-app-surface px-3 py-1 text-xs font-semibold text-app-accent transition-colors",
                  duplicateKey === key ? "border-app-warm-border bg-app-warm-soft text-app-warm" : "border-app-line",
                )}
              >
                <span className="min-w-0 truncate">{commitment}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 shrink-0 rounded-full p-0 text-app-accent hover:bg-app-accent-soft"
                  onClick={() => removeCommitment(commitment)}
                  disabled={disabled}
                  aria-label={`Xóa cam kết: ${commitment}`}
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </fieldset>
            );
          })}
        </div>
      )}
      <Input
        ref={inputRef}
        id="weekly-next-commitments"
        value={draft}
        disabled={inputDisabled}
        placeholder="Nhập cam kết, nhấn Enter hoặc dấu phẩy để thêm"
        onChange={(event) => handleDraftChange(event.target.value)}
        onKeyDown={handleKeyDown}
      />
      {isAtMax ? (
        <p className="text-xs leading-5 text-app-ink-muted">
          Đã đạt tối đa {maxItems} cam kết. Xoá bớt chip để thêm mới.
        </p>
      ) : (
        <p className="text-xs leading-5 text-app-ink-muted">
          Đây sẽ là tactic chính tuần sau. Tối đa {maxItems} cam kết.
        </p>
      )}
    </div>
  );
}
