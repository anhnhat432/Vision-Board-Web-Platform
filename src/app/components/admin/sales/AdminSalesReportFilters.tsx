import type { AdminSalesKpiStatus } from "@/services/adminService";

import { Button } from "../../ui/button";
import { Input } from "../../ui/input";

export type SalesRangePreset = "7d" | "30d" | "custom";

export interface SalesReportUrlState {
  range: SalesRangePreset;
  from: string;
  to: string;
  provider: "all" | "payos" | "casso";
  kpiStatus: AdminSalesKpiStatus;
  page: number;
}

const REPORT_TIMEZONE = "Asia/Ho_Chi_Minh";
const RANGE_VALUES: SalesRangePreset[] = ["7d", "30d", "custom"];
const STATUS_VALUES: AdminSalesKpiStatus[] = ["pending", "included", "excluded"];

function vietnamDateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: REPORT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function subtractVietnamDays(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00+07:00`);
  date.setUTCDate(date.getUTCDate() - days);
  return vietnamDateKey(date);
}

function presetDates(range: Exclude<SalesRangePreset, "custom">, now: Date) {
  const to = vietnamDateKey(now);
  return { from: subtractVietnamDays(to, range === "7d" ? 6 : 29), to };
}

export function getDefaultSalesReportUrlState(now = new Date()): SalesReportUrlState {
  const dates = presetDates("30d", now);
  return { range: "30d", ...dates, provider: "all", kpiStatus: "pending", page: 1 };
}

export function parseSalesReportUrlState(params: URLSearchParams, now = new Date()): SalesReportUrlState {
  const requestedRange = params.get("range") as SalesRangePreset | null;
  const range = requestedRange && RANGE_VALUES.includes(requestedRange) ? requestedRange : "30d";
  const dates = range === "custom"
    ? { from: params.get("from") ?? "", to: params.get("to") ?? "" }
    : {
        from: params.get("from") ?? presetDates(range, now).from,
        to: params.get("to") ?? presetDates(range, now).to,
      };
  const providerValue = params.get("provider");
  const provider = providerValue === "payos" || providerValue === "casso" ? providerValue : "all";
  const statusValue = params.get("status") as AdminSalesKpiStatus | null;
  const kpiStatus = statusValue && STATUS_VALUES.includes(statusValue) ? statusValue : "pending";
  const pageValue = Number(params.get("page"));
  const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1;
  return { range, ...dates, provider, kpiStatus, page };
}

export function validateSalesReportUrlState(state: SalesReportUrlState): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(state.from) || !/^\d{4}-\d{2}-\d{2}$/.test(state.to)) {
    return "Chọn đầy đủ ngày bắt đầu và ngày kết thúc.";
  }
  const fromDate = new Date(`${state.from}T00:00:00+07:00`);
  const toDate = new Date(`${state.to}T00:00:00+07:00`);
  if (vietnamDateKey(fromDate) !== state.from || vietnamDateKey(toDate) !== state.to) {
    return "Ngày báo cáo không hợp lệ.";
  }
  if (state.from > state.to) return "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.";
  const rangeDays = Math.round((toDate.getTime() - fromDate.getTime()) / 86_400_000) + 1;
  if (rangeDays > 366) return "Khoảng báo cáo tối đa là 366 ngày.";
  return null;
}

export function AdminSalesReportFilters({
  value,
  availableProviders,
  onChange,
}: {
  value: SalesReportUrlState;
  availableProviders: Array<"payos" | "casso">;
  onChange(next: SalesReportUrlState): void;
}) {
  const setRange = (range: SalesRangePreset) => {
    const dates = range === "custom" ? { from: value.from, to: value.to } : presetDates(range, new Date());
    onChange({ ...value, range, ...dates, page: 1 });
  };

  return (
    <div className="grid gap-4 rounded-[var(--r-card)] border border-app-line bg-app-surface p-4 lg:grid-cols-[auto_1fr_1fr_1fr]">
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-app-ink">Khoảng thời gian</legend>
        <div className="flex flex-wrap gap-2">
          {([['7d', '7 ngày'], ['30d', '30 ngày'], ['custom', 'Tùy chỉnh']] as const).map(([range, label]) => (
            <Button
              key={range}
              type="button"
              variant={value.range === range ? "default" : "outline"}
              aria-pressed={value.range === range}
              onClick={() => setRange(range)}
            >
              {label}
            </Button>
          ))}
        </div>
      </fieldset>
      <label htmlFor="sales-report-from" className="grid gap-2 text-sm font-medium text-app-ink">
        Từ ngày
        <Input id="sales-report-from" type="date" value={value.from} disabled={value.range !== "custom"} onChange={(event) => onChange({ ...value, from: event.target.value, page: 1 })} />
      </label>
      <label htmlFor="sales-report-to" className="grid gap-2 text-sm font-medium text-app-ink">
        Đến ngày
        <Input id="sales-report-to" type="date" value={value.to} disabled={value.range !== "custom"} onChange={(event) => onChange({ ...value, to: event.target.value, page: 1 })} />
      </label>
      <label className="grid gap-2 text-sm font-medium text-app-ink">
        Provider
        <select
          value={value.provider}
          className="h-11 rounded-xl border border-app-line bg-app-surface px-3 text-sm text-app-ink"
          onChange={(event) => onChange({ ...value, provider: event.target.value as SalesReportUrlState["provider"], page: 1 })}
        >
          <option value="all">Tất cả</option>
          {availableProviders.map((provider) => <option key={provider} value={provider}>{provider}</option>)}
        </select>
      </label>
    </div>
  );
}
