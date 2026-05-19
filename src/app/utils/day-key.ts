function parseLocalDateOnly(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return new Date(year, month - 1, day);
}

export function getDayKey(date: Date | string | number): string {
  const d =
    typeof date === "string"
      ? (parseLocalDateOnly(date) ?? new Date(date))
      : date instanceof Date
        ? date
        : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getTodayDayKey(now: Date = new Date()): string {
  return getDayKey(now);
}

export function getPreviousDayKey(dayKey: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - 1);
  return getDayKey(date);
}

export function diffInDays(fromDayKey: string, toDayKey: string): number {
  const [fy, fm, fd] = fromDayKey.split("-").map(Number);
  const [ty, tm, td] = toDayKey.split("-").map(Number);
  const from = new Date(fy, fm - 1, fd).getTime();
  const to = new Date(ty, tm - 1, td).getTime();
  return Math.round((to - from) / (24 * 60 * 60 * 1000));
}
