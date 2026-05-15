export const SAVE_STATUS = {
  saved: "Đã lưu trên thiết bị này",
  saving: "Đang lưu...",
  syncing: "Đang sao lưu lên đám mây",
  error: "Không thể lưu, vui lòng thử lại",
} as const;

export const SYNC_STATUS = {
  synced: "Đã đồng bộ",
  syncing: "Đang đồng bộ",
  offline: "Đang ngoại tuyến",
  pendingQueue: "Còn việc đang chờ đồng bộ",
  error: "Không đồng bộ được, sẽ thử lại",
} as const;

export const FEATURE_TERMS = {
  leadIndicator: "việc lặp lại",
  lagMetric: "kết quả cuối",
  todayTask: "việc hôm nay",
  output: "kết quả",
  insight: "góc nhìn",
  ramp: "Khởi động",
  peak: "Bứt phá",
  harvest: "Thu hoạch",
} as const;
