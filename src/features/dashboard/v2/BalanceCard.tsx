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

// Subtle green/teal variants gradient to keep the calm Forest Green zone consistent but with visual richness
const AREA_STYLES: Record<string, { gradient: string; icon: typeof Activity; textColor: string; iconBg: string }> = {
  "Sức khoẻ": {
    gradient: "from-emerald-400 to-emerald-600 dark:from-emerald-500 dark:to-emerald-700",
    icon: Activity,
    textColor: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/30",
  },
  "Sự nghiệp": {
    gradient: "from-teal-400 to-teal-600 dark:from-teal-500 dark:to-teal-700",
    icon: Briefcase,
    textColor: "text-teal-600 dark:text-teal-400",
    iconBg: "bg-teal-50 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900/30",
  },
  "Mối quan hệ": {
    gradient: "from-green-400 to-green-600 dark:from-green-500 dark:to-green-700",
    icon: Heart,
    textColor: "text-green-600 dark:text-green-400",
    iconBg: "bg-green-50 dark:bg-green-950/40 border border-green-100 dark:border-green-900/30",
  },
  "Tinh thần": {
    gradient: "from-lime-400 to-lime-600 dark:from-lime-500 dark:to-lime-700",
    icon: Compass,
    textColor: "text-lime-600 dark:text-lime-400",
    iconBg: "bg-lime-50 dark:bg-lime-950/40 border border-lime-100 dark:border-lime-900/30",
  },
};

export function BalanceCard({ rows }: BalanceCardProps) {
  return (
    <section
      className="rounded-[18px] border border-app-line bg-app-surface p-5 md:p-6 shadow-app-sm transition-all duration-300 hover:shadow-app-md"
      aria-labelledby="dashboard-balance-title"
    >
      <div className="flex flex-col gap-1 border-b border-app-line pb-4 mb-5">
        <h2 id="dashboard-balance-title" className="text-base font-bold text-app-ink flex items-center gap-2">
          <Scale className="h-5 w-5 text-app-accent animate-pulse" />
          Cân bằng cuộc sống
        </h2>
        <p className="text-xs font-semibold tracking-wide text-app-ink-muted">Tỉ lệ thực tế so với bánh xe cuộc sống</p>
      </div>

      <div className="space-y-4">
        {rows.map((row) => {
          const score = clampScore(row.score);
          const style = AREA_STYLES[row.label] ?? {
            gradient: "from-app-accent to-app-accent-hover",
            icon: Activity,
            textColor: "text-app-accent",
            iconBg: "bg-app-accent-soft border border-app-accent/10",
          };
          const Icon = style.icon;

          return (
            <div 
              key={row.label} 
              className="group p-3 rounded-[12px] border border-transparent hover:border-app-line hover:bg-app-bg-subtle/30 transition-all duration-300"
            >
              <div className="mb-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl transition-transform duration-300 group-hover:scale-110 shadow-app-sm ${style.iconBg} ${style.textColor}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-extrabold text-app-ink-soft group-hover:text-app-ink transition-colors duration-200">{row.label}</span>
                </div>
                <span className="text-xs font-bold tabular-nums text-app-ink-muted group-hover:text-app-accent transition-colors duration-200">{score}/10</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-app-line/30" aria-hidden="true">
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
