import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { getLifeAreaLabel, LIFE_AREAS } from "../utils/storage";

export interface LifeBalanceHistoryChartPoint {
  date: string;
  [key: string]: string | number;
}

interface LifeBalanceHistoryChartProps {
  data: LifeBalanceHistoryChartPoint[];
}

export function LifeBalanceHistoryChart({ data }: LifeBalanceHistoryChartProps) {
  return (
    <ResponsiveContainer height={380} width="100%">
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <CartesianGrid stroke="var(--app-line)" strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12, fill: "var(--app-ink-muted)" }}
          tickLine={{ stroke: "var(--app-line)" }}
          axisLine={{ stroke: "var(--app-line)" }}
        />
        <YAxis
          domain={[0, 10]}
          tick={{ fontSize: 12, fill: "var(--app-ink-muted)" }}
          tickLine={{ stroke: "var(--app-line)" }}
          axisLine={{ stroke: "var(--app-line)" }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--app-surface)",
            border: "1px solid var(--app-line)",
            borderRadius: "12px",
            color: "var(--app-ink)",
            fontSize: "13px",
          }}
          labelStyle={{ color: "var(--app-ink)", fontWeight: 500 }}
        />
        <Legend wrapperStyle={{ fontSize: "12px", color: "var(--app-ink-soft)" }} />
        {LIFE_AREAS.map((area) => (
          <Line
            dataKey={getLifeAreaLabel(area.name)}
            dot={{ r: 3 }}
            key={area.name}
            stroke={area.color}
            strokeWidth={2}
            type="monotone"
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
