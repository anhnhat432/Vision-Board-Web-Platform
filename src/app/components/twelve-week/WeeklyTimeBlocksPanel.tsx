import { CalendarClock, Clock3, Pencil, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import {
  getDefaultTimeBlocks,
  TIME_BLOCK_DAYS,
  validateTimeBlocks,
} from "@/features/plan12week/logic/timeBlocks";
import type { TimeBlock, TimeBlockDayOfWeek, TimeBlockType } from "@/app/utils/storage-types";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

interface WeeklyTimeBlocksPanelProps {
  value?: TimeBlock[];
  onChange: (next: TimeBlock[]) => void;
  disabled?: boolean;
}

interface TimeBlockDraft {
  id: string;
  type: TimeBlockType;
  dayOfWeek: TimeBlockDayOfWeek;
  startTime: string;
  durationMinutes: string;
  note: string;
}

const TYPE_LABELS: Record<TimeBlockType, string> = {
  strategic: "Khung chiến lược",
  buffer: "Khung dự phòng",
  breakout: "Khung đột phá",
};

const TYPE_DESCRIPTIONS: Record<TimeBlockType, string> = {
  strategic: "3 giờ làm sâu cho việc lặp lại quan trọng nhất.",
  buffer: "30-60 phút xử lý email, việc hành chính nhỏ, việc rời rạc.",
  breakout: "3 giờ nghỉ chủ động, tách khỏi công việc.",
};

const TYPE_CHIP_CLASS: Record<TimeBlockType, string> = {
  strategic: "border-emerald-200 bg-emerald-50 text-emerald-900",
  buffer: "border-sky-200 bg-sky-50 text-sky-900",
  breakout: "border-amber-200 bg-amber-50 text-amber-900",
};

const DAY_LABELS: Record<TimeBlockDayOfWeek, string> = {
  Monday: "Thứ Hai",
  Tuesday: "Thứ Ba",
  Wednesday: "Thứ Tư",
  Thursday: "Thứ Năm",
  Friday: "Thứ Sáu",
  Saturday: "Thứ Bảy",
  Sunday: "Chủ nhật",
};

function createDraft(block: TimeBlock): TimeBlockDraft {
  return {
    id: block.id,
    type: block.type,
    dayOfWeek: block.dayOfWeek,
    startTime: block.startTime,
    durationMinutes: String(block.durationMinutes),
    note: block.note ?? "",
  };
}

function createBlock(draft: TimeBlockDraft): TimeBlock {
  return {
    id: draft.id,
    type: draft.type,
    dayOfWeek: draft.dayOfWeek,
    startTime: draft.startTime,
    durationMinutes: Number.parseInt(draft.durationMinutes, 10),
    note: draft.note.trim() || undefined,
  };
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining > 0 ? `${hours}h ${remaining} phút` : `${hours}h`;
}

function sortBlocks(blocks: readonly TimeBlock[]): TimeBlock[] {
  return [...blocks].sort((left, right) => {
    const dayDelta = TIME_BLOCK_DAYS.indexOf(left.dayOfWeek) - TIME_BLOCK_DAYS.indexOf(right.dayOfWeek);
    if (dayDelta !== 0) return dayDelta;
    return left.startTime.localeCompare(right.startTime);
  });
}

export function WeeklyTimeBlocksPanel({ value = [], onChange, disabled = false }: WeeklyTimeBlocksPanelProps) {
  const [editingDraft, setEditingDraft] = useState<TimeBlockDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sortedBlocks = useMemo(() => sortBlocks(value), [value]);
  const blocksByDay = useMemo(
    () =>
      TIME_BLOCK_DAYS.map((day) => ({
        day,
        blocks: sortedBlocks.filter((block) => block.dayOfWeek === day),
      })),
    [sortedBlocks],
  );

  const handleUseDefaults = () => {
    setError(null);
    onChange(getDefaultTimeBlocks());
  };

  const handleSaveDraft = () => {
    if (!editingDraft) return;
    const nextBlock = createBlock(editingDraft);
    const nextBlocks = sortedBlocks.map((block) => (block.id === nextBlock.id ? nextBlock : block));
    const validation = validateTimeBlocks(nextBlocks);
    if (!validation.isValid) {
      setError(validation.errors[0] ?? "Block chưa hợp lệ.");
      return;
    }
    setError(null);
    setEditingDraft(null);
    onChange(nextBlocks);
  };

  return (
    <Card className="border border-app-line bg-app-surface shadow-sm">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-app-ink">
              <CalendarClock className="h-5 w-5 text-app-accent" />
              Performance Time Blocking
            </CardTitle>
            <CardDescription className="mt-2 text-app-ink-soft">
              Gợi ý nhịp tuần theo 12 Week Year: Khung chiến lược, Khung dự phòng và Khung đột phá. Lịch này chỉ lưu trên thiết bị, không đồng bộ lịch.
            </CardDescription>
          </div>
          {sortedBlocks.length === 0 && (
            <Button type="button" onClick={handleUseDefaults} disabled={disabled}>
              <Sparkles className="h-4 w-4" />
              Dùng gợi ý mặc định
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="stack-stack">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
          {blocksByDay.map(({ day, blocks }) => (
            <div key={day} className="min-h-36 rounded-[var(--r-control)] border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-semibold text-slate-950">{DAY_LABELS[day]}</p>
              <div className="mt-[var(--space-inline)] space-y-2">
                {blocks.length === 0 ? (
                  <p className="text-xs leading-5 text-slate-500">Chưa có khung.</p>
                ) : (
                  blocks.map((block) => (
                    <div
                      key={block.id}
                      data-testid="weekly-time-block-chip"
                      className={`rounded-[var(--r-control)] border px-3 py-2 text-xs shadow-sm ${TYPE_CHIP_CLASS[block.type]}`}
                    >
                      <p className="font-semibold">{TYPE_LABELS[block.type]}</p>
                      <p className="mt-1 flex items-center gap-1">
                        <Clock3 className="h-3 w-3" />
                        {block.startTime} · {formatDuration(block.durationMinutes)}
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="mt-2 h-7 px-2 text-xs"
                        disabled={disabled}
                        onClick={() => {
                          setError(null);
                          setEditingDraft(createDraft(block));
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                        Sửa khung
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {(["strategic", "buffer", "breakout"] as const).map((type) => (
            <div key={type} className="rounded-[var(--r-control)] border border-slate-200 bg-white p-4">
              <Badge variant="outline" className={TYPE_CHIP_CLASS[type]}>
                {TYPE_LABELS[type]}
              </Badge>
              <p className="mt-2 text-sm leading-6 text-slate-600">{TYPE_DESCRIPTIONS[type]}</p>
            </div>
          ))}
        </div>
      </CardContent>

      <Dialog open={Boolean(editingDraft)} onOpenChange={(open) => !open && setEditingDraft(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Sửa khung</DialogTitle>
            <DialogDescription>Chỉnh ngày, giờ bắt đầu và thời lượng. App sẽ chặn khung trùng giờ trong cùng ngày.</DialogDescription>
          </DialogHeader>
          {editingDraft ? (
            <div className="stack-stack">
              <div className="space-y-2">
                <Label htmlFor="time-block-day">Ngày trong tuần</Label>
                <Select
                  value={editingDraft.dayOfWeek}
                  onValueChange={(day) =>
                    setEditingDraft((draft) =>
                      draft ? { ...draft, dayOfWeek: day as TimeBlockDayOfWeek } : draft,
                    )
                  }
                >
                  <SelectTrigger id="time-block-day">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_BLOCK_DAYS.map((day) => (
                      <SelectItem key={day} value={day}>
                        {DAY_LABELS[day]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="time-block-start">Giờ bắt đầu</Label>
                  <Input
                    id="time-block-start"
                    type="time"
                    value={editingDraft.startTime}
                    onChange={(event) =>
                      setEditingDraft((draft) => (draft ? { ...draft, startTime: event.target.value } : draft))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time-block-duration">Thời lượng phút</Label>
                  <Input
                    id="time-block-duration"
                    type="number"
                    min={15}
                    max={300}
                    step={15}
                    value={editingDraft.durationMinutes}
                    onChange={(event) =>
                      setEditingDraft((draft) =>
                        draft ? { ...draft, durationMinutes: event.target.value } : draft,
                      )
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="time-block-note">Ghi chú</Label>
                <Input
                  id="time-block-note"
                  value={editingDraft.note}
                  onChange={(event) =>
                    setEditingDraft((draft) => (draft ? { ...draft, note: event.target.value } : draft))
                  }
                />
              </div>

              {error ? (
                <p role="alert" className="text-sm font-medium text-rose-700">
                  {error}
                </p>
              ) : null}

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={() => setEditingDraft(null)}>
                  Huỷ
                </Button>
                <Button type="button" onClick={handleSaveDraft}>
                  Lưu khung
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
