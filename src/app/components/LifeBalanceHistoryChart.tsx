import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useTheme } from "../hooks/useTheme";
import { LIFE_AREAS, getLifeAreaLabel } from "../utils/storage";

export interface LifeBalanceHistoryChartPoint {
  date: string;
  [key: string]: string | number;
}

interface LifeBalanceHistoryChartProps {
  data: LifeBalanceHistoryChartPoint[];
}

export function LifeBalanceHistoryChart({ data }: LifeBalanceHistoryChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const gridStroke = isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb";
  const tickFill = isDark ? "rgba(255,255,255,0.5)" : "#64748b";
  const tooltipBg = isDark ? "rgba(22,22,34,0.95)" : "#fff";
  const tooltipBorder = isDark ? "rgba(255,255,255,0.1)" : "#e2e8f0";
  const tooltipText = isDark ? "#e2e8f0" : "#1e293b";

  return (
    <ResponsiveContainer height={420} width="100%">
      <LineChart data={data}>
        <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fontSize: 12, fill: tickFill }} />
        <YAxis domain={[0, 10]} tick={{ fontSize: 12, fill: tickFill }} />
        <Tooltip
          contentStyle={{
            backgroundColor: tooltipBg,
            borderColor: tooltipBorder,
            borderRadius: "12px",
            color: tooltipText,
          }}
          labelStyle={{ color: tooltipText }}
        />
        <Legend />
        {LIFE_AREAS.map((area) => (
          <Line
            dataKey={getLifeAreaLabel(area.name)}
            dot={{ r: 4 }}
            key={area.name}
            stroke={area.color}
            strokeWidth={2.5}
            type="monotone"
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
