import { Crown } from "lucide-react";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  getBillingActionStatusLabel,
  getBillingProviderModeLabel,
  getBillingReadinessLabel,
} from "../../utils/billing-contract";
import { isDemoMode, shouldShowBillingDebugUi } from "../../utils/app-mode";
import { getEntitlementLabel, getPlanDefinition, getPlanLabel } from "../../utils/twelve-week-premium";
import { formatDateTimeLabel } from "../../utils/twelve-week-system-ui";
import type { BillingProviderMode } from "../../utils/storage-types";
import type { TwelveWeekSettingsTabProps } from "./TwelveWeekSettingsShared";

type TwelveWeekPlanAccessSectionProps = Pick<
  TwelveWeekSettingsTabProps,
  | "currentPlanCode"
  | "entitlementKeys"
  | "billingProviderStatus"
  | "lastEntitlementSyncSnapshot"
  | "lastRestoreAccessSnapshot"
  | "isSyncingEntitlements"
  | "isRestoringPlanAccess"
  | "onOpenUpgradePlan"
  | "onSyncEntitlements"
  | "onRestorePlanAccess"
  | "onOpenBillingPortal"
>;

const ENTITLEMENT_ORDER = [
  "premium_templates",
  "premium_review_insights",
  "priority_reminders",
  "advanced_analytics",
] as const;

function getBillingSnapshotTone(
  mode: BillingProviderMode,
  status: "success" | "local_only" | "not_configured" | "offline" | "error",
) {
  if (status === "success") {
    return mode === "api_contract"
      ? "border-sky-200 bg-sky-50/92 text-sky-900"
      : "border-emerald-200 bg-emerald-50/92 text-emerald-900";
  }

  if (status === "local_only") return "border-amber-200 bg-amber-50/92 text-amber-900";
  if (status === "offline") return "border-orange-200 bg-orange-50/92 text-orange-900";
  if (status === "not_configured") return "border-slate-300 bg-slate-50/92 text-slate-800";

  return "border-rose-200 bg-rose-50/92 text-rose-900";
}

