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

// Life-area label → CSS variable mapping using design tokens
const AREA_ACCENT_VARS: Record<string, string> = {
  "Sức khoẻ": "var(--color-health-accent)",
  "Sức khỏe": "var(--color-health-accent)",
  "Sự nghiệp": "var(--color-career-accent)",
  "Mối quan hệ": "var(--color-relationships-accent)",
  "Tinh thần": "var(--color-personal-growth-accent)",
};

const AREA_ICONS: Record<string, typeof Activity> = {
  "Sức khoẻ": Activity,
  "Sức khỏe": Activity,
  "Sự nghiệp": Briefcase,
  "Mối quan hệ": Heart,
  "Tinh thần": Compass,
};

const FALLBACK_ACCENT = "var(--app-accent)";

export function BalanceCard({ rows }: BalanceCardProps) {
  return (
    <section
      className="rounded-card border border-app-line bg-app-surface p-6 shadow-app-sm transition-all duration-300 hover:border-app-accent/25 relative overflow-hidden"
      aria-labelledby="dashboard-balance-title"
    >
      {/* 📌 Floating wood pin at the header */}
      <span className="hidden sm:inline absolute -top-3 left-6 text-base opacity-70 select-none cursor-default z-10">
        📌
      </span>

      <div className="flex flex-col gap-1 border-b border-app-line pb-4 mb-5 pt-2 relative z-10">
        <h2
          id="dashboard-balance-title"
          className="text-xs font-bold uppercase tracking-[0.2em] text-app-ink flex items-center gap-2"
        >
          <Scale className="h-4.5 w-4.5 text-app-accent/80" />
          Cân bằng cuộc sống
        </h2>
        <p className="text-[10px] font-semibold text-app-ink-muted">Tỉ lệ thực tế so với bánh xe cuộc sống</p>
      </div>

      <div className="space-y-3.5 relative z-10">
        {rows.map((row) => {
          const score = clampScore(row.score);
          const accentVar = AREA_ACCENT_VARS[row.label] ?? FALLBACK_ACCENT;
          const Icon = AREA_ICONS[row.label] ?? Activity;

          return (
            <div
              key={row.label}
              className="group p-3 rounded-control border border-transparent hover:border-app-line hover:bg-app-accent-subtle transition-all duration-300 hover:scale-[1.01]"
            >
              <div className="mb-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className="p-2 rounded-control transition-all duration-300 group-hover:scale-110"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${accentVar} 12%, transparent)`,
                      color: accentVar,
                    }}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-bold text-app-ink-soft group-hover:text-app-ink transition-colors duration-200">
                    {row.label}
                  </span>
                </div>
                <span className="text-xs font-extrabold tabular-nums text-app-ink-soft group-hover:text-app-ink transition-colors duration-200">
                  {score}/10
                </span>
              </div>

              <div
                className="h-1.5 overflow-hidden rounded-full bg-app-bg-subtle shadow-inner"
                aria-hidden="true"
              >
                <div
                  className="h-full rounded-full transition-all duration-550 ease-out"
                  style={{ width: `${score * 10}%`, backgroundColor: accentVar }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
