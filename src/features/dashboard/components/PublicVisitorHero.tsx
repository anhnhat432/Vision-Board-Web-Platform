import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Compass,
  Gauge,
  LogIn,
  ShieldCheck,
  Sparkles,
  Target,
  type LucideIcon,
  UserPlus,
} from "lucide-react";

import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { ProductVisual, type ProductVisualVariant } from "@/app/components/visuals/ProductVisual";

interface PublicVisitorHeroProps {
  isDemo: boolean;
  onStartDemo: () => void;
  onSignIn: () => void;
  onSignUp: () => void;
}

type StatusItem = {
  label: string;
  value: string;
  icon: LucideIcon;
};

const FLOW_STEPS = [
  {
    title: "Cân bằng",
    description: "Chấm 8 lĩnh vực để biết mục tiêu nên bắt đầu từ đâu.",
    icon: Compass,
  },
  {
    title: "Góc nhìn",
    description: "Tách mong muốn thật khỏi việc đang gây nhiễu.",
    icon: Sparkles,
  },
  {
    title: "SMART Goal",
    description: "Ép tầm nhìn thành mục tiêu đo được, có hạn và có ý nghĩa.",
    icon: Target,
  },
  {
    title: "Khả thi",
    description: "Soi nguồn lực, rủi ro và mức cam kết trước khi chạy.",
    icon: Gauge,
  },
  {
    title: "12 tuần",
    description: "Chia mục tiêu thành tuần, chỉ số dẫn và việc hôm nay.",
    icon: CalendarDays,
  },
  {
    title: "Review",
    description: "Nhìn lại mỗi tuần để giữ nhịp thay vì bỏ cuộc âm thầm.",
    icon: ClipboardCheck,
  },
] as const;

const OUTCOME_CARDS: Array<{
  title: string;
  description: string;
  metric: string;
  visual: ProductVisualVariant;
}> = [
  {
    title: "Không bắt đầu bằng màn hình trống",
    description: "Bánh xe cuộc sống tạo dữ liệu nền trước khi chọn mục tiêu.",
    metric: "8 lĩnh vực",
    visual: "balance",
  },
  {
    title: "Mục tiêu được kiểm tra trước khi chạy",
    description: "SMART và feasibility giúp tránh mục tiêu hay nhưng thiếu nguồn lực.",
    metric: "SMART + khả thi",
    visual: "vision",
  },
  {
    title: "Hôm nay biết làm gì",
    description: "Kế hoạch 12 tuần chuyển mục tiêu thành tuần, task và review.",
    metric: "12 tuần",
    visual: "execution",
  },
];

