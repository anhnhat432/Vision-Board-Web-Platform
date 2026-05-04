export const STEPS = [
  { id: "outcome", label: "Mục tiêu", title: "Mục tiêu 12 tuần" },
  { id: "tactics", label: "Việc lặp lại", title: "2-4 việc lặp lại" },
  { id: "week1", label: "Tuần 1", title: "Tuần đầu tiên và lịch nhìn lại" },
  { id: "finish", label: "Chốt", title: "Chốt kế hoạch" },
] as const;

export const GOAL_TYPES = [
  { value: "Skill Learning", label: "Học kỹ năng" },
  { value: "Habit Building", label: "Xây thói quen" },
  { value: "Fitness / Health", label: "Sức khỏe" },
  { value: "Exam / Study", label: "Thi cử / học tập" },
  { value: "Career / Job Search", label: "Sự nghiệp / tìm việc" },
  { value: "Finance / Saving", label: "Tài chính / tiết kiệm" },
  { value: "Project Completion", label: "Hoàn thành dự án" },
  { value: "Personal Growth", label: "Phát triển bản thân" },
  { value: "Other", label: "Khác" },
] as const;

export const REVIEW_DAYS = [
  { value: "Monday", label: "Thứ Hai" },
  { value: "Tuesday", label: "Thứ Ba" },
  { value: "Wednesday", label: "Thứ Tư" },
  { value: "Thursday", label: "Thứ Năm" },
  { value: "Friday", label: "Thứ Sáu" },
  { value: "Saturday", label: "Thứ Bảy" },
  { value: "Sunday", label: "Chủ Nhật" },
] as const;

export const LOAD_PREFERENCE_OPTIONS = [
  { value: "balanced", label: "Cân bằng" },
  { value: "lighter", label: "Nhẹ hơn" },
  { value: "push", label: "Đẩy mạnh" },
] as const;
