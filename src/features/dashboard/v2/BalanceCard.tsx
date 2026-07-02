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

// Màu theo từng lĩnh vực, bám sát thiết kế editorial (Dashboard.dc.html)
const AREA_STYLES: Record<string, { bar: string; icon: typeof Activity; iconColor: string; iconBg: string }> = {
  "Sức khoẻ": { bar: "#0C5E3A", icon: Activity, iconColor: "#0C5E3A", iconBg: "#EDF7E0" },
  "Sức khỏe": { bar: "#0C5E3A", icon: Activity, iconColor: "#0C5E3A", iconBg: "#EDF7E0" },
  "Sự nghiệp": { bar: "#E7B400", icon: Briefcase, iconColor: "#E7B400", iconBg: "#FFF8DE" },
  "Mối quan hệ": { bar: "#FF5C3E", icon: Heart, iconColor: "#FF5C3E", iconBg: "#FFEDE8" },
  "Tinh thần": { bar: "#6E8BFF", icon: Compass, iconColor: "#6E8BFF", iconBg: "#ECF0FF" },
};

const DEFAULT_STYLE = { bar: "#0C5E3A", icon: Activity, iconColor: "#0C5E3A", iconBg: "#EDF7E0" };

export function BalanceCard({ rows }: BalanceCardProps) {
  return (
    <section
      className="rounded-card border border-app-line bg-app-surface p-[22px] shadow-[0_16px_38px_-30px_rgba(23,21,15,0.24)]"
      aria-labelledby="dashboard-balance-title"
    >
      <div className="mb-4 border-b border-app-line pb-3.5">
        <h2
          id="dashboard-balance-title"
          className="mb-1 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-app-ink"
        >
          <Scale className="h-[15px] w-[15px] text-app-accent" />
          Cân bằng cuộc sống
        </h2>
        <p className="text-[10.5px] font-medium text-app-ink-muted">Tỉ lệ thực tế so với bánh xe cuộc sống</p>
      </div>

      <div className="space-y-[15px]">
        {rows.map((row) => {
          const score = clampScore(row.score);
          const style = AREA_STYLES[row.label] ?? DEFAULT_STYLE;
          const Icon = style.icon;

          return (
            <div key={row.label}>
              <div className="mb-[7px] flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-[12.5px] font-semibold text-app-ink">
                  <span
                    className="flex size-6 items-center justify-center rounded-[7px]"
                    style={{ backgroundColor: style.iconBg, color: style.iconColor }}
                    aria-hidden="true"
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  {row.label}
                </span>
                <span className="font-mono text-xs font-extrabold tabular-nums text-app-ink">{score}/10</span>
              </div>

              <div className="h-1.5 overflow-hidden rounded-full bg-app-bg-subtle" aria-hidden="true">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${score * 10}%`, backgroundColor: style.bar }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
