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
    <div className="mx-auto w-full max-w-[430px] px-2 lg:max-w-[420px]">
      <SimpleRadarChart data={data} height={308} />
    </div>
  );
}
