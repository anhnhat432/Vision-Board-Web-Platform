import { CalendarClock, Clock3, Pencil, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import { getDefaultTimeBlocks, TIME_BLOCK_DAYS, validateTimeBlocks } from "@/features/plan12week/logic/timeBlocks";
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
  strategic: "3 giờ làm sâu, tập trung hoàn thành các tactic cốt lõi quan trọng nhất.",
  buffer: "30-60 phút xử lý nhanh email, công việc hành chính nhỏ, việc rời rạc.",
  breakout: "3 giờ nghỉ ngơi chủ động hoàn toàn để tái tạo lại sức lao động sáng tạo.",
};

const TYPE_CHIP_CLASS: Record<TimeBlockType, string> = {
  strategic: "border-emerald-300 bg-gradient-to-br from-emerald-50 via-emerald-50/60 to-transparent text-emerald-900 dark:from-emerald-950/40 dark:to-transparent dark:text-emerald-300 font-bold",
  buffer: "border-sky-300 bg-gradient-to-br from-sky-50 via-sky-50/60 to-transparent text-sky-900 dark:from-sky-950/40 dark:to-transparent dark:text-sky-300 font-bold",
  breakout: "border-amber-300 bg-gradient-to-br from-amber-50 via-amber-50/60 to-transparent text-amber-900 dark:from-amber-950/40 dark:to-transparent dark:text-amber-300 font-bold",
};

