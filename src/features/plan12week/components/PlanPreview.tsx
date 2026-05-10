import { useState, useCallback } from "react";
import { Edit2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/app/components/ui/accordion";
import { useBreakpoint } from "@/app/hooks/useBreakpoint";
import { PlanQualityPanel } from "./PlanQualityPanel";
import type { LeadIndicatorDraft } from "@/app/pages/12WeekSetup/types";
import type { TwelveWeekSetupDraft } from "@/app/pages/12WeekSetup/types";

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
  const accordionItemClass = "rounded-[var(--r-card)] border border-slate-200 bg-white/92 px-5 shadow-sm";
  const accordionTriggerClass = "text-base font-semibold text-slate-900 hover:no-underline";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Xem trÆ°á»›c káº¿ hoáº¡ch 12 tuáº§n</h2>
        <p className="text-muted-foreground mt-1">
          Kiá»ƒm tra láº¡i káº¿ hoáº¡ch trÆ°á»›c khi xÃ¡c nháº­n táº¡o. Báº¡n cÃ³ thá»ƒ chá»‰nh sá»­a cÃ¡c viá»‡c láº·p láº¡i.
        </p>
      </div>

      <Accordion
        key={isDesktop ? "plan-preview-desktop" : "plan-preview-mobile"}
        type="single"
        collapsible
        defaultValue={isDesktop ? "outcome-summary" : undefined}
        className="grid gap-3"
      >
        <AccordionItem value="outcome-summary" className={accordionItemClass}>
          <AccordionTrigger className={accordionTriggerClass}>Outcome summary</AccordionTrigger>
          <AccordionContent className="space-y-4 pb-5">
            <div className="rounded-[var(--r-control)] bg-muted p-3">
              <p className="text-sm font-medium">Tầm nhìn 12 tuần:</p>
              <p className="text-sm text-muted-foreground">{previewPlan.vision || draft.vision12Week}</p>
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
          <AccordionTrigger className={accordionTriggerClass}>Lead indicators preview</AccordionTrigger>
          <AccordionContent className="space-y-3 pb-5">
            {weekOneLeadMetrics.length > 0 ? (
              weekOneLeadMetrics.map((leadMetric) => (
                <div key={leadMetric.name} className="rounded-[var(--r-control)] border border-slate-200 bg-slate-50 p-3">
                  <p className="text-sm font-medium text-slate-900">{leadMetric.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Mục tiêu tuần: {leadMetric.weeklyTarget}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Chưa có việc lặp lại.</p>
            )}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="schedule-preview" className={accordionItemClass}>
          <AccordionTrigger className={accordionTriggerClass}>Schedule preview</AccordionTrigger>
          <AccordionContent className="space-y-4 pb-5">
            {week1 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Tuáº§n 1 (Chi tiáº¿t)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="rounded-[var(--r-control)] bg-muted p-3">
                      <p className="text-sm font-medium">Trá»ng tÃ¢m:</p>
                      <p className="text-sm text-muted-foreground">{week1.focus}</p>
                    </div>

                    {week1.expectedOutput && (
                      <div className="rounded-[var(--r-control)] bg-muted p-3">
                        <p className="text-sm font-medium">Káº¿t quáº£ dá»± kiáº¿n:</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-line">{week1.expectedOutput}</p>
                      </div>
                    )}

                    <div>
                      <p className="text-sm font-medium mb-2">CÃ¡c viá»‡c cáº§n lÃ m:</p>
                      <div className="space-y-2">
                        {week1.tasks.map((task, idx) => (
                          <div
                            key={task.id}
                            className={`flex items-start gap-3 rounded-[var(--r-control)] border p-3 ${
                              task.title.startsWith("[Cá»T Lá»–I]")
                                ? "border-orange-200 bg-orange-50"
                                : "border-gray-200"
                            }`}
                          >
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--r-pill)] bg-primary text-xs font-medium text-primary-foreground">
                              {idx + 1}
                            </span>
                            <div className="flex-1">
                              <p className="text-sm">{task.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(task.scheduledDate).toLocaleDateString("vi-VN", {
                                  weekday: "long",
                                  day: "numeric",
                                  month: "numeric",
                                })}
                              </p>
                            </div>
                            {task.title.startsWith("[Cá»T Lá»–I]") && <Badge variant="secondary">Cá»‘t lÃµi</Badge>}
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
                <CardTitle className="text-lg">Tuáº§n 2-4 (TÃ³m táº¯t)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {weeks24.map((week) => (
                    <div key={week.weekNumber} className="rounded-[var(--r-control)] border p-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Tuáº§n {week.weekNumber}</h4>
                        <Button variant="ghost" size="sm" onClick={() => toggleWeekExpansion(week.weekNumber)}>
                          {expandedWeeks.has(week.weekNumber) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </div>

                      {week.focus && <p className="text-sm text-muted-foreground mt-1">Trá»ng tÃ¢m: {week.focus}</p>}

                      {expandedWeeks.has(week.weekNumber) && (
                        <div className="mt-3 space-y-2 border-t pt-3">
                          <p className="text-sm">
                            <span className="font-medium">Káº¿t quáº£:</span> {week.expectedOutput || "ChÆ°a cÃ³"}
                          </p>
                          <p className="text-sm">
                            <span className="font-medium">Viá»‡c láº·p láº¡i:</span>{" "}
                            {week.leadMetrics.map((lm) => lm.name).join(", ") || "ChÆ°a cÃ³"}
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
          <AccordionTrigger className={accordionTriggerClass}>Tactics list</AccordionTrigger>
          <AccordionContent className="pb-5">
            <div className="space-y-3">
              {draft.leadIndicators.map((indicator: LeadIndicatorDraft, idx: number) => (
                <div
                  key={indicator.id}
                  className={`flex items-center justify-between rounded-[var(--r-control)] border p-3 ${
                    idx < 2 ? "border-green-200 bg-green-50" : "border-gray-200"
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{indicator.name}</span>
                      {idx < 2 && (
                        <Badge variant="outline" className="bg-green-100 text-green-800 text-xs">
                          Cá»‘t lÃµi
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Má»¥c tiÃªu: {indicator.target} láº§n/tuáº§n
                      {draft.preferredDays && draft.preferredDays.length > 0 && (
                        <> â€¢ Trong cÃ¡c ngÃ y: {draft.preferredDays.map((d: number) => `T${d}`).join(", ")}</>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <Button variant="outline" className="mt-3 w-full" onClick={onEditTactics}>
              <Edit2 className="mr-2 h-4 w-4" />
              Chá»‰nh sá»­a viá»‡c láº·p láº¡i
            </Button>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Actions */}
      <div className="flex justify-between gap-4">
        <Button variant="outline" onClick={onBack} disabled={loading}>
          Quay láº¡i sá»­a
        </Button>
        <div className="flex flex-col items-end gap-2">
          {validationMessage ? (
            <p role="alert" className="max-w-md text-right text-sm font-medium text-rose-700">
              {validationMessage}
            </p>
          ) : null}
          <Button onClick={onConfirm} disabled={loading || !canConfirm}>
            {loading ? "Äang táº¡o..." : "XÃ¡c nháº­n táº¡o káº¿ hoáº¡ch"}
          </Button>
        </div>
      </div>
    </div>
  );
}
