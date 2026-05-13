import { ArrowRight, CheckCircle2, LogIn, Sparkles, UserPlus } from "lucide-react";

import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { ProductVisual } from "@/app/components/visuals/ProductVisual";

interface PublicVisitorHeroProps {
  isDemo: boolean;
  onStartDemo: () => void;
  onSignIn: () => void;
  onSignUp: () => void;
}

const FLOW_STEPS = [
  "Đánh giá cân bằng cuộc sống",
  "Chọn góc nhìn và mục tiêu SMART",
  "Chạy kế hoạch 12 tuần rồi review",
];

export function PublicVisitorHero({ isDemo, onStartDemo, onSignIn, onSignUp }: PublicVisitorHeroProps) {
  const heroDescription = isDemo
    ? "Dùng thử ngay không cần đăng nhập. Chấm cân bằng cuộc sống, chốt mục tiêu SMART, kiểm tra khả thi rồi vào kế hoạch 12 tuần có việc cho từng ngày."
    : "Tạo tài khoản hoặc đăng nhập để lưu không gian làm việc, đồng bộ kế hoạch 12 tuần và tiếp tục an toàn trên thiết bị khác.";
  const heroStats = isDemo
    ? [
        ["1 không gian làm việc", "lưu theo trình duyệt"],
        ["12 tuần", "kế hoạch rõ từng ngày"],
        ["Review", "giữ nhịp mỗi tuần"],
      ]
    : [
        ["Tài khoản", "lưu và đồng bộ"],
        ["12 tuần", "kế hoạch rõ từng ngày"],
        ["Review", "giữ nhịp mỗi tuần"],
      ];

  return (
    <Card className="ops-surface overflow-hidden border border-slate-200/80 bg-white/94 shadow-sm ring-1 ring-white/70">
      <CardContent className="p-5 sm:p-6 lg:p-7">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.72fr)] lg:items-stretch">
          <div className="flex min-w-0 flex-col justify-center space-y-5">
            <span className="inline-flex w-fit items-center gap-2 rounded-[var(--r-pill)] border border-slate-200 bg-slate-50/90 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              <Sparkles className="h-3.5 w-3.5" />
              Trang chính
            </span>
            <div className="space-y-3">
              <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl lg:max-w-2xl">
                Biến tầm nhìn thành mục tiêu rõ ràng và kế hoạch 12 tuần có thể làm mỗi ngày.
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-600 sm:text-base lg:max-w-xl">{heroDescription}</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {isDemo ? (
                <>
                  <Button className="w-full sm:w-auto" onClick={onStartDemo}>
                    <Sparkles className="h-4 w-4" />
                    Trải nghiệm demo miễn phí
                  </Button>
                  <Button variant="outline" className="border-slate-200 bg-white text-slate-900" onClick={onSignUp}>
                    <UserPlus className="h-4 w-4" />
                    Lưu không gian làm việc bằng tài khoản
                  </Button>
                </>
              ) : (
                <>
                  <Button className="w-full sm:w-auto" onClick={onSignUp}>
                    <UserPlus className="h-4 w-4" />
                    Tạo tài khoản để lưu và đồng bộ
                  </Button>
                  <Button variant="outline" className="border-slate-200 bg-white text-slate-900" onClick={onSignIn}>
                    <LogIn className="h-4 w-4" />
                    Đăng nhập vào tài khoản
                  </Button>
                </>
              )}
            </div>
            {isDemo ? (
              <p className="max-w-2xl text-xs leading-6 text-slate-500">
                Bắt đầu demo ngay trên trình duyệt này. Đăng ký khi bạn muốn gắn tiến độ với tài khoản. Có thể xuất dữ
                liệu trong Cài đặt.
              </p>
            ) : null}
            <div className="grid gap-2 pt-1 sm:grid-cols-3">
              {heroStats.map(([value, label]) => (
                <div key={value} className="ops-metric-tile rounded-[var(--r-tile)] border border-slate-200 bg-slate-50/72 px-3 py-2.5">
                  <p className="text-sm font-bold text-slate-950">{value}</p>
                  <p className="mt-0.5 text-xs leading-5 text-slate-500">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="ops-surface-muted flex min-w-0 flex-col rounded-[var(--r-tile)] border border-slate-200 bg-slate-50/82 p-4">
            <ProductVisual variant="moodboard" className="mb-4 min-h-[200px]" />
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Luồng nên đi</p>
            <div className="mt-4 grid flex-1 gap-3">
              {FLOW_STEPS.map((step, index) => (
                <div
                  key={step}
                  className="flex min-h-16 items-center gap-3 rounded-[var(--r-tile)] border border-slate-200/70 bg-white px-3 py-3 shadow-sm"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--r-pill)] bg-slate-950 text-sm font-semibold text-white">
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
