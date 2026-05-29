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

// Color schemes and icons for Life Balance Areas V2 (Restored to emotional pastel colors)
const AREA_STYLES: Record<string, { gradient: string; icon: typeof Activity; textColor: string; iconBg: string }> = {
  "Sức khoẻ": {
    gradient: "bg-mood-sky",
    icon: Activity,
    textColor: "text-mood-sky",
    iconBg: "bg-mood-sky-soft",
  },
  "Sự nghiệp": {
    gradient: "bg-mood-mint",
    icon: Briefcase,
    textColor: "text-mood-mint",
    iconBg: "bg-mood-mint-soft",
  },
  "Mối quan hệ": {
    gradient: "bg-mood-rose",
    icon: Heart,
    textColor: "text-mood-rose",
    iconBg: "bg-mood-rose-soft",
  },
  "Tinh thần": {
    gradient: "bg-mood-lavender",
    icon: Compass,
    textColor: "text-mood-lavender",
    iconBg: "bg-mood-lavender-soft",
  },
};

export function BalanceCard({ rows }: BalanceCardProps) {
  return (
    <section
      className="rounded-[14px] border border-app-line bg-app-surface p-5 md:p-6"
      aria-labelledby="dashboard-balance-title"
    >
      <div className="flex flex-col gap-1 border-b border-app-line pb-4 mb-5">
        <h2 id="dashboard-balance-title" className="text-base font-bold text-app-ink flex items-center gap-2">
          <Scale className="h-5 w-5 text-mood-lavender" />
          Cân bằng cuộc sống
        </h2>
        <p className="text-xs font-semibold tracking-wide text-app-ink-muted">Tỉ lệ thực tế so với bánh xe cuộc sống</p>
      </div>

      <div className="space-y-5">
        {rows.map((row) => {
          const score = clampScore(row.score);
          const style = AREA_STYLES[row.label] ?? {
            gradient: "bg-app-accent",
            icon: Activity,
            textColor: "text-app-accent",
            iconBg: "bg-app-accent-soft",
          };
          const Icon = style.icon;

          return (
            <div key={row.label} className="group">
              <div className="mb-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg border border-white/50 shadow-sm ${style.iconBg} ${style.textColor}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-semibold text-app-ink-soft">{row.label}</span>
                </div>
                <span className="text-xs font-bold tabular-nums text-app-ink-muted">{score}/10</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-app-line/45" aria-hidden="true">
                <div
                  className={`h-full rounded-full ${style.gradient} transition-all duration-500 ease-out`}
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
