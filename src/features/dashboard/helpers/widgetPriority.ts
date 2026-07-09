export type WidgetGroup = "core_flow" | "secondary";

export interface DashboardWidgetDescriptor {
  id: string;
  group: WidgetGroup;
  /** Thứ tự trong nhóm (nhỏ hơn = lên trước). */
  priority: number;
}

/** Trọng số nhóm: core_flow luôn đứng trước secondary trong thứ tự đọc. */
const GROUP_RANK: Record<WidgetGroup, number> = {
  core_flow: 0,
  secondary: 1,
};

/**
 * Sắp xếp ổn định: mọi widget core_flow đứng trước mọi widget secondary,
 * trong mỗi nhóm giữ theo `priority` rồi thứ tự gốc. KHÔNG loại bỏ phần tử —
 * output là hoán vị của input (Req 3.1, 3.2, 3.3).
 */
export function orderDashboardWidgets(
  widgets: readonly DashboardWidgetDescriptor[],
): DashboardWidgetDescriptor[] {
  return widgets
    .map((widget, index) => ({ widget, index }))
    .sort((a, b) => {
      const groupDelta = GROUP_RANK[a.widget.group] - GROUP_RANK[b.widget.group];
      if (groupDelta !== 0) {
        return groupDelta;
      }

      const priorityDelta = a.widget.priority - b.widget.priority;
      if (priorityDelta !== 0) {
        return priorityDelta;
      }

      // Giữ thứ tự gốc khi cùng nhóm và cùng priority (ổn định).
      return a.index - b.index;
    })
    .map((entry) => entry.widget);
}
