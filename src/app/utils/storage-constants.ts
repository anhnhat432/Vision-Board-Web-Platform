import type { AppPreferences } from "./storage-types";

export const USER_DATA_STORAGE_KEY = "visionboard_user_data";
export const USER_DATA_UPDATED_EVENT_NAME = "visionboard:user-data-updated";

export const STORAGE_KEY = USER_DATA_STORAGE_KEY;
export const AUTH_OWNER_STORAGE_KEY = `${USER_DATA_STORAGE_KEY}:auth_owner_uid`;
export const ANONYMOUS_USER_DATA_STORAGE_KEY = `${USER_DATA_STORAGE_KEY}:anonymous`;
export const CURRENT_STORAGE_VERSION = 8;

export const BACKEND_LINK_STORAGE_KEYS = [
  "backend_goal_links",
  "backend_plan_links",
  "backend_order_links",
  "backend_vision_board_links",
] as const;
export const BACKEND_LINK_LEGACY_OWNER_STORAGE_KEY = "backend_link_store_legacy_owner_uid";
export const LOCAL_DATA_MIGRATION_PROMPT_STATE_KEY = "visionboard_local_data_migration_prompt_state";
export const LOCAL_DATA_IMPORT_BACKUP_STORAGE_PREFIX = "visionboard_local_data_import_backup:";
export const DEMO_FEEDBACK_STORAGE_KEY = "visionboard_demo_feedback";

export const AUXILIARY_USER_DATA_STORAGE_KEYS = [
  ANONYMOUS_USER_DATA_STORAGE_KEY,
  ...BACKEND_LINK_STORAGE_KEYS,
  BACKEND_LINK_LEGACY_OWNER_STORAGE_KEY,
  LOCAL_DATA_MIGRATION_PROMPT_STATE_KEY,
  DEMO_FEEDBACK_STORAGE_KEY,
  "visionboard_data_mutation_queue",
  "visionboard_data_mutation_queue:anonymous",
  "visionboard_data_mutation_queue:device_id",
  "visionboard_orders_v1",
  "last_reminder_date",
  "visionboard_last_browser_notification",
  "visionboard_last_outbox_sync",
  "visionboard_last_entitlement_sync",
  "visionboard_last_restore_access",
  "visionboard_mock_billing_account",
  "visionboard_new_user_guide_dismissed",
  "visionboard_new_user_guide_seen_at",
  "visionboard_rescue_dismissed",
] as const;

export const AUXILIARY_USER_DATA_STORAGE_PREFIXES = [
  `${USER_DATA_STORAGE_KEY}:auth:`,
  "backend_goal_links:auth:",
  "backend_plan_links:auth:",
  "backend_order_links:auth:",
  "backend_vision_board_links:auth:",
  "visionboard_data_mutation_queue:auth:",
  "visionboard_data_mutation_queue:recovery:",
  LOCAL_DATA_IMPORT_BACKUP_STORAGE_PREFIX,
  "visionboard_mock_billing_session_",
] as const;

export const DEFAULT_APP_PREFERENCES: AppPreferences = {
  allowLocalAnalytics: true,
  enableInAppReminders: true,
  enableBrowserNotifications: false,
  keepLocalOutbox: true,
  preferredReminderHour: 19,
};

export const TWELVE_WEEK_FUNNEL_STEPS = [
  {
    id: "12_week_setup_started",
    label: "Bắt đầu setup",
    description: "Người dùng vào flow thiết lập 12 tuần.",
  },
  {
    id: "12_week_plan_created",
    label: "Tạo chu kỳ",
    description: "Người dùng hoàn tất setup và tạo chu kỳ.",
  },
  {
    id: "12_week_task_completed",
    label: "Hoàn thành việc",
    description: "Một việc trong today queue được đánh dấu xong.",
  },
  {
    id: "12_week_daily_checkin_submitted",
    label: "Gửi check-in",
    description: "Người dùng đóng check-in trong ngày.",
  },
  {
    id: "12_week_weekly_review_submitted",
    label: "Gửi review tuần",
    description: "Người dùng chốt review tuần và quyết định nhịp tuần sau.",
  },
] as const;

