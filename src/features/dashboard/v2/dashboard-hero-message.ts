export type HeroMessageInput = {
  currentWeek: number | null;
  totalWeeks: number;
  progressPercent: number;
  featuredGoalTitle: string;
};

export type HeroMessage = {
  subheading: string;
  quote: string;
};

function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function isGoalEmpty(title: string): boolean {
  return title.trim().length === 0;
}

// ---------------------------------------------------------------------------
// Quote pools – mỗi nhánh trạng thái có 3 câu để xoay vòng
// ---------------------------------------------------------------------------

const QUOTES_NOT_STARTED = [
  "Hành trình vạn dặm bắt đầu từ một bước chân đầu tiên.",
  "Điều quan trọng không phải bạn bắt đầu nhanh hay chậm, mà là bạn bắt đầu.",
  "Mỗi tầm nhìn lớn đều khởi nguồn từ một quyết định nhỏ hôm nay.",
];

const QUOTES_BUILDING_MOMENTUM = [
  "Sự nhất quán nhỏ bé mỗi ngày tạo nên sức mạnh lớn lao theo thời gian.",
  "Đừng chờ cảm hứng — hãy để hành động tạo ra cảm hứng.",
  "Tuần đầu tiên là nền móng. Đặt viên gạch đầu thật vững.",
];

const QUOTES_LOW_PROGRESS = [
  "Không phải lúc nào cũng nhanh, nhưng chỉ cần không dừng lại.",
  "Tiến bộ không phải lúc nào cũng là đường thẳng. Hãy kiên nhẫn với chính mình.",
  "Một tuần chậm không định nghĩa cả hành trình.",
];

const QUOTES_STEADY_PROGRESS = [
  "Đà đã có — hãy giữ nhịp và tin vào quá trình.",
  "Sự đều đặn chính là siêu năng lực bị đánh giá thấp nhất.",
  "Bạn đang đi đúng hướng. Tiếp tục tiến bước.",
];

const QUOTES_NEARING_FINISH = [
  "Cú nước rút cuối cùng — cho đi 100% những gì bạn còn lại.",
  "Về đích không phải là kết thúc, mà là khởi đầu cho chu kỳ tiếp theo.",
  "Hãy kết thúc mạnh mẽ như cách bạn đã bắt đầu.",
];

function pickFromPool(pool: readonly string[], week: number | null): string {
  const idx = (week ?? 0) % pool.length;
  return pool[idx];
}

// ---------------------------------------------------------------------------
// Hàm chính – tất cả đầu ra đều tất định (không dùng Date / Math.random)
// ---------------------------------------------------------------------------

export function getDashboardHeroMessage(input: HeroMessageInput): HeroMessage {
  const progress = clampProgress(input.progressPercent);
  const goal = input.featuredGoalTitle;
  const week = input.currentWeek;
  const total = input.totalWeeks;

  // --- Nhánh 1: Chưa bắt đầu ---
  if (week === null) {
    if (isGoalEmpty(goal)) {
      return {
        subheading: "Bắt đầu bằng việc chọn một mục tiêu trọng tâm cho chu kỳ 12 tuần đầu tiên.",
        quote: pickFromPool(QUOTES_NOT_STARTED, null),
      };
    }
    return {
      subheading: `Hãy thiết lập chu kỳ 12 tuần để biến "${goal}" thành hành động mỗi ngày.`,
      quote: pickFromPool(QUOTES_NOT_STARTED, null),
    };
  }

  // --- Nhánh 2: Tạo đà (Tuần 1-2) ---
  if (week <= 2) {
    return {
      subheading: `Bạn đang ở giai đoạn tạo đà — giữ nhịp đều đặn mỗi ngày là chìa khóa. Tuần ${week}/${total}`,
      quote: pickFromPool(QUOTES_BUILDING_MOMENTUM, week),
    };
  }

  // --- Nhánh 3: Giữa kỳ, tiến độ thấp ---
  if (progress < 40) {
    return {
      subheading: `Vẫn còn nhiều dư địa để bứt phá. Hãy tập trung vào 2-3 việc cốt lõi nhất tuần này. Tuần ${week}/${total} · ${progress}% hoàn thành`,
      quote: pickFromPool(QUOTES_LOW_PROGRESS, week),
    };
  }

  // --- Nhánh 4: Giữa kỳ, tiến độ ổn ---
  if (progress < 75) {
    return {
      subheading: `Bạn đang đi đúng hướng với tiến độ ${progress}%. Duy trì nhịp độ này, kết quả sẽ đến. Tuần ${week}/${total}`,
      quote: pickFromPool(QUOTES_STEADY_PROGRESS, week),
    };
  }

  // --- Nhánh 5: Gần về đích ---
  return {
    subheading: `Bạn đã hoàn thành ${progress}% hành trình. Giữ vững phong độ và bứt phá về đích! Tuần ${week}/${total}`,
    quote: pickFromPool(QUOTES_NEARING_FINISH, week),
  };
}
