import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowRight, CheckCircle2, Compass, Sparkles } from "lucide-react";

import type { UserData } from "../utils/storage-types";
import {
  dismissNewUserGuide,
  getNewUserGuideProgress,
  isNewUserGuideDismissed,
  restoreNewUserGuide,
  subscribeToNewUserGuideChanges,
} from "../utils/new-user-guide";
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
          className={`rounded-lg border px-4 py-4 ${
            step.completed
              ? "border-emerald-200 bg-emerald-50/90"
              : step.id === progress.nextStep?.id
                ? "border-sky-200 bg-sky-50/90 shadow-[0_14px_32px_-28px_rgba(14,165,233,0.55)]"
                : "border-slate-200 bg-white"
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                step.completed
                  ? "bg-emerald-600 text-white"
                  : step.id === progress.nextStep?.id
                    ? "bg-slate-950 text-white"
                    : "bg-slate-100 text-slate-700"
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
                      ? "text-slate-950"
                      : "text-slate-900"
                }`}
              >
                {step.title}
              </p>
              <p
                className={`mt-1 text-sm leading-6 ${
                  step.completed
                    ? "text-emerald-800/80"
                    : step.id === progress.nextStep?.id
                      ? "text-slate-600"
                      : "text-slate-600"
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
      ? "Khám phá web theo thứ tự này"
      : "Nếu đang xem dữ liệu mẫu, cứ đi theo checklist này là hiểu web nhanh nhất."
    : compact
      ? "Đi tiếp theo đúng thứ tự này"
      : `Nếu mới vào web, cứ đi theo ${progress.totalSteps} bước này là đủ gọn.`;
  const description = userData.isHydratedFromDemo
    ? "Bản hiện tại đã có dữ liệu mẫu sẵn. Hãy dùng checklist này như đường đi ngắn nhất để nhìn rõ flow thật của sản phẩm."
    : "Website này dễ dùng hơn nhiều nếu bạn đi đúng flow: mục tiêu rõ, chu kỳ rõ, rồi mới nhìn hôm nay và review tuần.";
  const surfaceClass = compact
    ? "max-w-full overflow-hidden border border-slate-200/80 bg-white/92 shadow-[0_18px_44px_-36px_rgba(15,23,42,0.28)]"
    : "max-w-full overflow-hidden border border-slate-200/80 bg-white/94 text-slate-950 shadow-[0_18px_44px_-36px_rgba(15,23,42,0.34)]";
  const contentClass = compact ? "p-4" : "p-5 sm:p-6 lg:p-7";
  const layoutClass = compact
    ? "grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] lg:items-center"
    : "grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]";
  const badgeClass = "border-slate-200 bg-slate-50 text-slate-600";
  const demoBadgeClass = "border-amber-200 bg-amber-50 text-amber-800";
  const descriptionClass = "text-slate-600";
  const primaryButtonClass = "w-full justify-center bg-slate-950 text-white hover:bg-slate-800 sm:w-auto";
  const secondaryButtonClass =
    "w-full justify-center border-slate-200 bg-white text-slate-900 hover:bg-slate-50 sm:w-auto";
  const ghostButtonClass = "w-full justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 sm:w-auto";

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
              <h2 className={`${compact ? "text-lg" : "text-2xl"} font-bold tracking-normal text-slate-950`}>
                {title}
              </h2>
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
                Mở hướng dẫn đầy đủ
              </Button>
              <Button variant="ghost" onClick={dismiss} className={ghostButtonClass}>
                Ẩn checklist này
              </Button>
            </div>
          </div>

          {!compact && (
            <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Trạng thái hiện tại</p>
              <StepList userData={userData} />
            </div>
          )}

          {compact && nextStep && (
            <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Bước nên làm tiếp</p>
              <p className="mt-2 text-base font-semibold text-slate-950">{nextStep.title}</p>
              <p className="mt-2 line-clamp-2 text-sm leading-7 text-slate-600">{nextStep.description}</p>
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
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
            <Sparkles className="h-3.5 w-3.5" />
            Hướng dẫn sử dụng
          </div>
          <DialogTitle className="text-xl tracking-normal text-slate-950 sm:text-2xl">
            {userData.isHydratedFromDemo
              ? "Khám phá sản phẩm theo checklist."
              : `Đi web này theo ${progress.totalSteps} bước là dễ nhất.`}
          </DialogTitle>
          <DialogDescription className="text-sm leading-7 text-slate-600">
            {userData.isHydratedFromDemo
              ? "Bản hiện tại đã có dữ liệu mẫu sẵn. Checklist này giúp bạn hiểu luồng thật của sản phẩm mà không bị lạc giữa quá nhiều màn."
              : "Nếu bạn mới dùng lần đầu, cứ coi đây là đường đi ngắn nhất để hiểu web và không bị lạc giữa quá nhiều màn."}
          </DialogDescription>
        </DialogHeader>

        {userData.isHydratedFromDemo && (
          <div className="rounded-lg border border-amber-200 bg-amber-50/90 p-4 text-sm leading-7 text-amber-900">
            Dữ liệu hiện tại là dữ liệu mẫu để bạn xem nhanh sản phẩm. Khi chuyển sang bản thật, flow chuẩn vẫn là: đo
            bánh xe cuộc đời, chốt insight, viết SMART goal, kiểm tra tính thực tế rồi mới vào chu kỳ 12 tuần.
          </div>
        )}

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline" className="border-slate-200 bg-white text-slate-700">
              {progress.completedCount}/{progress.totalSteps} bước đã xong
            </Badge>
            {progress.isComplete && (
              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                Đã hoàn tất hướng dẫn
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
              {dismissed ? "Hiện lại checklist" : "Ẩn checklist"}
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
