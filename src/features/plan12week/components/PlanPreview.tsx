import { useState, useCallback } from "react";
import { Edit2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
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
}

export function PlanPreview({
  draft,
  previewPlan,
  onEditTactics,
  onConfirm,
  onBack,
  loading = false,
}: PlanPreviewProps) {
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set([2, 3, 4]));

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Xem trước kế hoạch 12 tuần</h2>
        <p className="text-muted-foreground mt-1">
          Kiểm tra lại kế hoạch trước khi xác nhận tạo. Bạn có thể chỉnh sửa các việc lặp lại.
        </p>
      </div>

      {/* Quality Validation Panel */}
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

      {/* Week 1 - Expanded */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Tuần 1 (Chi tiết)</CardTitle>
        </CardHeader>
        <CardContent>
          {week1 && (
            <div className="space-y-4">
              <div className="rounded-md bg-muted p-3">
                <p className="text-sm font-medium">Trọng tâm:</p>
                <p className="text-sm text-muted-foreground">{week1.focus}</p>
              </div>

              {week1.expectedOutput && (
                <div className="rounded-md bg-muted p-3">
                  <p className="text-sm font-medium">Kết quả dự kiến:</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {week1.expectedOutput}
                  </p>
                </div>
              )}

              <div>
                <p className="text-sm font-medium mb-2">Các việc cần làm:</p>
                <div className="space-y-2">
                  {week1.tasks.map((task, idx) => (
                    <div
                      key={task.id}
                      className={`flex items-start gap-3 rounded-md border p-3 ${
                        task.title.startsWith("[CỐT LỖI]")
                          ? "border-orange-200 bg-orange-50"
                          : "border-gray-200"
                      }`}
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
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
                      {task.title.startsWith("[CỐT LỖI]") && (
                        <Badge variant="secondary">Cốt lõi</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weeks 2-4 - Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Tuần 2-4 (Tóm tắt)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {weeks24.map((week) => (
              <div key={week.weekNumber} className="rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Tuần {week.weekNumber}</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleWeekExpansion(week.weekNumber)}
                  >
                    {expandedWeeks.has(week.weekNumber) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {week.focus && (
                  <p className="text-sm text-muted-foreground mt-1">Trọng tâm: {week.focus}</p>
                )}

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

      {/* Tactics Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Các việc lặp lại</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {draft.leadIndicators.map((indicator: LeadIndicatorDraft, idx: number) => (
              <div
                key={indicator.id}
                className={`flex items-center justify-between rounded-md border p-3 ${
                  idx < 2 ? "border-green-200 bg-green-50" : "border-gray-200"
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
                  <p className="text-sm text-muted-foreground mt-1">
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
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between gap-4">
        <Button variant="outline" onClick={onBack} disabled={loading}>
          Quay lại sửa
        </Button>
        <Button onClick={onConfirm} disabled={loading}>
          {loading ? "Đang tạo..." : "Xác nhận tạo kế hoạch"}
        </Button>
      </div>
    </div>
  );
}