export function PublicVisitorHero({ isDemo, onStartDemo, onSignIn, onSignUp }: PublicVisitorHeroProps) {
  const heroDescription = isDemo
    ? "Dùng thử ngay không cần đăng nhập. Chấm cân bằng cuộc sống, chốt mục tiêu SMART, kiểm tra khả thi rồi vào kế hoạch 12 tuần có việc cho từng ngày."
    : "Tạo tài khoản hoặc đăng nhập để lưu không gian làm việc, đồng bộ kế hoạch 12 tuần và tiếp tục an toàn trên thiết bị khác.";
  const heroStats = isDemo
    ? [
        ["1 không gian", "lưu theo trình duyệt"],
        ["12 tuần", "kế hoạch rõ từng ngày"],
        ["Review", "giữ nhịp mỗi tuần"],
      ]
    : [
        ["Tài khoản", "lưu và đồng bộ"],
        ["12 tuần", "kế hoạch rõ từng ngày"],
        ["Review", "giữ nhịp mỗi tuần"],
      ];
  const supportCopy = isDemo
    ? "Bắt đầu demo ngay trên trình duyệt này. Đăng ký khi bạn muốn gắn tiến độ với tài khoản. Có thể xuất dữ liệu trong Cài đặt."
    : "Dữ liệu ưu tiên lưu cục bộ trước, sau đó đồng bộ khi tài khoản và kết nối sẵn sàng.";
  const statusItems: StatusItem[] = [
    { label: "Hôm nay", value: "3 việc mở", icon: CheckCircle2 },
    { label: "Tuần này", value: "1 review", icon: CalendarDays },
    { label: isDemo ? "Demo" : "Đồng bộ", value: isDemo ? "cục bộ" : "tài khoản", icon: ShieldCheck },
  ];

  return (
    <section className="space-y-5" aria-labelledby="public-landing-title">
      <Card className="relative overflow-hidden border-slate-200 bg-white shadow-[var(--shadow-4)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(14,165,233,0.18),transparent_34%),radial-gradient(circle_at_86%_86%,rgba(16,185,129,0.18),transparent_34%)]"
        />
        <CardContent className="relative p-5 sm:p-6 lg:p-8">
          <div className="grid gap-8 xl:grid-cols-[minmax(0,0.98fr)_minmax(320px,0.78fr)] xl:items-stretch">
            <div className="flex min-w-0 flex-col justify-center space-y-6">
              <span className="inline-flex w-fit items-center gap-2 rounded-[var(--r-pill)] border border-cyan-100 bg-cyan-50/90 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-800">
                <Sparkles className="h-3.5 w-3.5" />
                Flow mục tiêu 12 tuần
              </span>
              <div className="space-y-4">
                <h1
                  id="public-landing-title"
                  className="max-w-3xl text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl lg:text-5xl"
                >
                  Biến tầm nhìn thành mục tiêu rõ ràng và kế hoạch 12 tuần có nhịp làm mỗi ngày.
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">{heroDescription}</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {isDemo ? (
                  <>
                    <Button glow className="w-full sm:w-auto" onClick={onStartDemo}>
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
                    <Button glow className="w-full sm:w-auto" onClick={onSignUp}>
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
              <p className="max-w-2xl text-xs leading-6 text-slate-500">{supportCopy}</p>
              <div className="grid gap-2 pt-1 sm:grid-cols-3">
                {heroStats.map(([value, label]) => (
                  <div
                    key={value}
                    className="rounded-[var(--r-tile)] border border-slate-200/80 bg-white/80 px-3 py-2.5 shadow-sm backdrop-blur"
                  >
                    <p className="text-sm font-bold text-slate-950">{value}</p>
                    <p className="mt-0.5 text-xs leading-5 text-slate-500">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex min-w-0 flex-col rounded-[var(--r-card)] border border-slate-200/80 bg-slate-950 p-3 text-white shadow-[0_24px_60px_-34px_rgba(15,23,42,0.72)]">
              <div className="rounded-[calc(var(--r-card)-0.4rem)] border border-white/10 bg-white/8 p-3">
                <ProductVisual variant="execution" className="min-h-[230px]" />
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                {statusItems.map(({ label, value, icon: Icon }) => (
                  <div key={label} className="flex items-center gap-3 rounded-[var(--r-tile)] bg-white/10 px-3 py-3 ring-1 ring-white/10">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--r-pill)] bg-white text-slate-950">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-white/55">{label}</span>
                      <span className="block text-sm font-semibold text-white">{value}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card id="public-flow" className="overflow-hidden border-slate-200 bg-white/92 shadow-sm">
        <CardContent className="p-5 sm:p-6 lg:p-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">Luồng nên đi</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Một đường chính, không phải nhiều lối rẽ.</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-slate-500">
              Layout đưa người mới theo đúng thứ tự: hiểu hiện trạng, chốt mục tiêu, kiểm tra khả thi, rồi mới thực thi.
            </p>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            {FLOW_STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="rounded-[var(--r-tile)] border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-[var(--r-pill)] bg-slate-950 text-white">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-xs font-bold text-slate-400">0{index + 1}</span>
                  </div>
                  <h3 className="mt-4 text-sm font-bold text-slate-950">{step.title}</h3>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{step.description}</p>
                  {index < FLOW_STEPS.length - 1 ? <ArrowRight className="mt-4 hidden h-4 w-4 text-cyan-700 xl:block" /> : null}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        {OUTCOME_CARDS.map((card) => (
          <Card key={card.title} className="overflow-hidden border-slate-200 bg-white/92 shadow-sm">
            <CardContent className="p-4">
              <ProductVisual variant={card.visual} className="min-h-[150px]" />
              <div className="mt-4 space-y-2">
                <span className="inline-flex rounded-[var(--r-pill)] bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800">
                  {card.metric}
                </span>
                <h3 className="text-base font-bold text-slate-950">{card.title}</h3>
                <p className="text-sm leading-6 text-slate-500">{card.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
