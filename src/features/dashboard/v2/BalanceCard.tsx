import { Activity, Briefcase, Heart, Compass, Scale } from "lucide-react";

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

// Color schemes and icons for Life Balance Areas V2
const AREA_STYLES: Record<string, { gradient: string; icon: typeof Activity; textColor: string; iconBg: string }> = {
  "Sức khoẻ": {
    gradient: "from-emerald-500 to-teal-400",
    icon: Activity,
    textColor: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-50 dark:bg-emerald-950/40",
  },
  "Sự nghiệp": {
    gradient: "from-indigo-500 to-sky-400",
    icon: Briefcase,
    textColor: "text-indigo-600 dark:text-indigo-400",
    iconBg: "bg-indigo-50 dark:bg-indigo-950/40",
  },
  "Mối quan hệ": {
    gradient: "from-rose-500 to-pink-400",
    icon: Heart,
    textColor: "text-rose-600 dark:text-rose-400",
    iconBg: "bg-rose-50 dark:bg-rose-950/40",
  },
  "Tinh thần": {
    gradient: "from-amber-500 to-yellow-400",
    icon: Compass,
    textColor: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-50 dark:bg-amber-950/40",
  },
};

export function BalanceCard({ rows }: BalanceCardProps) {
  return (
    <section
      className="surface-raised rounded-xl border border-app-line bg-app-surface p-5 md:p-6 shadow-sm hover:shadow-md transition-shadow duration-300"
      aria-labelledby="dashboard-balance-title"
    >
      <div className="flex flex-col gap-1 border-b border-app-line pb-4 mb-5">
        <h2 id="dashboard-balance-title" className="text-base font-bold text-app-ink flex items-center gap-2">
          <Scale className="h-5 w-5 text-emerald-500 animate-pulse" />
          Cân bằng cuộc sống
        </h2>
        <p className="text-xs font-semibold tracking-wide text-app-ink-muted">Tỉ lệ thực tế so với bánh xe cuộc sống</p>
      </div>

      <div className="space-y-5">
        {rows.map((row) => {
          const score = clampScore(row.score);
          const style = AREA_STYLES[row.label] ?? {
            gradient: "from-app-accent to-teal-400",
            icon: Activity,
            textColor: "text-app-accent",
            iconBg: "bg-app-accent-soft",
          };
          const Icon = style.icon;

          return (
            <div key={row.label} className="group">
              <div className="mb-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg transition-transform duration-300 group-hover:scale-110 ${style.iconBg} ${style.textColor}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-bold text-app-ink-soft">{row.label}</span>
                </div>
                <span className="text-xs font-bold tabular-nums text-app-ink-muted">{score}/10</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800/50" aria-hidden="true">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${style.gradient} transition-all duration-500 ease-out`}
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
