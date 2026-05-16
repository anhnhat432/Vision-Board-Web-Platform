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
    title: "Hiện trạng trước",
    description: "Không hỏi mục tiêu ngay. Bắt đầu bằng bánh xe cuộc sống để biết vùng nào đang kéo toàn bộ hệ thống xuống.",
    metric: "8 lĩnh vực",
    visual: "balance",
  },
  {
    title: "Mục tiêu sau",
    description: "SMART Goal và feasibility check ép ý tưởng thành mục tiêu có chỉ số, deadline, nguồn lực và rủi ro rõ.",
    metric: "SMART + khả thi",
    visual: "vision",
  },
  {
    title: "Hành động mỗi ngày",
    description: "Kế hoạch 12 tuần biến mục tiêu thành tuần, chỉ số dẫn, việc hôm nay và review để không bỏ cuộc âm thầm.",
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
    <section
      className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden bg-[#eefaf7] text-slate-950"
      aria-labelledby="public-landing-title"
    >
      <div className="relative overflow-hidden bg-slate-950 text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(34,211,238,0.28),transparent_32%),radial-gradient(circle_at_82%_14%,rgba(16,185,129,0.2),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(12,74,110,0.92)_48%,rgba(6,78,59,0.9))]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:44px_44px]"
        />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.78fr)] lg:items-center lg:px-8 lg:py-16">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-[var(--r-pill)] border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-cyan-100 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              Dear Our Future - Flow mục tiêu 12 tuần
            </div>

            <h1
              id="public-landing-title"
              className="mt-6 max-w-4xl text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl lg:text-7xl"
            >
              Biến tầm nhìn thành mục tiêu rõ ràng và kế hoạch 12 tuần có nhịp làm mỗi ngày.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-cyan-50/82 sm:text-lg">{heroDescription}</p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {isDemo ? (
                <>
                  <Button glow size="lg" className="w-full bg-white text-slate-950 hover:bg-cyan-50 sm:w-auto" onClick={onStartDemo}>
                    <Sparkles className="h-4 w-4" />
                    Trải nghiệm demo miễn phí
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full border-white/20 bg-white/10 text-white hover:bg-white/15 sm:w-auto"
                    onClick={onSignUp}
                  >
                    <UserPlus className="h-4 w-4" />
                    Lưu không gian làm việc bằng tài khoản
                  </Button>
                </>
              ) : (
                <>
                  <Button glow size="lg" className="w-full bg-white text-slate-950 hover:bg-cyan-50 sm:w-auto" onClick={onSignUp}>
                    <UserPlus className="h-4 w-4" />
                    Tạo tài khoản để lưu và đồng bộ
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full border-white/20 bg-white/10 text-white hover:bg-white/15 sm:w-auto"
                    onClick={onSignIn}
                  >
                    <LogIn className="h-4 w-4" />
                    Đăng nhập vào tài khoản
                  </Button>
                </>
              )}
            </div>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-cyan-50/65">{supportCopy}</p>

            <div className="mt-8 grid max-w-3xl gap-3 sm:grid-cols-3">
              {heroStats.map(([value, label]) => (
                <div key={value} className="rounded-[1.35rem] border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
                  <p className="text-xl font-black tracking-tight text-white">{value}</p>
                  <p className="mt-1 text-sm leading-5 text-cyan-50/62">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-8 rounded-full bg-cyan-300/20 blur-3xl" aria-hidden="true" />
            <div className="relative rounded-[2rem] border border-white/14 bg-white/12 p-3 shadow-[0_36px_90px_-44px_rgba(34,211,238,0.8)] backdrop-blur-xl">
              <div className="rounded-[1.55rem] border border-white/10 bg-slate-950/88 p-3">
                <div className="mb-3 flex items-center justify-between gap-3 px-1">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-200/70">Execution cockpit</p>
                    <p className="mt-1 text-sm font-semibold text-white">Tuần 04 / 12</p>
                  </div>
                  <span className="rounded-[var(--r-pill)] bg-emerald-300 px-3 py-1 text-xs font-black text-emerald-950">72%</span>
                </div>
                <ProductVisual variant="execution" className="min-h-[260px]" />
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                {statusItems.map(({ label, value, icon: Icon }) => (
                  <div key={label} className="flex items-center gap-3 rounded-[1.25rem] border border-white/10 bg-white/10 px-3 py-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--r-pill)] bg-white text-slate-950">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-bold uppercase tracking-[0.14em] text-cyan-50/50">{label}</span>
                      <span className="block text-sm font-bold text-white">{value}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <div id="public-flow" className="rounded-[2rem] border border-cyan-100 bg-white p-4 shadow-[0_24px_80px_-54px_rgba(15,23,42,0.35)] sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700">Luồng nên đi</p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-slate-950 sm:text-3xl">Một đường chính, không phải nhiều lối rẽ.</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-slate-500">
              Trang mới dẫn người dùng theo đúng thứ tự: hiểu hiện trạng, chốt mục tiêu, kiểm tra khả thi, rồi mới thực thi.
            </p>
          </div>

          <div className="mt-7 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            {FLOW_STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="group relative overflow-hidden rounded-[1.45rem] border border-slate-200 bg-slate-50 p-4 transition-transform duration-200 hover:-translate-y-1 hover:bg-white hover:shadow-[0_20px_50px_-35px_rgba(8,145,178,0.55)]">
                  <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-cyan-100 opacity-0 transition-opacity duration-200 group-hover:opacity-100" aria-hidden="true" />
                  <div className="relative flex items-center justify-between gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-[var(--r-pill)] bg-slate-950 text-white">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-xs font-black text-slate-400">0{index + 1}</span>
                  </div>
                  <h3 className="relative mt-5 text-base font-black text-slate-950">{step.title}</h3>
                  <p className="relative mt-2 text-sm leading-6 text-slate-500">{step.description}</p>
                  {index < FLOW_STEPS.length - 1 ? <ArrowRight className="relative mt-5 hidden h-4 w-4 text-cyan-700 xl:block" /> : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          {OUTCOME_CARDS.map((card, index) => (
            <article
              key={card.title}
              className={`overflow-hidden rounded-[2rem] border p-4 shadow-[0_20px_70px_-50px_rgba(15,23,42,0.45)] ${
                index === 1 ? "border-slate-800 bg-slate-950 text-white" : "border-cyan-100 bg-white text-slate-950"
              }`}
            >
              <ProductVisual variant={card.visual} className="min-h-[170px]" />
              <div className="mt-5 space-y-3 px-1 pb-1">
                <span
                  className={`inline-flex rounded-[var(--r-pill)] px-3 py-1 text-xs font-black ${
                    index === 1 ? "bg-cyan-300 text-slate-950" : "bg-cyan-50 text-cyan-800"
                  }`}
                >
                  {card.metric}
                </span>
                <h3 className="text-xl font-black tracking-[-0.025em]">{card.title}</h3>
                <p className={`text-sm leading-7 ${index === 1 ? "text-slate-300" : "text-slate-500"}`}>{card.description}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-6 overflow-hidden rounded-[2rem] bg-slate-950 p-5 text-white shadow-[0_28px_90px_-56px_rgba(15,23,42,0.7)] sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-200/75">Bắt đầu đúng thứ tự</p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] sm:text-3xl">Đừng mở planner trống. Đi qua flow 12 tuần trước.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
                Sau vài phút, người dùng biết điểm yếu hiện tại, mục tiêu nên chọn, và việc đầu tiên cần làm trong tuần này.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:shrink-0">
              <Button glow size="lg" className="w-full bg-white text-slate-950 hover:bg-cyan-50 sm:w-auto" onClick={isDemo ? onStartDemo : onSignUp}>
                {isDemo ? <Sparkles className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                {isDemo ? "Vào demo ngay" : "Tạo tài khoản miễn phí"}
              </Button>
              {!isDemo ? (
                <Button variant="outline" size="lg" className="w-full border-white/20 bg-white/10 text-white hover:bg-white/15 sm:w-auto" onClick={onSignIn}>
                  <LogIn className="h-4 w-4" />
                  Đăng nhập
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
