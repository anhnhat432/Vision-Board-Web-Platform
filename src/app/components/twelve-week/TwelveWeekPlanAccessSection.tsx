import { Crown } from "lucide-react";
import { isDemoMode, shouldShowBillingDebugUi } from "../../utils/app-mode";
import {
  getBillingActionStatusLabel,
  getBillingProviderModeLabel,
  getBillingReadinessLabel,
} from "../../utils/billing-contract";
import type { BillingProviderMode } from "../../utils/storage-types";
import { getEntitlementLabel, getPlanDefinition, getPlanLabel } from "../../utils/twelve-week-premium";
import { formatDateTimeLabel } from "../../utils/twelve-week-system-ui";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
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
    <div className="rounded-lg border border-violet-200/70 bg-violet-50/75 p-5 shadow-[0_18px_44px_-36px_rgba(124,58,237,0.24)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">Gói và quyền của bạn</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{getPlanLabel(currentPlanCode)}</p>
          <p className="mt-2 text-sm leading-7 text-slate-700">{currentPlanDefinition.description}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-violet-200 bg-white text-violet-700">
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
                  : "border-slate-200 bg-white text-slate-600"
              }
            >
              {isUnlocked ? "Đang mở" : "Đang khóa"} · {getEntitlementLabel(key)}
            </Badge>
          );
        })}
      </div>

      <div className="mt-4 grid gap-3">
        <div className="rounded-lg border border-violet-100 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-violet-700">Trạng thái nhanh</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">
            {unlockedEntitlementCount}/{ENTITLEMENT_ORDER.length} quyền premium đang mở
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Nâng cấp gói Plus để mở toàn bộ quyền nâng cao.
          </p>
        </div>

        {billingDebugUi ? (
          <>
            <div className="rounded-lg border border-violet-100 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.16em] text-violet-700">Billing contract</p>
                <Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-800">
                  {getBillingProviderModeLabel(billingProviderStatus.mode)}
                </Badge>
              </div>
              <div className="mt-3 space-y-1 text-sm text-slate-700">
                <p>Provider: {billingProviderStatus.providerLabel}</p>
                <p>Checkout: {getBillingReadinessLabel(billingProviderStatus.checkoutReady, "Local fallback")}</p>
                <p>Restore: {getBillingReadinessLabel(billingProviderStatus.restoreReady, "Local fallback")}</p>
                <p>
                  Kiểm tra quyền:{" "}
                  {getBillingReadinessLabel(billingProviderStatus.entitlementSyncReady, "Local fallback")}
                </p>
                <p>
                  Cổng quản lý: {getBillingReadinessLabel(billingProviderStatus.manageBillingReady, "Chưa cấu hình")}
                </p>
              </div>
            </div>

            <div
              className={`rounded-lg border px-4 py-4 ${getBillingSnapshotTone(
                lastEntitlementSyncSnapshot?.providerMode ?? "local_test",
                lastEntitlementSyncSnapshot?.status ?? "local_only",
              )}`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em]">Kiểm tra quyền local</p>
                <Badge variant="outline" className="border-current/20 bg-white/70 text-current">
                  {getBillingActionStatusLabel(lastEntitlementSyncSnapshot?.status ?? "local_only")}
                </Badge>
              </div>
              <p className="mt-3 text-sm font-semibold">
                {lastEntitlementSyncSnapshot
                  ? `${lastEntitlementSyncSnapshot.planCode} · ${lastEntitlementSyncSnapshot.entitlementCount} quyền`
                  : "Chưa có lần kiểm tra nào"}
              </p>
              <p className="mt-1 text-sm opacity-80">
                {lastEntitlementSyncSnapshot?.message ??
                  "Khi kiểm tra, web sẽ đọc lại trạng thái quyền từ provider hoặc local fallback."}
              </p>
              <p className="mt-3 text-xs uppercase tracking-[0.16em] opacity-60">
                {lastEntitlementSyncSnapshot ? formatDateTimeLabel(lastEntitlementSyncSnapshot.at) : "Chưa chạy"}
              </p>
            </div>

            <div
              className={`rounded-lg border px-4 py-4 ${getBillingSnapshotTone(
                lastRestoreAccessSnapshot?.providerMode ?? "local_test",
                lastRestoreAccessSnapshot?.status ?? "local_only",
              )}`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em]">Khôi phục mock upgrade</p>
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
                  "Dùng khi bạn đã từng mở mock upgrade và muốn lấy lại quyền local trên trình duyệt này."}
              </p>
              <p className="mt-3 text-xs uppercase tracking-[0.16em] opacity-60">
                {lastRestoreAccessSnapshot ? formatDateTimeLabel(lastRestoreAccessSnapshot.at) : "Chưa chạy"}
              </p>
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-violet-100 bg-white p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-violet-700">Trạng thái gói</p>
            <p className="mt-2 text-lg font-semibold text-slate-950">
              {currentPlanCode === "FREE"
                ? "Bạn đang dùng gói Free."
                : "Gói Plus đang hoạt động."}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {currentPlanCode === "FREE"
                ? "Nâng cấp Plus để mở quyền nâng cao cho chu kỳ 12 tuần."
                : "Quyền premium được đồng bộ từ server."}
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-2">
        {currentPlanCode === "FREE" ? (
          <>
            <Button className="bg-slate-950 text-white hover:bg-slate-800" onClick={() => onOpenUpgradePlan("PLUS")}>
              Nâng cấp Plus
            </Button>
            <Button
              variant="outline"
              className="border-violet-200 bg-white text-violet-800 hover:bg-violet-50"
              onClick={onRestorePlanAccess}
            >
              Khôi phục quyền đã mua
            </Button>
          </>
        ) : (
          <div className="rounded-lg border border-violet-100 bg-white px-4 py-3 text-sm text-slate-700">
            Gói Plus đang hoạt động trên tài khoản của bạn.
          </div>
        )}
      </div>

      <div className="mt-2 grid gap-2">
        {billingProviderStatus.manageBillingReady && (
          <Button
            variant="outline"
            className="border-violet-200 bg-white text-violet-800 hover:bg-violet-50"
            onClick={onOpenBillingPortal}
          >
            Quản lý thanh toán
          </Button>
        )}
        {billingDebugUi && (
          <Button
            variant="outline"
            className="border-violet-200 bg-white text-violet-800 hover:bg-violet-50"
            onClick={onSyncEntitlements}
            disabled={isSyncingEntitlements}
          >
            {isSyncingEntitlements ? "Đang kiểm tra..." : "Kiểm tra quyền local"}
          </Button>
        )}
        <Button
          variant="outline"
          className="border-violet-200 bg-white text-violet-800 hover:bg-violet-50"
          onClick={onRestorePlanAccess}
          disabled={isRestoringPlanAccess}
        >
          {isRestoringPlanAccess ? "Đang khôi phục..." : "Khôi phục quyền đã mua"}
        </Button>
      </div>
    </div>
  );
}
