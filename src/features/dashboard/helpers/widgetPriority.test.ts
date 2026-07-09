/**
 * Property-Based Test — Property 4: Sắp xếp widget Dashboard là hoán vị bảo
 * toàn, nhóm Core_Flow đứng trước (task 2.6).
 *
 * "For any danh sách widget Dashboard, `orderDashboardWidgets` trả về một
 *  **hoán vị** của input (giữ đúng 100% widget — không thêm/xoá/ẩn phần tử), trong
 *  đó **mọi** widget nhóm `core_flow` xuất hiện trước **mọi** widget nhóm
 *  `secondary` theo luồng đọc từ trên xuống; và trong cùng một nhóm thứ tự tương
 *  đối tuân theo `priority` (nhỏ hơn lên trước) rồi giữ nguyên thứ tự gốc khi trùng
 *  priority (ổn định)."
 *
 * Validates: Requirements 3.1, 3.2, 3.3
 *
 * Mô hình kiểm chứng (pure — không phụ thuộc DOM/React):
 *   - Req 3.1: hiển thị 100% widget đã cấu hình, không xoá/ẩn → output là hoán vị
 *     của input (cùng độ dài, cùng multiset id, cùng tập tham chiếu phần tử).
 *   - Req 3.2 + 3.3: toàn bộ nhóm `core_flow` đứng trên toàn bộ nhóm `secondary`
 *     trong thứ tự đọc → khi đã gặp một `secondary` thì không còn `core_flow` nào
 *     phía sau.
 *   - Thứ tự trong nhóm: sắp xếp ổn định theo `priority` rồi thứ tự gốc.
 *
 * Generator: `fc.array` các `DashboardWidgetDescriptor`. `id` lấy từ một tập nhỏ
 * (ép trùng id để kiểm chứng multiset), `priority` trong khoảng hẹp (ép trùng
 * priority để kiểm chứng tính ổn định). `numRuns: 100`. Pure test — không render
 * DOM, không I/O.
 *
 * // Feature: core-flow-ui-upgrade, Property 4
 */

import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  type DashboardWidgetDescriptor,
  orderDashboardWidgets,
  type WidgetGroup,
} from "./widgetPriority";

const PROPERTY_TAG =
  "Feature: core-flow-ui-upgrade, Property 4: Sắp xếp widget Dashboard là hoán vị bảo toàn, nhóm Core_Flow đứng trước";

const GROUPS: readonly WidgetGroup[] = ["core_flow", "secondary"];

// Generator một widget: id trùng lặp có chủ đích (pool nhỏ) để test multiset,
// priority khoảng hẹp để ép trùng priority → kiểm chứng tính ổn định.
const widgetArb: fc.Arbitrary<DashboardWidgetDescriptor> = fc.record({
  id: fc.constantFrom("a", "b", "c", "d"),
  group: fc.constantFrom(...GROUPS),
  priority: fc.integer({ min: -3, max: 3 }),
});

const widgetsArb: fc.Arbitrary<DashboardWidgetDescriptor[]> = fc.array(widgetArb, {
  maxLength: 24,
});

// Thứ tự kỳ vọng trong một nhóm: sort ổn định theo priority rồi thứ tự gốc.
function expectedGroupOrder(
  widgets: readonly DashboardWidgetDescriptor[],
  group: WidgetGroup,
): DashboardWidgetDescriptor[] {
  return widgets
    .map((widget, index) => ({ widget, index }))
    .filter((entry) => entry.widget.group === group)
    .sort((a, b) => a.widget.priority - b.widget.priority || a.index - b.index)
    .map((entry) => entry.widget);
}

describe("orderDashboardWidgets — Property 4", () => {
  it(PROPERTY_TAG, () => {
    fc.assert(
      fc.property(widgetsArb, (widgets) => {
        const ordered = orderDashboardWidgets(widgets);

        // (Req 3.1) Hoán vị — cùng độ dài: không thêm/xoá phần tử.
        expect(ordered).toHaveLength(widgets.length);

        // (Req 3.1) Cùng multiset id: không có id nào bị thêm/xoá/ẩn.
        const sortById = (a: string, b: string) => a.localeCompare(b);
        expect(ordered.map((w) => w.id).sort(sortById)).toEqual(
          widgets.map((w) => w.id).sort(sortById),
        );

        // (Req 3.1) Hoán vị chặt chẽ theo tham chiếu: mỗi phần tử input xuất hiện
        // đúng một lần trong output (helper giữ nguyên tham chiếu object).
        expect(new Set(ordered)).toEqual(new Set(widgets));
        expect(ordered.every((w) => widgets.includes(w))).toBe(true);

        // (Req 3.2 + 3.3) Mọi core_flow đứng trước mọi secondary: khi đã gặp một
        // secondary thì không còn core_flow nào phía sau.
        let seenSecondary = false;
        for (const widget of ordered) {
          if (widget.group === "secondary") {
            seenSecondary = true;
          } else if (seenSecondary) {
            throw new Error("core_flow xuất hiện sau secondary trong thứ tự đọc");
          }
        }

        // Thứ tự trong nhóm ổn định theo priority rồi thứ tự gốc.
        for (const group of GROUPS) {
          const orderedInGroup = ordered.filter((w) => w.group === group);
          expect(orderedInGroup).toEqual(expectedGroupOrder(widgets, group));
        }
      }),
      { numRuns: 100 },
    );
  });
});
