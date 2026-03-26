import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from "recharts";

interface DashboardLifeAreaRadarPoint {
  subject: string;
  value: number;
  fullMark: number;
}

interface DashboardLifeAreaRadarProps {
  data: DashboardLifeAreaRadarPoint[];
}

export function DashboardLifeAreaRadar({ data }: DashboardLifeAreaRadarProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data}>
        <PolarGrid stroke="#dbe3f1" />
        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: "#546071" }} />
        <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fontSize: 10, fill: "#94a3b8" }} />
        <Radar name="Điểm" dataKey="value" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.55} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
