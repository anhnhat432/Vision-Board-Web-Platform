import { SimpleRadarChart } from "./SimpleRadarChart";

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
    <div className="mx-auto w-full max-w-xl px-2 sm:max-w-2xl lg:max-w-none">
      <SimpleRadarChart data={data} />
    </div>
  );
}
