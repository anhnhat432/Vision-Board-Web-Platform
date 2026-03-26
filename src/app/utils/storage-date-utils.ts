import type { Reflection } from "./storage-types";

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

function padDatePart(value: number): string {
  return String(value).padStart(2, "0");
}

export function getCalendarDayIndex(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / MILLISECONDS_PER_DAY);
}

export function formatDateInputValue(date: Date): string {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

export function parseCalendarDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1]);
    const month = Number(dateOnlyMatch[2]);
    const day = Number(dateOnlyMatch[3]);
    const parsed = new Date(year, month - 1, day);

    if (
      parsed.getFullYear() === year &&
      parsed.getMonth() === month - 1 &&
      parsed.getDate() === day
    ) {
      return parsed;
    }

    return null;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getCalendarDateKey(value: string): string | null {
  const date = parseCalendarDate(value);
  return date ? formatDateInputValue(date) : null;
}

export function formatCalendarDate(
  value: string,
  locale = "vi-VN",
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = parseCalendarDate(value);
  if (!date) return "--";
  return date.toLocaleDateString(locale, options);
}

export function getCalendarDayDifference(targetDate: string, referenceDate = new Date()): number | null {
  const target = parseCalendarDate(targetDate);
  if (!target) return null;
  return getCalendarDayIndex(target) - getCalendarDayIndex(referenceDate);
}

export function sortReflectionsByDateDesc(reflections: Reflection[]): Reflection[] {
  return [...reflections].sort((left, right) => {
    const leftKey = getCalendarDateKey(left.date);
    const rightKey = getCalendarDateKey(right.date);

    if (leftKey && rightKey && leftKey !== rightKey) {
      return rightKey.localeCompare(leftKey);
    }

    if (leftKey && !rightKey) return -1;
    if (!leftKey && rightKey) return 1;

    return right.id.localeCompare(left.id);
  });
}
