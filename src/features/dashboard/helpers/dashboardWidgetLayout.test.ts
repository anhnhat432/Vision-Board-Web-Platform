/**
 * Unit test — Dashboard widget layout registry + Storage_Contract regression
 * (task 8.2).
 *
 * Kiểm chứng ở lớp *thuần* (không render DOM):
 *   - Req 3.1: số widget render == số widget cấu hình → thứ tự chuẩn hoá là một
 *     hoán vị của `DASHBOARD_WIDGETS` (cùng độ dài, cùng multiset id).
 *   - Req 3.2 / 3.3: mọi widget nhóm `core_flow` đứng trước mọi widget nhóm
 *     `secondary` trong thứ tự đọc.
 *   - Req 3.4 / 3.5: layout không loại/ẩn vĩnh viễn widget nào — `getDashboardWidgetIds`
 *     gộp cả hai nhóm phủ đúng 100% id đã cấu hình. Widget rỗng vẫn nằm trong
 *     layout (trạng thái rỗng do `EmptyState` đảm nhiệm ở lớp trình bày; DOM test
 *     riêng theo design).
 *   - Req 9.1: danh sách storage keys (Storage_Contract) không đổi — snapshot theo
 *     danh sách kỳ vọng tường minh; mọi rename/thêm/xoá key sẽ làm test fail.
 */

import { describe, expect, it } from "vitest";

import {
  ANONYMOUS_USER_DATA_STORAGE_KEY,
  APP_STORAGE_KEYS,
  AUTH_OWNER_STORAGE_KEY,
  AUXILIARY_USER_DATA_STORAGE_KEYS,
  AUXILIARY_USER_DATA_STORAGE_PREFIXES,
  BACKEND_LINK_LEGACY_OWNER_STORAGE_KEY,
  BACKEND_LINK_STORAGE_KEYS,
  DEMO_FEEDBACK_STORAGE_KEY,
  LOCAL_DATA_FILE_IMPORT_PENDING_AUTH_STORAGE_PREFIX,
  LOCAL_DATA_FILE_IMPORT_RECOVERY_STORAGE_PREFIX,
  LOCAL_DATA_IMPORT_BACKUP_STORAGE_PREFIX,
  LOCAL_DATA_MIGRATION_PROMPT_STATE_KEY,
  PAGE_TOUR_SEEN_STORAGE_PREFIX,
  SCREEN_GUIDE_SEEN_STORAGE_PREFIX,
  USER_DATA_STORAGE_KEY,
  USER_DATA_UPDATED_EVENT_NAME,
} from "@/app/utils/storage-constants";
import type { WidgetGroup } from "./widgetPriority";
import {
  DASHBOARD_WIDGETS,
  getDashboardWidgetIds,
  getOrderedDashboardWidgets,
} from "./dashboardWidgetLayout";

describe("dashboardWidgetLayout — getOrderedDashboardWidgets", () => {
  it("giữ 100% widget: số widget hiển thị == số widget cấu hình (Req 3.1)", () => {
    const ordered = getOrderedDashboardWidgets();

    // Cùng độ dài: không thêm/xoá phần tử nào so với cấu hình.
    expect(ordered).toHaveLength(DASHBOARD_WIDGETS.length);

    // Cùng multiset id: không id nào bị thêm/xoá/ẩn.
    const sortById = (a: string, b: string) => a.localeCompare(b);
    expect(ordered.map((widget) => widget.id).sort(sortById)).toEqual(
      DASHBOARD_WIDGETS.map((widget) => widget.id).sort(sortById),
    );

    // Hoán vị chặt: mỗi phần tử cấu hình xuất hiện đúng một lần trong output.
    expect(new Set(ordered)).toEqual(new Set(DASHBOARD_WIDGETS));
  });

  it("mọi widget core_flow đứng trước mọi widget secondary theo thứ tự đọc (Req 3.2/3.3)", () => {
    const ordered = getOrderedDashboardWidgets();

    let seenSecondary = false;
    for (const widget of ordered) {
      if (widget.group === "secondary") {
        seenSecondary = true;
      } else {
        expect(seenSecondary).toBe(false);
      }
    }

    // Đảm bảo test có ý nghĩa: tồn tại cả hai nhóm trong cấu hình.
    const groups = new Set(ordered.map((widget) => widget.group));
    expect(groups).toEqual(new Set<WidgetGroup>(["core_flow", "secondary"]));
  });

  it("không loại/ẩn widget khỏi layout: hai nhóm gộp lại phủ đúng toàn bộ id (Req 3.4/3.5)", () => {
    const coreFlowIds = getDashboardWidgetIds("core_flow");
    const secondaryIds = getDashboardWidgetIds("secondary");

    const sortById = (a: string, b: string) => a.localeCompare(b);
    expect([...coreFlowIds, ...secondaryIds].sort(sortById)).toEqual(
      DASHBOARD_WIDGETS.map((widget) => widget.id).sort(sortById),
    );

    // Hai nhóm rời nhau (mỗi widget thuộc đúng một nhóm) → không widget nào bị bỏ sót.
    expect(coreFlowIds.length + secondaryIds.length).toBe(DASHBOARD_WIDGETS.length);
  });
});