const TYPE_CARD_CLASS: Record<TimeBlockType, string> = {
  strategic: "border-emerald-200 bg-emerald-50/20 dark:border-emerald-900/30 dark:bg-emerald-950/10",
  buffer: "border-sky-200 bg-sky-50/20 dark:border-sky-900/30 dark:bg-sky-950/10",
  breakout: "border-amber-200 bg-amber-50/20 dark:border-amber-900/30 dark:bg-amber-950/10",
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
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
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
    <Card className="border border-app-line bg-app-surface shadow-lg hover:shadow-xl transition-all duration-300">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-app-ink text-xl font-bold">
              <CalendarClock className="h-5 w-5 text-app-accent animate-pulse" />
              Performance Time Blocking
            </CardTitle>
            <CardDescription className="mt-2 text-app-ink-soft text-sm leading-relaxed">
              Gợi ý nhịp tuần theo 12 Week Year: Khung chiến lược, Khung dự phòng và Khung đột phá. Lịch này chỉ lưu
              trên thiết bị, không đồng bộ lịch.
            </CardDescription>
          </div>
          {sortedBlocks.length === 0 && (
            <Button
              type="button"
              onClick={handleUseDefaults}
              disabled={disabled}
              className="border-app-accent bg-app-accent-soft text-app-accent hover:bg-app-accent hover:text-white transition-all duration-200 shadow-sm rounded-lg"
            >
              <Sparkles className="h-4 w-4" />
              Dùng gợi ý mặc định
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="stack-stack space-y-6">
        {/* 7 Days Glassmorphism Grid V2 */}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
          {blocksByDay.map(({ day, blocks }) => (
            <div
              key={day}
              className="min-h-40 rounded-xl border border-slate-200/60 bg-slate-50/40 p-4 transition-all duration-300 hover:bg-slate-50/60 hover:shadow-sm"
            >
              <p className="text-sm font-bold text-slate-900 tracking-wide border-b border-slate-200/50 pb-2 mb-3">
                {DAY_LABELS[day]}
              </p>
              <div className="space-y-3">
                {blocks.length === 0 ? (
                  <p className="text-xs italic text-slate-400 py-1">Chưa có khung.</p>
                ) : (
                  blocks.map((block) => (
                    <div
                      key={block.id}
                      data-testid="weekly-time-block-chip"
                      className={`rounded-xl border p-3.5 text-xs shadow-sm hover:scale-[1.02] hover:shadow-md transition-all duration-200 ${TYPE_CHIP_CLASS[block.type]}`}
                    >
                      <p className="font-bold tracking-wide text-slate-950 dark:text-inherit">{TYPE_LABELS[block.type]}</p>
                      <p className="mt-1.5 flex items-center gap-1.5 font-medium text-slate-800 dark:text-inherit/90">
                        <Clock3 className="h-3.5 w-3.5" />
                        {block.startTime} · {formatDuration(block.durationMinutes)}
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="mt-3.5 h-7 w-full px-2 text-xs border border-current/20 hover:bg-current/10 font-bold transition-all duration-200 rounded-lg"
                        disabled={disabled}
                        onClick={() => {
                          setError(null);
                          setEditingDraft(createDraft(block));
                        }}
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Sửa khung
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Explain Cards V2 */}
        <div className="grid gap-4 md:grid-cols-3">
          {(["strategic", "buffer", "breakout"] as const).map((type) => (
            <div
              key={type}
              className={`rounded-xl border p-5 shadow-sm hover:shadow-md transition-all duration-300 ${TYPE_CARD_CLASS[type]}`}
            >
              <Badge variant="outline" className={`${TYPE_CHIP_CLASS[type]} px-2.5 py-0.5 rounded-full text-xs shadow-sm`}>
                {TYPE_LABELS[type]}
              </Badge>
              <p className="mt-3 text-sm leading-relaxed font-medium text-slate-700 dark:text-slate-300">
                {TYPE_DESCRIPTIONS[type]}
              </p>
            </div>
          ))}
        </div>
      </CardContent>

      <Dialog open={Boolean(editingDraft)} onOpenChange={(open) => !open && setEditingDraft(null)}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-app-ink">Sửa khung thời gian</DialogTitle>
            <DialogDescription className="text-sm text-app-ink-soft mt-1">
              Chỉnh ngày, giờ bắt đầu và thời lượng. Hệ thống tự động ngăn chặn trùng lặp khung giờ trong ngày.
            </DialogDescription>
          </DialogHeader>
          {editingDraft ? (
            <div className="stack-stack space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="time-block-day" className="text-sm font-bold text-app-ink">Ngày trong tuần</Label>
                <Select
                  value={editingDraft.dayOfWeek}
                  onValueChange={(day) =>
                    setEditingDraft((draft) => (draft ? { ...draft, dayOfWeek: day as TimeBlockDayOfWeek } : draft))
                  }
                >
                  <SelectTrigger id="time-block-day" className="rounded-xl border-app-line">
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
                  <Label htmlFor="time-block-start" className="text-sm font-bold text-app-ink">Giờ bắt đầu</Label>
                  <Input
                    id="time-block-start"
                    type="time"
                    value={editingDraft.startTime}
                    onChange={(event) =>
                      setEditingDraft((draft) => (draft ? { ...draft, startTime: event.target.value } : draft))
                    }
                    className="rounded-xl border-app-line"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time-block-duration" className="text-sm font-bold text-app-ink">Thời lượng (phút)</Label>
                  <Input
                    id="time-block-duration"
                    type="number"
                    min={15}
                    max={300}
                    step={15}
                    value={editingDraft.durationMinutes}
                    onChange={(event) =>
                      setEditingDraft((draft) => (draft ? { ...draft, durationMinutes: event.target.value } : draft))
                    }
                    className="rounded-xl border-app-line"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="time-block-note" className="text-sm font-bold text-app-ink">Ghi chú</Label>
                <Input
                  id="time-block-note"
                  value={editingDraft.note}
                  onChange={(event) =>
                    setEditingDraft((draft) => (draft ? { ...draft, note: event.target.value } : draft))
                  }
                  className="rounded-xl border-app-line"
                  placeholder="Thêm mục tiêu, công việc phụ..."
                />
              </div>

              {error ? (
                <p role="alert" className="text-sm font-bold text-rose-600 animate-bounce">
                  ⚠️ {error}
                </p>
              ) : null}

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end pt-3">
                <Button type="button" variant="outline" onClick={() => setEditingDraft(null)} className="rounded-xl">
                  Huỷ
                </Button>
                <Button type="button" onClick={handleSaveDraft} className="bg-app-accent hover:bg-app-accent/90 text-white rounded-xl font-bold px-5">
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
