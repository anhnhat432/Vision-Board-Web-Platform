import { CalendarDays, ChevronDown, ChevronRight, Edit2, Target, Zap } from "lucide-react";
import { useCallback, useState } from "react";
import { PhaseHarvestChipIcon, PhasePeakChipIcon, PhaseRampChipIcon } from "@/app/components/illustrations";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/app/components/ui/accordion";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { useBreakpoint } from "@/app/hooks/useBreakpoint";
import type { LeadIndicatorDraft, TwelveWeekSetupDraft } from "@/app/pages/12WeekSetup/types";
import { FEATURE_TERMS } from "@/app/utils/user-facing-copy";
import { PlanQualityPanel } from "./PlanQualityPanel";

interface PlanPreviewProps {
  /** The current draft with all user inputs */
  draft: TwelveWeekSetupDraft;
  /** Preview plan generated from draft (with tactics & week1 tasks) */
  previewPlan: {
    vision: string;
    weeks: Array<{
      weekNumber: number;
      focus: string;
      expectedOutput: string;
      leadMetrics: Array<{ name: string; weeklyTarget: number }>;
      tasks: Array<{ id: string; title: string; scheduledDate: string }>;
    }>;
  };
  /** Called when user wants to edit tactics */
  onEditTactics: () => void;
  /** Called when user confirms the plan */
  onConfirm: () => void;
  /** Called when user wants to go back */
  onBack: () => void;
  /** Loading state */
  loading?: boolean;
  /** Field-specific validation message that blocks confirmation */
  validationMessage?: string | null;
  /** Whether the current preview can be confirmed */
  canConfirm?: boolean;
}

const TIMELINE_PHASES = [
  {
    label: FEATURE_TERMS.ramp,
    weekStart: 1,
    weekEnd: 4,
    icon: PhaseRampChipIcon,
    tileClassName: "border-app-accent-soft bg-app-accent-soft/40 text-app-accent hover:border-app-accent/60",
    activeClassName: "border-app-accent bg-app-accent text-white shadow-app-sm",
  },
  {
    label: FEATURE_TERMS.peak,
    weekStart: 5,
    weekEnd: 8,
    icon: PhasePeakChipIcon,
    tileClassName: "border-app-warm-border bg-app-warm/30 text-app-warm-strong hover:border-app-warm-strong/40",
    activeClassName: "border-app-warm-strong bg-app-warm-strong text-white shadow-app-sm",
  },
  {
    label: FEATURE_TERMS.harvest,
    weekStart: 9,
    weekEnd: 12,
    icon: PhaseHarvestChipIcon,
    tileClassName:
      "border-app-accent/30 bg-app-accent-soft text-app-accent hover:border-app-accent/50",
    activeClassName: "border-app-accent bg-app-accent text-app-ink-on-accent shadow-app-sm",
  },
];

const getTimelinePhase = (weekNumber: number) =>
  TIMELINE_PHASES.find((phase) => weekNumber >= phase.weekStart && weekNumber <= phase.weekEnd) ?? TIMELINE_PHASES[0];

