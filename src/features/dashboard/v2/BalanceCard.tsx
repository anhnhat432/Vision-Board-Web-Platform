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

export function BalanceCard({ rows }: BalanceCardProps) {
  return (
    <section className="rounded-card border border-app-line bg-app-surface p-5 md:p-6" aria-labelledby="dashboard-balance-title">
      <div>
        <h2 id="dashboard-balance-title" className="text-[16px] font-semibold text-app-ink">
          Cân bằng cuộc sống
        </h2>
        <p className="mt-1 text-[14px] text-app-ink-muted">Tuần này so với mục tiêu</p>
      </div>

      <div className="mt-5 space-y-4">
        {rows.map((row) => {
          const score = clampScore(row.score);

          return (
            <div key={row.label}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-[14px] font-medium text-app-ink-soft">{row.label}</span>
                <span className="text-[13px] tabular-nums text-app-ink-muted">{score}/10</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[#EFEAE2]" aria-hidden="true">
                <div className="h-full rounded-full bg-app-accent" style={{ width: `${score * 10}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