export const TWELVE_WEEK_MONETIZATION_STEPS = [
  {
    id: "paywall_viewed",
    label: "Hiển thị giao diện nâng cấp",
    description: "Người dùng đã nhìn thấy lời mời nâng cấp trong một ngữ cảnh cụ thể.",
  },
  {
    id: "paywall_cta_clicked",
    label: "Bấm nút nâng cấp",
    description: "Người dùng bấm một nút dẫn tới lời mời nâng cấp hoặc bước nâng cấp tiếp theo.",
  },
  {
    id: "paywall_checkout_started",
    label: "Bắt đầu thanh toán",
    description: "Người dùng bắt đầu bước mở gói trên thiết bị hiện tại.",
  },
  {
    id: "paywall_checkout_completed",
    label: "Hoàn tất thanh toán",
    description: "Thiết bị đã mở gói thành công trong luồng trên thiết bị hiện tại.",
  },
  {
    id: "premium_template_applied",
    label: "Áp dụng mẫu",
    description: "Một mẫu Plus hoặc miễn phí đã được áp dụng vào setup.",
  },
  {
    id: "premium_insight_opened",
    label: "Mở góc nhìn cao cấp",
    description: "Người dùng đã mở phần góc nhìn ôn lại cao cấp trong tab tuần.",
  },
] as const;

export const APP_STORAGE_KEYS = {
  selectedFocusArea: "selected_focus_area",
  pendingSmartGoal: "pending_smart_goal",
  pendingFeasibilityResult: "pending_feasibility_result",
  pendingFeasibilityAnswers: "pending_feasibility_answers",
  pending12WeekSetupDraft: "pending_12_week_setup_draft",
  pending12WeekPlanDraft: "pending_12_week_plan_draft",
  latest12WeekGoalId: "latest_12_week_goal_id",
  latest12WeekSystemGoalId: "latest_12_week_system_goal_id",
  latest12WeekPlanGoalId: "latest_12_week_plan_goal_id",
  readinessLevel: "readiness_level",
  readinessScore: "readiness_score",
  userIntent: "user_intent",
} as const;

export const LIFE_AREAS = [
  { name: "Career", color: "#8b5cf6" },
  { name: "Finance", color: "#10b981" },
  { name: "Health", color: "#ef4444" },
  { name: "Education", color: "#f59e0b" },
  { name: "Relationships", color: "#ec4899" },
  { name: "Family", color: "#3b82f6" },
  { name: "Personal Growth", color: "#14b8a6" },
  { name: "Leisure", color: "#a855f7" },
];

export const LIFE_AREA_LABELS: Record<string, string> = {
  Career: "Sự nghiệp",
  Finance: "Tài chính",
  Health: "Sức khỏe",
  Education: "Học tập",
  Relationships: "Mối quan hệ",
  Family: "Gia đình",
  "Personal Growth": "Phát triển bản thân",
  Leisure: "Giải trí",
};

export const REVIEW_DAY_LABELS: Record<string, string> = {
  Monday: "Thứ Hai",
  Tuesday: "Thứ Ba",
  Wednesday: "Thứ Tư",
  Thursday: "Thứ Năm",
  Friday: "Thứ Sáu",
  Saturday: "Thứ Bảy",
  Sunday: "Chủ Nhật",
};

export const FEASIBILITY_RESULT_LABELS: Record<string, string> = {
  realistic: "Khả thi",
  challenging: "Thách thức nhưng làm được",
  too_ambitious: "Hơi quá sức lúc này",
  "This goal looks realistic for you right now.": "Mục tiêu này có vẻ khả thi với bạn lúc này.",
  "This goal is challenging but possible.": "Mục tiêu này đầy thách thức nhưng có thể thực hiện được.",
  "This goal may be too ambitious right now.": "Mục tiêu này có thể quá tham vọng lúc này.",
  "Mục tiêu này có vẻ khả thi với bạn lúc này.": "Khả thi",
  "Mục tiêu này đầy thách thức nhưng có thể thực hiện được.": "Thách thức nhưng làm được",
  "Mục tiêu này có thể quá tham vọng lúc này.": "Hơi quá sức lúc này",
};

export const MOTIVATIONAL_QUOTES = [
  "Tương lai thuộc về những người tin vào vẻ đẹp của ước mơ mình.",
  "Thành công không phải điểm kết, thất bại không phải dấu chấm hết: điều quan trọng là lòng can đảm để tiếp tục.",
  "Hãy tin rằng bạn có thể, và bạn đã đi được một nửa chặng đường.",
  "Cách duy nhất để làm nên điều tuyệt vời là yêu điều bạn đang làm.",
  "Giới hạn của bạn thường chỉ đến từ trí tưởng tượng của chính bạn.",
  "Hãy thúc đẩy chính mình, vì không ai có thể làm điều đó thay bạn.",
  "Những điều tuyệt vời không sinh ra từ vùng an toàn.",
  "Hãy mơ ước, mong cầu và bắt tay vào hành động.",
  "Thành công không tự tìm đến bạn. Bạn phải đứng dậy và đi tìm nó.",
  "Bạn càng nỗ lực cho điều gì đó, cảm giác khi đạt được nó sẽ càng ý nghĩa.",
];
