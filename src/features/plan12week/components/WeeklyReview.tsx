import { useMemo, useState } from "react";
import type { ComponentProps } from "react";

import { TwelveWeekWeekTab } from "@/app/components/twelve-week/TwelveWeekWeekTab";
import { Card, CardContent } from "@/app/components/ui/card";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";

export interface WeeklyReviewProps extends ComponentProps<typeof TwelveWeekWeekTab> {
  currentWeekNumber?: number;
  initialReflection?: string;
  initialAdjustments?: string;
  submitWeeklyReview?: (
    weekNumber: number,
    reflection?: string,
    adjustments?: string,
  ) => void;
}

export function WeeklyReview({
  currentWeekNumber,
  initialReflection,
  initialAdjustments,
  submitWeeklyReview,
  onSaveWeeklyReview,
  ...props
}: WeeklyReviewProps) {
  const [reflection, setReflection] = useState(initialReflection ?? "");
  const [adjustments, setAdjustments] = useState(initialAdjustments ?? "");

  const normalizedWeekNumber = useMemo(() => {
    if (typeof currentWeekNumber !== "number") return undefined;
    return Number.isFinite(currentWeekNumber) ? currentWeekNumber : undefined;
  }, [currentWeekNumber]);

  const handleSaveWeeklyReview = () => {
    onSaveWeeklyReview();

    if (typeof normalizedWeekNumber === "number") {
      submitWeeklyReview?.(
        normalizedWeekNumber,
        reflection.trim() || undefined,
        adjustments.trim() || undefined,
      );
    }
  };

  return (
    <div className="space-y-6">
      <TwelveWeekWeekTab
        {...props}
        onSaveWeeklyReview={handleSaveWeeklyReview}
      />

      <Card className="border border-white/70 bg-white/82">
        <CardContent className="space-y-4 p-5">
          <div className="space-y-2">
            <Label htmlFor="weekly-reflection-note">Reflection</Label>
            <Textarea
              id="weekly-reflection-note"
              rows={3}
              value={reflection}
              placeholder="What was the most important lesson from this week?"
              onChange={(event) => setReflection(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="weekly-adjustments-note">Adjustments</Label>
            <Textarea
              id="weekly-adjustments-note"
              rows={3}
              value={adjustments}
              placeholder="What should be adjusted next week for better consistency?"
              onChange={(event) => setAdjustments(event.target.value)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
