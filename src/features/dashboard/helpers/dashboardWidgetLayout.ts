import { type DashboardWidgetDescriptor, orderDashboardWidgets, type WidgetGroup } from "./widgetPriority";

/**
 * Định danh ổn định cho từng widget của Dashboard (signed-in, có hệ thống 12
 * tuần đang chạy). Dùng làm khoá cho registry node ở lớp trình bày.
 */
export type DashboardWidgetId =
  | "today"
  | "next_action"
  | "active_goals"
  | "reflection_prompt"
  | "week_rhythm"
  | "twelve_week_trend"
  | "balance"
  | "daily_stoic"
  | "quote";

/**
 * Cột trình bày trong từng nhóm. Đây là thông tin *layout thuần* (không đổi
 * nguồn dữ liệu / điều kiện hiển thị), giữ nguyên bố cục bento hiện có:
 * - `lead`: cột trái nổi bật của nhóm core_flow (Today — card cao nhất, đứng
 *   một mình để cân bằng với nhóm 3 card bên phải).
 * - `stack`: cột phải xếp dọc của nhóm core_flow (Next action + Active goals +
 *   Reflection prompt).
 * - `main`: cột chính (rộng) của nhóm secondary.
 * - `side`: cột phụ của nhóm secondary.
 */
export type DashboardWidgetColumn = "lead" | "stack" | "main" | "side";

export interface DashboardWidgetLayoutEntry extends DashboardWidgetDescriptor {
  id: DashboardWidgetId;
  column: DashboardWidgetColumn;
}

/**
 * Bảng phân loại widget của Dashboard. `orderDashboardWidgets` là nguồn thứ tự
 * duy nhất: mọi widget `core_flow` đứng trước mọi widget `secondary` theo thứ
 * tự đọc (Req 3.2, 3.3), trong nhóm sắp theo `priority` rồi thứ tự gốc.
 *
 * Toàn bộ widget đã cấu hình đều có mặt ở đây — không xoá/ẩn vĩnh viễn widget
 * nào (Req 3.1). Việc một widget rỗng vẫn hiển thị trạng thái rỗng tại chỗ do
 * bản thân widget đảm nhiệm (Req 3.5); layout không loại widget khỏi Dashboard.
 */
export const DASHBOARD_WIDGETS: readonly DashboardWidgetLayoutEntry[] = [
  { id: "today", group: "core_flow", priority: 0, column: "lead" },
  { id: "next_action", group: "core_flow", priority: 10, column: "stack" },
  { id: "active_goals", group: "core_flow", priority: 20, column: "stack" },
  { id: "reflection_prompt", group: "core_flow", priority: 30, column: "stack" },
  { id: "week_rhythm", group: "secondary", priority: 0, column: "main" },
  { id: "twelve_week_trend", group: "secondary", priority: 10, column: "main" },
  { id: "balance", group: "secondary", priority: 20, column: "side" },
  { id: "daily_stoic", group: "secondary", priority: 30, column: "side" },
  { id: "quote", group: "secondary", priority: 40, column: "side" },
];

/**
 * Thứ tự render chuẩn hoá của toàn bộ widget Dashboard, do
 * `orderDashboardWidgets` quyết định. Kết quả là hoán vị của `DASHBOARD_WIDGETS`
 * (giữ 100% widget).
 */
export function getOrderedDashboardWidgets(): DashboardWidgetLayoutEntry[] {
  // orderDashboardWidgets trả về chính các object gốc nên vẫn giữ `id`/`column`.
  return orderDashboardWidgets(DASHBOARD_WIDGETS) as DashboardWidgetLayoutEntry[];
}

/**
 * Danh sách id widget theo thứ tự đã sắp, lọc theo nhóm và (tuỳ chọn) theo cột
 * trình bày. Group precedence và intra-group ordering đều lấy từ helper thuần,
 * cột chỉ là phân bổ trình bày để giữ nguyên bố cục bento.
 */
export function getDashboardWidgetIds(group: WidgetGroup, column?: DashboardWidgetColumn): DashboardWidgetId[] {
  return getOrderedDashboardWidgets()
    .filter((widget) => widget.group === group && (column === undefined || widget.column === column))
    .map((widget) => widget.id);
}
