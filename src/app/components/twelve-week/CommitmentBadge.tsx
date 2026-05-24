import { useEffect, useState } from "react";

import type { LeadIndicatorCommitment } from "@/app/utils/storage-types";

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
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";

const COMMITMENT_FIELDS = [
  {
    key: "want",
    label: "Tôi thực sự muốn điều này vì...",
  },
  {
    key: "cost",
    label: "Tôi sẵn sàng trả giá gì...",
  },
  {
    key: "means",
    label: "Tôi sẽ làm thế nào (cụ thể)...",
  },
  {
    key: "tradeoff",
    label: "Tôi sẽ phải bỏ qua/giảm điều gì...",
  },
  {
    key: "reward",
    label: "Tôi sẽ tự thưởng gì khi giữ được...",
  },
] as const;

interface CommitmentBadgeProps {
  tacticName: string;
  commitment?: LeadIndicatorCommitment;
  disabled?: boolean;
  onSave?: (commitment: LeadIndicatorCommitment | undefined) => void;
}

function getEmptyCommitment(): LeadIndicatorCommitment {
  return {
    want: "",
    cost: "",
    means: "",
    tradeoff: "",
    reward: "",
  };
}

function normalizeCommitment(commitment: LeadIndicatorCommitment | undefined): LeadIndicatorCommitment {
  return {
    ...getEmptyCommitment(),
    ...commitment,
  };
}

function getFilledCommitmentCount(commitment: LeadIndicatorCommitment | undefined): number {
  const normalized = normalizeCommitment(commitment);
  return COMMITMENT_FIELDS.filter((field) => normalized[field.key].trim().length > 0).length;
}

function getBadgeLabel(commitment: LeadIndicatorCommitment | undefined): string {
  if (!commitment) return "Chưa điền";
  const count = getFilledCommitmentCount(commitment);
  return `${count}/5 câu`;
}

export function CommitmentBadge({ tacticName, commitment, disabled = false, onSave }: CommitmentBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<LeadIndicatorCommitment>(() => normalizeCommitment(commitment));

  useEffect(() => {
    if (isOpen) {
      setDraft(normalizeCommitment(commitment));
    }
  }, [commitment, isOpen]);

  const handleSave = () => {
    const normalized = normalizeCommitment(draft);
    const hasAnyAnswer = getFilledCommitmentCount(normalized) > 0;
    onSave?.(hasAnyAnswer ? { ...normalized, filledAt: new Date().toISOString() } : undefined);
    setIsOpen(false);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        className="bg-app-surface"
        onClick={() => setIsOpen(true)}
      >
        {getBadgeLabel(commitment)}
      </Button>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cam kết với chính mình</AlertDialogTitle>
          <AlertDialogDescription>
            {tacticName ? `Tactic: ${tacticName}. ` : ""}
            Điền tuỳ chọn để nhắc lại lý do, cái giá và phần thưởng khi giữ cam kết.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid gap-3">
          {COMMITMENT_FIELDS.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={`commitment-badge-${field.key}`}>{field.label}</Label>
              <Textarea
                id={`commitment-badge-${field.key}`}
                rows={3}
                value={draft[field.key]}
                onChange={(event) =>
                  setDraft((previous) => ({
                    ...previous,
                    [field.key]: event.target.value,
                  }))
                }
              />
            </div>
          ))}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Huỷ</AlertDialogCancel>
          <AlertDialogAction onClick={handleSave}>Lưu cam kết</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export { getFilledCommitmentCount };
