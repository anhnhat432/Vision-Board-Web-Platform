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

import { LIFE_AREAS, getLifeAreaLabel } from "../utils/storage";

export interface LifeBalanceHistoryChartPoint {
  date: string;
  [key: string]: string | number;
}

interface LifeBalanceHistoryChartProps {
  data: LifeBalanceHistoryChartPoint[];
}

export function LifeBalanceHistoryChart({ data }: LifeBalanceHistoryChartProps) {
  return (
    <ResponsiveContainer height={420} width="100%">
      <LineChart data={data}>
        <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis domain={[0, 10]} tick={{ fontSize: 12 }} />
        <Tooltip />
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
