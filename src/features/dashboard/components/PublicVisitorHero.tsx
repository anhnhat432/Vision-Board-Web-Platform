import { ArrowRight, CheckCircle2, LogIn, Sparkles, UserPlus } from "lucide-react";

import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";

interface PublicVisitorHeroProps {
  isDemo: boolean;
  onStartDemo: () => void;
  onSignIn: () => void;
  onSignUp: () => void;
}

const FLOW_STEPS = [
  "Đánh giá cân bằng cuộc sống",
  "Chọn insight và mục tiêu SMART",
  "Chạy kế hoạch 12 tuần rồi review",
];

export function PublicVisitorHero({ isDemo, onStartDemo, onSignIn, onSignUp }: PublicVisitorHeroProps) {
  return (
    <Card className="overflow-hidden border border-slate-200/80 bg-white/94 shadow-[0_22px_60px_-42px_rgba(15,23,42,0.32)]">
      <CardContent className="p-5 sm:p-6 lg:p-7">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)] lg:items-center">
          <div className="min-w-0 space-y-4">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              <Sparkles className="h-3.5 w-3.5" />
              Trang chính
            </span>
            <div className="space-y-3">
              <h1 className="max-w-3xl text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Biến tầm nhìn thành mục tiêu rõ ràng và kế hoạch 12 tuần có thể làm mỗi ngày.
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                Người mới nên bắt đầu bằng bức tranh cuộc sống hiện tại, sau đó chốt một mục tiêu SMART, kiểm tra khả
                thi và để hệ thống chia nhỏ thành tuần, việc, review.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {isDemo ? (
                <>
                  <Button className="bg-slate-950 text-white hover:bg-slate-800" onClick={onStartDemo}>
                    <Sparkles className="h-4 w-4" />
                    Trải nghiệm demo miễn phí
                  </Button>
                  <Button variant="outline" className="border-slate-200 bg-white text-slate-900" onClick={onSignUp}>
                    <UserPlus className="h-4 w-4" />
                    Đăng ký để sync sau
                  </Button>
                  <Button variant="ghost" className="text-slate-700 hover:bg-slate-100" onClick={onSignIn}>
                    <LogIn className="h-4 w-4" />
                    Đăng nhập
                  </Button>
                </>
              ) : (
                <>
                  <Button className="bg-slate-950 text-white hover:bg-slate-800" onClick={onSignUp}>
                    <UserPlus className="h-4 w-4" />
                    Đăng ký miễn phí để lưu
                  </Button>
                  <Button variant="outline" className="border-slate-200 bg-white text-slate-900" onClick={onSignIn}>
                    <LogIn className="h-4 w-4" />
                    Tôi đã có tài khoản
                  </Button>
                </>
              )}
            </div>
            {isDemo ? (
              <p className="max-w-2xl text-xs leading-6 text-slate-500">
                Dữ liệu demo/local được lưu trên trình duyệt hiện tại. Đăng nhập/sync là lớp sau, không bắt buộc; hãy
                export nếu muốn giữ bản sao.
              </p>
            ) : null}
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Luồng nên đi</p>
            <div className="mt-4 space-y-3">
              {FLOW_STEPS.map((step, index) => (
                <div key={step} className="flex items-center gap-3 rounded-[18px] bg-white px-3 py-3 shadow-sm">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">
                    {index + 1}
                  </div>
                  <span className="min-w-0 text-sm font-medium leading-6 text-slate-800">{step}</span>
                  {index === FLOW_STEPS.length - 1 ? (
                    <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-slate-300" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