describe("Storage_Contract regression — danh sách storage keys không đổi (Req 9.1)", () => {
  it("APP_STORAGE_KEYS giữ nguyên tên khoá và giá trị đã đăng ký", () => {
    expect(APP_STORAGE_KEYS).toEqual({
      selectedFocusArea: "selected_focus_area",
      onboardingDraft: "onboarding_draft",
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
    });
  });

  it("các storage key nền tảng của user data giữ nguyên", () => {
    expect(USER_DATA_STORAGE_KEY).toBe("visionboard_user_data");
    expect(USER_DATA_UPDATED_EVENT_NAME).toBe("visionboard:user-data-updated");
    expect(AUTH_OWNER_STORAGE_KEY).toBe("visionboard_user_data:auth_owner_uid");
    expect(ANONYMOUS_USER_DATA_STORAGE_KEY).toBe("visionboard_user_data:anonymous");
  });

  it("backend link keys và các key phụ trợ giữ nguyên", () => {
    expect(BACKEND_LINK_STORAGE_KEYS).toEqual([
      "backend_goal_links",
      "backend_plan_links",
      "backend_order_links",
      "backend_vision_board_links",
    ]);
    expect(BACKEND_LINK_LEGACY_OWNER_STORAGE_KEY).toBe("backend_link_store_legacy_owner_uid");
    expect(LOCAL_DATA_MIGRATION_PROMPT_STATE_KEY).toBe("visionboard_local_data_migration_prompt_state");
    expect(DEMO_FEEDBACK_STORAGE_KEY).toBe("visionboard_demo_feedback");
  });

  it("AUXILIARY_USER_DATA_STORAGE_KEYS giữ nguyên toàn bộ danh sách", () => {
    expect([...AUXILIARY_USER_DATA_STORAGE_KEYS]).toEqual([
      "visionboard_user_data:anonymous",
      "backend_goal_links",
      "backend_plan_links",
      "backend_order_links",
      "backend_vision_board_links",
      "backend_link_store_legacy_owner_uid",
      "visionboard_local_data_migration_prompt_state",
      "visionboard_demo_feedback",
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
      "visionboard_first_run_guidance_completed_at",
      "visionboard_rescue_dismissed",
    ]);
  });

  it("AUXILIARY_USER_DATA_STORAGE_PREFIXES giữ nguyên toàn bộ danh sách", () => {
    expect([...AUXILIARY_USER_DATA_STORAGE_PREFIXES]).toEqual([
      "visionboard_user_data:auth:",
      "backend_goal_links:auth:",
      "backend_plan_links:auth:",
      "backend_order_links:auth:",
      "backend_vision_board_links:auth:",
      "visionboard_data_mutation_queue:auth:",
      "visionboard_data_mutation_queue:recovery:",
      "visionboard_local_data_import_backup:",
      "visionboard_local_file_import_pending:auth:",
      "visionboard_local_file_import_recovery:",
      "visionboard_mock_billing_session_",
      "visionboard_screen_guide_seen:",
      "visionboard_page_tour_seen:",
    ]);
    expect(LOCAL_DATA_IMPORT_BACKUP_STORAGE_PREFIX).toBe("visionboard_local_data_import_backup:");
    expect(LOCAL_DATA_FILE_IMPORT_PENDING_AUTH_STORAGE_PREFIX).toBe("visionboard_local_file_import_pending:auth:");
    expect(LOCAL_DATA_FILE_IMPORT_RECOVERY_STORAGE_PREFIX).toBe("visionboard_local_file_import_recovery:");
    expect(SCREEN_GUIDE_SEEN_STORAGE_PREFIX).toBe("visionboard_screen_guide_seen:");
    expect(PAGE_TOUR_SEEN_STORAGE_PREFIX).toBe("visionboard_page_tour_seen:");
  });
});
