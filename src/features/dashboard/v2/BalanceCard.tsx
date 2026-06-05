import { Activity, Briefcase, Compass, Heart, Scale } from "lucide-react";

interface LifeBalanceRow {
  label: string;
  score: number;
}

interface BalanceCardProps {
  rows: LifeBalanceRow[];
}

function clampScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(10, Math.round(score)));
}

// Tailored gradients and colors for each distinct life area zone
const AREA_STYLES: Record<string, { gradient: string; icon: typeof Activity; textColor: string; iconBg: string }> = {
  "Sức khoẻ": {
    gradient: "from-emerald-500 to-teal-400 dark:from-emerald-600 dark:to-teal-500",
    icon: Activity,
    textColor: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100/50 dark:border-emerald-900/30",
  },
  "Sức khỏe": {
    gradient: "from-emerald-500 to-teal-400 dark:from-emerald-600 dark:to-teal-500",
    icon: Activity,
    textColor: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100/50 dark:border-emerald-900/30",
  },
  "Sự nghiệp": {
    gradient: "from-amber-500 to-orange-400 dark:from-amber-600 dark:to-orange-500",
    icon: Briefcase,
    textColor: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-50 dark:bg-amber-950/30 border border-amber-100/50 dark:border-amber-900/30",
  },
  "Mối quan hệ": {
    gradient: "from-rose-450 to-pink-400 dark:from-rose-500 dark:to-pink-500",
    icon: Heart,
    textColor: "text-rose-600 dark:text-rose-400",
    iconBg: "bg-rose-50 dark:bg-rose-950/30 border border-rose-100/50 dark:border-rose-900/30",
  },
  "Tinh thần": {
    gradient: "from-purple-500 to-indigo-400 dark:from-purple-600 dark:to-indigo-500",
    icon: Compass,
    textColor: "text-purple-600 dark:text-purple-400",
    iconBg: "bg-purple-50 dark:bg-purple-950/30 border border-purple-100/50 dark:border-purple-900/30",
  },
};

export function BalanceCard({ rows }: BalanceCardProps) {
  return (
    <section
      className="rounded-3xl border border-neutral-200/70 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/10 backdrop-blur-md p-6 shadow-[0_4px_24px_rgba(0,0,0,0.005)] transition-all duration-300 hover:border-app-accent/25 relative select-none overflow-hidden"
      aria-labelledby="dashboard-balance-title"
    >
      {/* Grid Pattern overlay for texture */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808004_1px,transparent_1px),linear-gradient(to_bottom,#80808004_1px,transparent_1px)] bg-[size:14px_14px] pointer-events-none" />

      {/* 📌 Floating wood pin at the header */}
      <span className="hidden sm:inline absolute -top-3 left-6 text-xl filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.05)] transition-transform duration-300 hover:rotate-12 cursor-default z-10">
        📌
      </span>

      <div className="flex flex-col gap-1 border-b border-neutral-200/50 dark:border-neutral-800/55 pb-4 mb-5 pt-2 relative z-10">
        <h2
          id="dashboard-balance-title"
          className="text-xs font-bold uppercase tracking-[0.2em] text-app-ink flex items-center gap-2"
        >
          <Scale className="h-4.5 w-4.5 text-app-accent/80" />
          Cân bằng cuộc sống
        </h2>
        <p className="text-[10px] font-semibold text-neutral-500">Tỉ lệ thực tế so với bánh xe cuộc sống</p>
      </div>

      <div className="space-y-3.5 relative z-10">
        {rows.map((row) => {
          const score = clampScore(row.score);
          const style = AREA_STYLES[row.label] ?? {
            gradient: "from-app-accent to-emerald-450",
            icon: Activity,
            textColor: "text-app-accent",
            iconBg: "bg-app-accent-soft/50 border border-app-accent/10",
          };
          const Icon = style.icon;

          return (
            <div
              key={row.label}
              className="group p-3 rounded-2xl border border-transparent hover:border-neutral-200/70 dark:hover:border-neutral-800/70 hover:bg-white/50 dark:hover:bg-neutral-950/20 transition-all duration-300 hover:scale-[1.01]"
            >
              <div className="mb-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`p-2 rounded-xl transition-all duration-300 group-hover:scale-110 shadow-sm ${style.iconBg} ${style.textColor}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400 group-hover:text-neutral-800 dark:group-hover:text-neutral-200 transition-colors duration-200">
                    {row.label}
                  </span>
                </div>
                <span className="text-xs font-extrabold tabular-nums text-neutral-450 group-hover:text-app-ink transition-colors duration-200">
                  {score}/10
                </span>
              </div>

              <div
                className="h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800 shadow-inner"
                aria-hidden="true"
              >
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${style.gradient} transition-all duration-550 ease-out`}
                  style={{ width: `${score * 10}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
