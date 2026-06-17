import { ArrowRight, CheckCircle2, Compass, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  dismissNewUserGuide,
  getNewUserGuideProgress,
  isNewUserGuideDismissed,
  restoreNewUserGuide,
  subscribeToNewUserGuideChanges,
} from "../utils/new-user-guide";
import type { UserData } from "../utils/storage-types";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";

interface NewUserGuideBannerProps {
  userData: UserData;
  variant?: "full" | "compact";
  onOpenGuide?: () => void;
}

interface NewUserGuideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userData: UserData;
}

function emitOpenGuide() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("visionboard:open-guide"));
}

function useGuideVisibility() {
  const [dismissed, setDismissed] = useState(isNewUserGuideDismissed());

  useEffect(() => subscribeToNewUserGuideChanges(() => setDismissed(isNewUserGuideDismissed())), []);

  return {
    dismissed,
    dismiss: () => dismissNewUserGuide(),
    restore: () => restoreNewUserGuide(),
  };
}

function StepList({ userData }: { userData: UserData }) {
  const progress = useMemo(() => getNewUserGuideProgress(userData), [userData]);

  return (
    <div className="space-y-3">
      {progress.steps.map((step, index) => (
        <div
          key={step.id}
          className={`rounded-[var(--r-control)] border px-4 py-4 ${
            step.completed
              ? "border-emerald-200 bg-emerald-50/90"
              : step.id === progress.nextStep?.id
                ? "border-sky-200 bg-sky-50/90 shadow-lg"
                : "border-app-line bg-app-surface"
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-[var(--r-pill)] text-sm font-semibold ${
                step.completed
                  ? "bg-emerald-600 text-white"
                  : step.id === progress.nextStep?.id
                    ? "bg-app-accent text-white"
                    : "bg-app-bg text-app-ink-soft"
              }`}
            >
              {step.completed ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
            </div>
            <div className="min-w-0 flex-1">
              <p
                className={`text-sm font-semibold ${
                  step.completed
                    ? "text-emerald-900"
                    : step.id === progress.nextStep?.id
                      ? "text-app-ink"
                      : "text-app-ink"
                }`}
              >
                {step.title}
              </p>
              <p
                className={`mt-1 text-sm leading-6 ${
                  step.completed
                    ? "text-emerald-800/80"
                    : step.id === progress.nextStep?.id
                      ? "text-app-ink-soft"
                      : "text-app-ink-soft"
                }`}
              >
                {step.description}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function NewUserGuideBanner({ userData, variant = "full", onOpenGuide }: NewUserGuideBannerProps) {
  const navigate = useNavigate();
  const { dismissed, dismiss } = useGuideVisibility();
  const progress = useMemo(() => getNewUserGuideProgress(userData), [userData]);

  if (dismissed || progress.isComplete) return null;

  const nextStep = progress.nextStep;
  const compact = variant === "compact";
  const title = userData.isHydratedFromDemo
    ? compact
      ? "Xem nhanh lộ trình dùng app"
      : "Đang xem dữ liệu mẫu? Đi theo lộ trình này để hiểu luồng chính của app."
    : compact
      ? "Đi theo lộ trình gợi ý"
      : `Đi theo ${progress.totalSteps} bước này để không bị lạc.`;
  const description = userData.isHydratedFromDemo
    ? "Web đã có dữ liệu mẫu sẵn. Lộ trình này giúp bạn hiểu màn nào làm trước, màn nào làm sau."
    : "Đi đúng thứ tự sẽ dễ hơn: đánh giá, chọn trọng tâm, viết SMART Goal, rồi bắt đầu chu kỳ 12 tuần.";
  const surfaceClass = compact
    ? "max-w-full overflow-hidden border border-app-line bg-app-surface shadow-sm"
    : "max-w-full overflow-hidden border border-app-line bg-app-surface text-app-ink shadow-sm";
  const contentClass = compact ? "p-4" : "p-5 sm:p-6 lg:p-7";
  const layoutClass = compact
    ? "grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] lg:items-center"
    : "grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]";
  const badgeClass = "border-app-line bg-app-bg text-app-ink-soft";
  const demoBadgeClass = "border-app-warm-border bg-app-warm/30 text-app-warm-strong";
  const descriptionClass = "text-app-ink-soft";
  const primaryButtonClass = "w-full justify-center bg-app-accent text-white hover:bg-app-ink sm:w-auto";
  const secondaryButtonClass =
    "w-full justify-center border-app-line bg-app-surface text-app-ink hover:bg-app-bg sm:w-auto";
  const ghostButtonClass = "w-full justify-center text-app-ink-muted hover:bg-app-bg hover:text-app-ink sm:w-auto";

  return (
    <Card className={surfaceClass}>
      <CardContent className={contentClass}>
        <div className={layoutClass}>
          <div className={compact ? "space-y-3" : "space-y-4"}>
            <Badge variant="outline" className={badgeClass}>
              <Compass className="mr-2 h-3.5 w-3.5" />
              Hướng dẫn cho người mới
            </Badge>
            <div>
              <h2 className={`${compact ? "text-lg" : "text-2xl"} font-bold tracking-normal text-app-ink`}>{title}</h2>
              <p className={`mt-2 max-w-2xl text-sm leading-7 ${compact ? "line-clamp-2" : ""} ${descriptionClass}`}>
                {description}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline" className={badgeClass}>
                {progress.completedCount}/{progress.totalSteps} bước đã xong
              </Badge>
              {userData.isHydratedFromDemo && (
                <Badge variant="outline" className={demoBadgeClass}>
                  Dữ liệu mẫu
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              {nextStep && (
                <Button onClick={() => navigate(nextStep.href)} className={primaryButtonClass}>
                  {nextStep.ctaLabel}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  if (onOpenGuide) {
                    onOpenGuide();
                    return;
                  }

                  emitOpenGuide();
                }}
                className={secondaryButtonClass}
              >
                Xem cách đi
              </Button>
              <Button variant="ghost" onClick={dismiss} className={ghostButtonClass}>
                Ẩn hướng dẫn này
              </Button>
            </div>
          </div>

          {!compact && (
            <div className="space-y-3 rounded-[var(--r-control)] border border-app-line bg-app-bg p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-ink-muted">
                Trạng thái hiện tại
              </p>
              <StepList userData={userData} />
            </div>
          )}

          {compact && nextStep && (
            <div className="rounded-[var(--r-control)] border border-app-line bg-app-bg p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-ink-muted">Bước nên làm tiếp</p>
              <p className="mt-2 text-base font-semibold text-app-ink">{nextStep.title}</p>
              <p className="mt-2 line-clamp-2 text-sm leading-7 text-app-ink-soft">{nextStep.description}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function NewUserGuideDialog({ open, onOpenChange, userData }: NewUserGuideDialogProps) {
  const navigate = useNavigate();
  const { dismissed, dismiss, restore } = useGuideVisibility();
  const progress = useMemo(() => getNewUserGuideProgress(userData), [userData]);
  const nextStep = progress.nextStep;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-[calc(100%-1rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="inline-flex w-fit items-center gap-2 rounded-[var(--r-pill)] border border-app-line bg-app-bg px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-app-ink-soft">
            <Sparkles className="h-3.5 w-3.5" />
            Cách bắt đầu nhanh
          </div>
          <DialogTitle className="text-xl tracking-normal text-app-ink sm:text-2xl">
            {userData.isHydratedFromDemo
              ? "Xem nhanh luồng chính của app theo đúng thứ tự."
              : `Đi theo ${progress.totalSteps} bước này để biết nên làm gì trước.`}
          </DialogTitle>
          <DialogDescription className="text-sm leading-6 text-app-ink-soft">
            {userData.isHydratedFromDemo
              ? "Web đã có dữ liệu mẫu sẵn. Đi theo thứ tự này để hiểu luồng thật."
              : "Nếu mới dùng lần đầu, đây là đường đi ngắn nhất để có kết quả đầu tiên mà không bị rối."}
          </DialogDescription>
        </DialogHeader>

        {userData.isHydratedFromDemo && (
          <div className="rounded-[var(--r-control)] border border-amber-200 bg-amber-50/90 p-3 text-xs leading-5 text-amber-900">
            Luồng chuẩn khi dùng thật: Bánh xe cuộc sống → Chọn trọng tâm → SMART Goal → Kiểm tra khả thi → Chu kỳ 12
            tuần.
          </div>
        )}

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline" className="border-app-line bg-app-surface text-app-ink-soft">
              {progress.completedCount}/{progress.totalSteps} bước đã xong
            </Badge>
            {progress.isComplete && (
              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                Đã đi hết lộ trình
              </Badge>
            )}
          </div>
          <StepList userData={userData} />
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (dismissed) {
                  restore();
                } else {
                  dismiss();
                }
              }}
            >
              {dismissed ? "Hiện lại lộ trình" : "Ẩn lộ trình"}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Để sau
            </Button>
            {nextStep && (
              <Button
                onClick={() => {
                  navigate(nextStep.href);
                  onOpenChange(false);
                }}
              >
                {nextStep.ctaLabel}
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