export function PlanPreview({
  draft,
  previewPlan,
  onEditTactics,
  onConfirm,
  onBack,
  loading = false,
  validationMessage,
  canConfirm = true,
}: PlanPreviewProps) {
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set([2, 3, 4]));
  const [selectedTimelineWeek, setSelectedTimelineWeek] = useState(1);
  const isDesktop = useBreakpoint();

  const toggleWeekExpansion = useCallback((weekNum: number) => {
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(weekNum)) {
        next.delete(weekNum);
      } else {
        next.add(weekNum);
      }
      return next;
    });
  }, []);

  const week1 = previewPlan.weeks.find((w) => w.weekNumber === 1);
  const weeks24 = previewPlan.weeks.filter((w) => w.weekNumber >= 2 && w.weekNumber <= 4);
  const weekOneLeadMetrics = week1?.leadMetrics ?? [];
  const selectedTimelineWeekData =
    previewPlan.weeks.find((week) => week.weekNumber === selectedTimelineWeek) ?? previewPlan.weeks[0];
  const selectedTimelinePhase = getTimelinePhase(selectedTimelineWeekData?.weekNumber ?? 1);
  const SelectedTimelinePhaseIcon = selectedTimelinePhase.icon;
  const totalWeekOneTasks = week1?.tasks.length ?? 0;
  const accordionItemClass = "surface-raised rounded-xl border border-app-line bg-app-surface px-5";
  const accordionTriggerClass = "text-base font-semibold text-app-ink hover:no-underline";

  return (
    <div className="stack-section">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Xem trước kế hoạch 12 tuần</h2>
        <p className="text-app-ink-soft mt-1">
          Kiểm tra lại kế hoạch trước khi xác nhận tạo. Bạn có thể chỉnh sửa các việc lặp lại.
        </p>
      </div>

      <section className="surface-raised rounded-xl border border-app-line bg-app-surface p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--r-tile)] bg-app-accent-soft text-app-accent">
              <CalendarDays className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h3 className="text-base font-semibold text-app-ink">Timeline 12 tuần</h3>
              <p className="mt-1 text-sm leading-6 text-app-ink-soft">
                {FEATURE_TERMS.ramp} 4 tuần đầu, {FEATURE_TERMS.peak} 4 tuần giữa, {FEATURE_TERMS.harvest} 4 tuần cuối.
                Chọn từng tuần để xem nhịp dự kiến.
              </p>
            </div>
          </div>
          <Badge variant="brand" className="shrink-0">
            12 tuần
          </Badge>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-12">
          {previewPlan.weeks.map((week) => {
            const phase = getTimelinePhase(week.weekNumber);
            const isSelected = selectedTimelineWeekData?.weekNumber === week.weekNumber;
            const PhaseIcon = phase.icon;

            return (
              <button
                key={week.weekNumber}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelectedTimelineWeek(week.weekNumber)}
                className={`rounded-[var(--r-tile)] border px-2 py-3 text-center text-xs font-semibold transition-colors ${
                  isSelected ? phase.activeClassName : phase.tileClassName
                }`}
              >
                <PhaseIcon className="mx-auto mb-1 h-4 w-4" />
                <span className="block text-sm">W{week.weekNumber}</span>
                <span className="mt-1 block text-xs opacity-80">{phase.label}</span>
              </button>
            );
          })}
        </div>
        {selectedTimelineWeekData ? (
          <div className="mt-4 rounded-[var(--r-tile)] border border-app-line bg-app-bg p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-app-ink">
                <SelectedTimelinePhaseIcon className="mr-1 inline h-4 w-4 align-[-0.125em]" />
                Tuần {selectedTimelineWeekData.weekNumber} · {selectedTimelinePhase.label}
              </p>
              <Badge variant={selectedTimelineWeekData.weekNumber <= 4 ? "brand" : "neutral"}>
                {selectedTimelineWeekData.tasks.length > 0
                  ? `${selectedTimelineWeekData.tasks.length} việc tuần này`
                  : `${selectedTimelineWeekData.leadMetrics.length} việc lặp lại`}
              </Badge>
            </div>
            <div className="mt-3 stack-tight text-sm leading-6 text-app-ink-soft">
              {selectedTimelineWeekData.tasks.length > 0 ? (
                selectedTimelineWeekData.tasks.slice(0, 3).map((task) => (
                  <p key={task.id} className="rounded-[var(--r-control)] bg-app-surface px-3 py-2">
                    {task.title}
                  </p>
                ))
              ) : (
                <p className="rounded-[var(--r-control)] bg-app-surface px-3 py-2">
                  Tuần này giữ cùng nhịp việc lặp lại và dùng review tuần để điều chỉnh tải.
                </p>
              )}
            </div>
          </div>
        ) : null}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[var(--r-tile)] border border-app-accent-soft bg-app-accent-soft/30 p-3">
            <Target className="h-4 w-4 text-app-accent" aria-hidden="true" />
            <p className="mt-2 text-xs uppercase tracking-[0.14em] text-app-accent">Kết quả</p>
            <p className="mt-1 text-sm font-semibold text-app-ink">1 mục tiêu 12 tuần</p>
          </div>
          <div className="rounded-[var(--r-tile)] border border-app-accent/30 bg-app-accent-soft/50 p-3">
            <Zap className="h-4 w-4 text-app-accent" aria-hidden="true" />
            <p className="mt-2 text-xs uppercase tracking-[0.14em] text-app-accent">Lead</p>
            <p className="mt-1 text-sm font-semibold text-app-ink">{weekOneLeadMetrics.length} việc lặp lại</p>
          </div>
          <div className="rounded-[var(--r-tile)] border border-app-status-warning/30 bg-app-status-warning/10 p-3">
            <CalendarDays className="h-4 w-4 text-app-status-warning" aria-hidden="true" />
            <p className="mt-2 text-xs uppercase tracking-[0.14em] text-app-status-warning">Week 1</p>
            <p className="mt-1 text-sm font-semibold text-app-ink">{totalWeekOneTasks} việc đầu tiên</p>
          </div>
        </div>
      </section>

      <Accordion
        key={isDesktop ? "plan-preview-desktop" : "plan-preview-mobile"}
        type="single"
        collapsible
        defaultValue={isDesktop ? "outcome-summary" : undefined}
        className="grid gap-3"
      >
        <AccordionItem value="outcome-summary" className={accordionItemClass}>
          <AccordionTrigger className={accordionTriggerClass}>Tóm tắt kết quả</AccordionTrigger>
          <AccordionContent className="space-y-4 pb-5">
            <div className="rounded-[var(--r-control)] bg-app-bg p-3">
              <p className="text-sm font-medium">Tầm nhìn 12 tuần:</p>
              <p className="text-sm text-app-ink-soft">{previewPlan.vision || draft.vision12Week}</p>
            </div>
            <PlanQualityPanel
              plan={previewPlan}
              context={{
                weeklyTaskCount: week1?.tasks.length ?? 0,
                firstTaskTitle: week1?.tasks[0]?.title,
                feasibility: draft.tacticLoadPreference
                  ? {
                      planLoad: draft.tacticLoadPreference,
                      weeklyCapacity: "medium" as const,
                    }
                  : undefined,
              }}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="lead-indicators-preview" className={accordionItemClass}>
          <AccordionTrigger className={accordionTriggerClass}>Xem trước việc lặp lại</AccordionTrigger>
          <AccordionContent className="space-y-3 pb-5">
            {weekOneLeadMetrics.length > 0 ? (
              weekOneLeadMetrics.map((leadMetric) => (
                <div key={leadMetric.name} className="rounded-[var(--r-control)] border border-app-line bg-app-bg p-3">
                  <p className="text-sm font-medium text-app-ink">{leadMetric.name}</p>
                  <p className="mt-1 text-sm text-app-ink-soft">Mục tiêu tuần: {leadMetric.weeklyTarget}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-app-ink-soft">Chưa có việc lặp lại.</p>
            )}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="schedule-preview" className={accordionItemClass}>
          <AccordionTrigger className={accordionTriggerClass}>Xem trước lịch</AccordionTrigger>
          <AccordionContent className="space-y-4 pb-5">
            {week1 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Tuần 1 (Chi tiết)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="rounded-[var(--r-control)] bg-app-bg p-3">
                      <p className="text-sm font-medium">Trọng tâm:</p>
                      <p className="text-sm text-app-ink-soft">{week1.focus}</p>
                    </div>

                    {week1.expectedOutput && (
                      <div className="rounded-[var(--r-control)] bg-app-bg p-3">
                        <p className="text-sm font-medium">Kết quả dự kiến:</p>
                        <p className="text-sm text-app-ink-soft whitespace-pre-line">{week1.expectedOutput}</p>
                      </div>
                    )}

                    <div>
                      <p className="text-sm font-medium mb-2">Các việc cần làm:</p>
                      <div className="space-y-2">
                        {week1.tasks.map((task, idx) => (
                          <div
                            key={task.id}
                            className={`flex items-start gap-3 rounded-[var(--r-control)] border p-3 ${
                              task.title.startsWith("[CỐT LÕI]") ? "border-orange-200 bg-orange-50" : "border-app-line"
                            }`}
                          >
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--r-pill)] bg-app-accent text-xs font-medium text-white">
                              {idx + 1}
                            </span>
                            <div className="flex-1">
                              <p className="text-sm">{task.title}</p>
                              <p className="text-xs text-app-ink-soft">
                                {new Date(task.scheduledDate).toLocaleDateString("vi-VN", {
                                  weekday: "long",
                                  day: "numeric",
                                  month: "numeric",
                                })}
                              </p>
                            </div>
                            {task.title.startsWith("[CỐT LÕI]") && <Badge variant="secondary">Cốt lõi</Badge>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Tuần 2-4 (Tóm tắt)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {weeks24.map((week) => (
                    <div key={week.weekNumber} className="rounded-[var(--r-control)] border p-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Tuần {week.weekNumber}</h4>
                        <Button variant="ghost" size="sm" onClick={() => toggleWeekExpansion(week.weekNumber)}>
                          {expandedWeeks.has(week.weekNumber) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </div>

                      {week.focus && <p className="text-sm text-app-ink-soft mt-1">Trọng tâm: {week.focus}</p>}

                      {expandedWeeks.has(week.weekNumber) && (
                        <div className="mt-3 space-y-2 border-t pt-3">
                          <p className="text-sm">
                            <span className="font-medium">Kết quả:</span> {week.expectedOutput || "Chưa có"}
                          </p>
                          <p className="text-sm">
                            <span className="font-medium">Việc lặp lại:</span>{" "}
                            {week.leadMetrics.map((lm) => lm.name).join(", ") || "Chưa có"}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="tactics-list" className={accordionItemClass}>
          <AccordionTrigger className={accordionTriggerClass}>Danh sách việc</AccordionTrigger>
          <AccordionContent className="pb-5">
            <div className="space-y-3">
              {draft.leadIndicators.map((indicator: LeadIndicatorDraft, idx: number) => (
                <div
                  key={indicator.id}
                  className={`flex items-center justify-between rounded-[var(--r-control)] border p-3 ${
                    idx < 2 ? "border-green-200 bg-green-50" : "border-app-line"
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{indicator.name}</span>
                      {idx < 2 && (
                        <Badge variant="outline" className="bg-green-100 text-green-800 text-xs">
                          Cốt lõi
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-app-ink-soft mt-1">
                      Mục tiêu: {indicator.target} lần/tuần
                      {draft.preferredDays && draft.preferredDays.length > 0 && (
                        <> • Trong các ngày: {draft.preferredDays.map((d: number) => `T${d}`).join(", ")}</>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <Button variant="outline" className="mt-3 w-full" onClick={onEditTactics}>
              <Edit2 className="mr-2 h-4 w-4" />
              Chỉnh sửa việc lặp lại
            </Button>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Actions */}
      <div className="flex justify-between gap-4">
        <Button variant="outline" onClick={onBack} disabled={loading}>
          Quay lại sửa
        </Button>
        <div className="flex flex-col items-end gap-2">
          {validationMessage ? (
            <p role="alert" className="max-w-md text-right text-sm font-medium text-rose-700">
              {validationMessage}
            </p>
          ) : null}
          <Button onClick={onConfirm} disabled={loading || !canConfirm}>
            {loading ? "Đang tạo..." : "Xác nhận tạo kế hoạch"}
          </Button>
        </div>
      </div>
    </div>
  );
}
