import type { TimeBlock, TimeBlockDayOfWeek } from "@/app/utils/storage-types";

export const TIME_BLOCK_DAYS: TimeBlockDayOfWeek[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const DAY_INDEX: Record<TimeBlockDayOfWeek, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

export interface TimeBlockValidationResult {
  isValid: boolean;
  errors: string[];
}

export function getDefaultTimeBlocks(): TimeBlock[] {
  return [
    {
      id: "timeblock_strategic_tuesday_0900",
      type: "strategic",
      dayOfWeek: "Tuesday",
      startTime: "09:00",
      durationMinutes: 180,
      note: "Làm sâu cho việc quan trọng nhất",
    },
    {
      id: "timeblock_buffer_wednesday_1400",
      type: "buffer",
      dayOfWeek: "Wednesday",
      startTime: "14:00",
      durationMinutes: 45,
      note: "Email, việc hành chính, việc rời rạc",
    },
    {
      id: "timeblock_buffer_friday_1400",
      type: "buffer",
      dayOfWeek: "Friday",
      startTime: "14:00",
      durationMinutes: 45,
      note: "Dọn hộp thư và theo dõi tiếp cuối tuần",
    },
    {
      id: "timeblock_breakout_saturday_1500",
      type: "breakout",
      dayOfWeek: "Saturday",
      startTime: "15:00",
      durationMinutes: 180,
      note: "Nghỉ chủ động, không liên quan công việc",
    },
  ];
}

function parseTimeToMinutes(value: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) return null;

  return Number.parseInt(match[1], 10) * 60 + Number.parseInt(match[2], 10);
}

export function validateTimeBlocks(blocks: readonly TimeBlock[]): TimeBlockValidationResult {
  const errors: string[] = [];

  for (const block of blocks) {
    if (!TIME_BLOCK_DAYS.includes(block.dayOfWeek)) {
      errors.push(`Ngày của khung ${block.id || block.startTime} không hợp lệ.`);
    }
    if (parseTimeToMinutes(block.startTime) === null) {
      errors.push(`Giờ bắt đầu của khung ${block.id || block.dayOfWeek} không hợp lệ.`);
    }
    if (!Number.isFinite(block.durationMinutes) || block.durationMinutes < 15 || block.durationMinutes > 300) {
      errors.push("Thời lượng khung cần nằm trong khoảng 15-300 phút.");
    }
  }

  for (const day of TIME_BLOCK_DAYS) {
    const dayBlocks = blocks
      .filter((block) => block.dayOfWeek === day)
      .map((block) => {
        const start = parseTimeToMinutes(block.startTime);
        return start === null ? null : { start, end: start + block.durationMinutes };
      })
      .filter((block): block is { start: number; end: number } => block !== null)
      .sort((left, right) => left.start - right.start);

    for (let index = 1; index < dayBlocks.length; index += 1) {
      const previous = dayBlocks[index - 1];
      const current = dayBlocks[index];
      if (previous && current && current.start < previous.end) {
        errors.push(`${day} có khung bị trùng giờ.`);
        break;
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

function getDateAtLocalTime(reference: Date, minutesFromMidnight: number): Date {
  const date = new Date(reference);
  date.setHours(Math.floor(minutesFromMidnight / 60), minutesFromMidnight % 60, 0, 0);
  return date;
}

export function getUpcomingStrategicBlock(
  blocks: readonly TimeBlock[] | undefined,
  reference = new Date(),
): TimeBlock | null {
  const strategicBlocks = (blocks ?? []).filter(
    (block) => block.type === "strategic" && DAY_INDEX[block.dayOfWeek] === reference.getDay(),
  );

  for (const block of strategicBlocks) {
    const startMinutes = parseTimeToMinutes(block.startTime);
    if (startMinutes === null) continue;

    const startDate = getDateAtLocalTime(reference, startMinutes);
    const minutesUntilStart = (startDate.getTime() - reference.getTime()) / 60000;
    if (minutesUntilStart >= 0 && minutesUntilStart <= 120) {
      return block;
    }
  }

  return null;
}
