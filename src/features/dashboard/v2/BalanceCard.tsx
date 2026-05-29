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

// Subtle green styles for calm productivity Forest Green zone consistency
const AREA_STYLES: Record<string, { gradient: string; icon: typeof Activity; textColor: string; iconBg: string }> = {
  "Sức khoẻ": {
    gradient: "from-app-accent to-app-accent",
    icon: Activity,
    textColor: "text-app-accent",
    iconBg: "bg-app-accent-soft border border-app-accent/10",
  },
  "Sức khỏe": {
    gradient: "from-app-accent to-app-accent",
    icon: Activity,
    textColor: "text-app-accent",
    iconBg: "bg-app-accent-soft border border-app-accent/10",
  },
  "Sự nghiệp": {
    gradient: "from-app-accent to-app-accent",
    icon: Briefcase,
    textColor: "text-app-accent",
    iconBg: "bg-app-accent-soft border border-app-accent/10",
  },
  "Mối quan hệ": {
    gradient: "from-app-accent to-app-accent",
    icon: Heart,
    textColor: "text-app-accent",
    iconBg: "bg-app-accent-soft border border-app-accent/10",
  },
  "Tinh thần": {
    gradient: "from-app-accent to-app-accent",
    icon: Compass,
    textColor: "text-app-accent",
    iconBg: "bg-app-accent-soft border border-app-accent/10",
  },
};

export function BalanceCard({ rows }: BalanceCardProps) {
  return (
    <section
      className="rounded-[18px] border border-app-line bg-app-surface p-5 md:p-6 shadow-app-sm transition-all duration-300 hover:border-app-accent/20"
      aria-labelledby="dashboard-balance-title"
    >
      <div className="flex flex-col gap-1 border-b border-app-line pb-4 mb-5">
        <h2 id="dashboard-balance-title" className="text-base font-bold text-app-ink flex items-center gap-2">
          <Scale className="h-5 w-5 text-app-accent/80" />
          Cân bằng cuộc sống
        </h2>
        <p className="text-xs font-semibold tracking-wide text-app-ink-muted">Tỉ lệ thực tế so với bánh xe cuộc sống</p>
      </div>

      <div className="space-y-4">
        {rows.map((row) => {
          const score = clampScore(row.score);
          const style = AREA_STYLES[row.label] ?? {
            gradient: "from-app-accent/70 to-app-accent-hover/80",
            icon: Activity,
            textColor: "text-app-accent/80",
            iconBg: "bg-app-accent-soft/50 border border-app-accent/10",
          };
          const Icon = style.icon;

          return (
            <div
              key={row.label}
              className="group p-3 rounded-[12px] border border-transparent hover:border-app-line/60 hover:bg-app-bg-subtle/30 transition-all duration-300"
            >
              <div className="mb-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`p-2 rounded-xl transition-transform duration-300 group-hover:scale-105 shadow-app-sm ${style.iconBg} ${style.textColor}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-semibold text-app-ink-soft group-hover:text-app-ink transition-colors duration-200">
                    {row.label}
                  </span>
                </div>
                <span className="text-xs font-bold tabular-nums text-app-ink-muted group-hover:text-app-accent transition-colors duration-200">
                  {score}/10
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-app-line/20" aria-hidden="true">
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