export function TwelveWeekPlanAccessSection({
  currentPlanCode,
  entitlementKeys,
  billingProviderStatus,
  lastEntitlementSyncSnapshot,
  lastRestoreAccessSnapshot,
  isSyncingEntitlements,
  isRestoringPlanAccess,
  onOpenUpgradePlan,
  onSyncEntitlements,
  onRestorePlanAccess,
  onOpenBillingPortal,
}: TwelveWeekPlanAccessSectionProps) {
  const currentPlanDefinition = getPlanDefinition(currentPlanCode);
  const demoMode = isDemoMode();
  const billingDebugUi = shouldShowBillingDebugUi();
  const unlockedEntitlementCount = ENTITLEMENT_ORDER.filter((key) => entitlementKeys.includes(key)).length;

  return (
    <div className="rounded-[26px] border border-violet-200/70 bg-[linear-gradient(135deg,_rgba(49,46,129,0.96)_0%,_rgba(76,29,149,0.92)_100%)] p-5 text-white shadow-[0_28px_60px_-38px_rgba(76,29,149,0.55)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">Gói và quyền 12 tuần</p>
          <p className="mt-2 text-2xl font-bold">{getPlanLabel(currentPlanCode)}</p>
          <p className="mt-2 text-sm leading-7 text-white/74">{currentPlanDefinition.description}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white">
          <Crown className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {ENTITLEMENT_ORDER.map((key) => {
          const isUnlocked = entitlementKeys.includes(key);

          return (
            <Badge
              key={key}
              variant="outline"
              className={
                isUnlocked
                  ? "border-emerald-200/70 bg-emerald-50 text-emerald-900"
                  : "border-white/15 bg-white/8 text-white/70"
              }
            >
              {isUnlocked ? "Đang mở" : "Đang khóa"} · {getEntitlementLabel(key)}
            </Badge>
          );
        })}
      </div>

      <div className="mt-4 grid gap-3">
        <div className="rounded-[22px] border border-white/12 bg-white/8 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-white/56">Trạng thái nhanh</p>
          <p className="mt-2 text-lg font-semibold text-white">
            {unlockedEntitlementCount}/{ENTITLEMENT_ORDER.length} quyền premium đang mở trên thiết bị này
          </p>
          <p className="mt-1 text-sm text-white/70">
            Nhìn nhanh xem bạn đã có đủ lớp hỗ trợ để bắt đầu nhanh, giữ nhịp đều và review rõ hơn hay chưa.
          </p>
        </div>

        {billingDebugUi ? (
          <>
            <div className="rounded-[22px] border border-white/12 bg-white/8 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.16em] text-white/56">Billing contract</p>
                <Badge variant="outline" className="border-white/15 bg-white/10 text-white">
                  {getBillingProviderModeLabel(billingProviderStatus.mode)}
                </Badge>
              </div>
              <div className="mt-3 space-y-1 text-sm text-white/72">
                <p>Provider: {billingProviderStatus.providerLabel}</p>
                <p>Checkout: {getBillingReadinessLabel(billingProviderStatus.checkoutReady, "Local fallback")}</p>
                <p>Restore: {getBillingReadinessLabel(billingProviderStatus.restoreReady, "Local fallback")}</p>
                <p>
                  Sync quyền:{" "}
                  {getBillingReadinessLabel(billingProviderStatus.entitlementSyncReady, "Local fallback")}
                </p>
                <p>
                  Cổng quản lý:{" "}
                  {getBillingReadinessLabel(billingProviderStatus.manageBillingReady, "Chưa cấu hình")}
                </p>
              </div>
            </div>

            <div
              className={`rounded-[22px] border px-4 py-4 ${getBillingSnapshotTone(
                lastEntitlementSyncSnapshot?.providerMode ?? "local_test",
                lastEntitlementSyncSnapshot?.status ?? "local_only",
              )}`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em]">Đồng bộ quyền</p>
                <Badge variant="outline" className="border-current/20 bg-white/70 text-current">
                  {getBillingActionStatusLabel(lastEntitlementSyncSnapshot?.status ?? "local_only")}
                </Badge>
              </div>
              <p className="mt-3 text-sm font-semibold">
                {lastEntitlementSyncSnapshot
                  ? `${lastEntitlementSyncSnapshot.planCode} · ${lastEntitlementSyncSnapshot.entitlementCount} quyền`
                  : "Chưa có lần đồng bộ nào"}
              </p>
              <p className="mt-1 text-sm opacity-80">
                {lastEntitlementSyncSnapshot?.message ??
                  "Khi chạy sync, app sẽ lấy lại trạng thái quyền mới nhất từ provider hoặc local fallback."}
              </p>
              <p className="mt-3 text-xs uppercase tracking-[0.16em] opacity-60">
                {lastEntitlementSyncSnapshot ? formatDateTimeLabel(lastEntitlementSyncSnapshot.at) : "Chưa chạy"}
              </p>
            </div>

            <div
              className={`rounded-[22px] border px-4 py-4 ${getBillingSnapshotTone(
                lastRestoreAccessSnapshot?.providerMode ?? "local_test",
                lastRestoreAccessSnapshot?.status ?? "local_only",
              )}`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em]">Khôi phục giao dịch</p>
                <Badge variant="outline" className="border-current/20 bg-white/70 text-current">
                  {getBillingActionStatusLabel(lastRestoreAccessSnapshot?.status ?? "local_only")}
                </Badge>
              </div>
              <p className="mt-3 text-sm font-semibold">
                {lastRestoreAccessSnapshot
                  ? `${lastRestoreAccessSnapshot.planCode} · ${lastRestoreAccessSnapshot.entitlementCount} quyền`
                  : "Chưa có lần khôi phục nào"}
              </p>
              <p className="mt-1 text-sm opacity-80">
                {lastRestoreAccessSnapshot?.message ??
                  "Dùng khi bạn đã từng mở quyền trước đó và muốn lấy lại trên thiết bị hiện tại."}
              </p>
              <p className="mt-3 text-xs uppercase tracking-[0.16em] opacity-60">
                {lastRestoreAccessSnapshot ? formatDateTimeLabel(lastRestoreAccessSnapshot.at) : "Chưa chạy"}
              </p>
            </div>
          </>
        ) : (
          <div className="rounded-[22px] border border-white/12 bg-white/8 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-white/56">Thanh toán và quyền</p>
            <p className="mt-2 text-lg font-semibold text-white">
              {demoMode
                ? "Bản demo đang mô phỏng bước nâng cấp."
                : "Quyền nâng cấp sẽ đồng bộ theo cấu hình của host."}
            </p>
            <p className="mt-1 text-sm text-white/70">
              {currentPlanCode === "FREE"
                ? "Bạn vẫn có thể dùng Free để chạy một chu kỳ. Khi cần bắt đầu nhanh hơn và review rõ hơn, hãy mở Plus."
                : "Plus đang mở toàn bộ lớp giúp bạn bắt đầu nhanh hơn, giữ nhịp đều hơn và review rõ hơn."}
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-2">
        {currentPlanCode === "FREE" ? (
          <>
            <Button className="bg-white text-slate-900 hover:bg-white/92" onClick={() => onOpenUpgradePlan("PLUS")}>
              Mở Plus để giữ nhịp tốt hơn
            </Button>
            <Button
              variant="outline"
              className="border-white/15 bg-white/10 text-white hover:bg-white/16"
              onClick={onRestorePlanAccess}
            >
              Khôi phục quyền
            </Button>
          </>
        ) : (
          <div className="rounded-[18px] border border-white/12 bg-white/8 px-4 py-3 text-sm text-white/72">
            Plus đang mở toàn bộ lớp giúp bạn bắt đầu nhanh hơn, giữ nhịp đều hơn và review rõ hơn.
          </div>
        )}
      </div>

      <div className="mt-2 grid gap-2">
        {billingProviderStatus.manageBillingReady && (
          <Button
            variant="outline"
            className="border-white/15 bg-white/10 text-white hover:bg-white/16"
            onClick={onOpenBillingPortal}
          >
            Quản lý thanh toán
          </Button>
        )}
        {billingDebugUi && (
          <Button
            variant="outline"
            className="border-white/15 bg-white/10 text-white hover:bg-white/16"
            onClick={onSyncEntitlements}
            disabled={isSyncingEntitlements}
          >
            {isSyncingEntitlements ? "Đang đồng bộ..." : "Đồng bộ quyền"}
          </Button>
        )}
        <Button
          variant="outline"
          className="border-white/15 bg-white/10 text-white hover:bg-white/16"
          onClick={onRestorePlanAccess}
          disabled={isRestoringPlanAccess}
        >
          {isRestoringPlanAccess ? "Đang khôi phục..." : "Khôi phục giao dịch"}
        </Button>
      </div>
    </div>
  );
}
