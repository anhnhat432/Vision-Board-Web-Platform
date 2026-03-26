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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

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
          className={`rounded-[22px] border px-4 py-4 ${
            step.completed
              ? "border-emerald-200 bg-emerald-50/90"
              : step.id === progress.nextStep?.id
                ? "border-slate-900 bg-slate-950 text-white"
                : "border-white/70 bg-white/82"
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                step.completed
                  ? "bg-emerald-600 text-white"
                  : step.id === progress.nextStep?.id
                    ? "bg-white text-slate-950"
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
                      ? "text-white"
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
                      ? "text-white/74"
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

export function NewUserGuideBanner({
  userData,
  variant = "full",
  onOpenGuide,
}: NewUserGuideBannerProps) {
  const navigate = useNavigate();
  const { dismissed, dismiss } = useGuideVisibility();
  const progress = useMemo(() => getNewUserGuideProgress(userData), [userData]);

  if (dismissed || progress.isComplete) return null;

  const nextStep = progress.nextStep;
  const compact = variant === "compact";
  const title = userData.isHydratedFromDemo
    ? compact
      ? "Khám phá app demo theo thứ tự này"
      : "Nếu đang xem bản demo, cứ đi theo 4 bước này là hiểu app nhanh nhất."
    : compact
      ? "Đi tiếp theo đúng thứ tự này"
      : "Nếu mới vào web, cứ đi theo 4 bước này là đủ gọn.";
  const description = userData.isHydratedFromDemo
    ? "Bản hiện tại đã có dữ liệu mẫu sẵn. Hãy dùng checklist này như đường đi ngắn nhất để nhìn rõ flow thật của sản phẩm."
    : "Website này dễ dùng hơn nhiều nếu bạn đi đúng flow: mục tiêu rõ, chu kỳ rõ, rồi mới nhìn hôm nay và review tuần.";

  return (
    <Card className="overflow-hidden border-0 bg-[linear-gradient(135deg,_rgba(15,23,42,0.98)_0%,_rgba(30,41,59,0.94)_100%)] text-white shadow-[0_28px_70px_-38px_rgba(15,23,42,0.58)]">
      <CardContent className={compact ? "p-5" : "p-6 lg:p-7"}>
        <div className={compact ? "space-y-4" : "grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]"}>
          <div className="space-y-4">
            <Badge variant="outline" className="border-white/14 bg-white/10 text-white">
              <Compass className="mr-2 h-3.5 w-3.5" />
              Hướng dẫn cho người mới
            </Badge>
            <div>
              <h2 className={`${compact ? "text-xl" : "text-2xl"} font-bold tracking-[-0.03em]`}>{title}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-white/74">{description}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline" className="border-white/14 bg-white/10 text-white">
                {progress.completedCount}/{progress.totalSteps} bước đã xong
              </Badge>
              {userData.isHydratedFromDemo && (
                <Badge variant="outline" className="border-amber-300/30 bg-amber-200/12 text-amber-100">
                  Bạn đang ở bản demo
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              {nextStep && (
                <Button
                  onClick={() => navigate(nextStep.href)}
                  className="border-white/12 bg-white text-slate-950 hover:bg-white/92"
                >
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
                className="border-white/12 bg-white/10 text-white hover:bg-white/16 hover:text-white"
              >
                Mở hướng dẫn đầy đủ
              </Button>
              <Button variant="ghost" onClick={dismiss} className="text-white/72 hover:bg-white/10 hover:text-white">
                Ẩn checklist này
              </Button>
            </div>
          </div>

          {!compact && (
            <div className="space-y-3 rounded-[28px] border border-white/12 bg-white/8 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/52">Trạng thái hiện tại</p>
              <StepList userData={userData} />
            </div>
          )}

          {compact && nextStep && (
            <div className="rounded-[24px] border border-white/12 bg-white/8 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/52">Bước nên làm tiếp</p>
              <p className="mt-2 text-base font-semibold">{nextStep.title}</p>
              <p className="mt-2 text-sm leading-7 text-white/74">{nextStep.description}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function NewUserGuideDialog({
  open,
  onOpenChange,
  userData,
}: NewUserGuideDialogProps) {
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
          <DialogTitle className="text-xl tracking-[-0.03em] text-slate-950 sm:text-2xl">
            {userData.isHydratedFromDemo ? "Khám phá bản demo theo 4 bước." : "Đi web này theo 4 bước là dễ nhất."}
          </DialogTitle>
          <DialogDescription className="text-sm leading-7 text-slate-600">
            {userData.isHydratedFromDemo
              ? "Bản hiện tại đã có dữ liệu mẫu sẵn. Checklist này giúp bạn hiểu luồng thật của sản phẩm mà không bị lạc giữa quá nhiều màn."
              : "Nếu bạn mới dùng lần đầu, cứ coi đây là đường đi ngắn nhất để hiểu web và không bị lạc giữa quá nhiều màn."}
          </DialogDescription>
        </DialogHeader>

        {userData.isHydratedFromDemo && (
          <div className="rounded-[24px] border border-amber-200 bg-amber-50/90 p-4 text-sm leading-7 text-amber-900">
            Dữ liệu hiện tại là dữ liệu mẫu để bạn xem nhanh sản phẩm. Khi chuyển sang bản thật, flow chuẩn vẫn là:
            đo bánh xe cuộc đời, chốt insight, viết SMART goal, kiểm tra feasibility rồi mới vào chu kỳ 12 tuần.
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
          <div className="flex flex-wrap gap-2">            <Button variant="outline" onClick={() => onOpenChange(false)}>
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

