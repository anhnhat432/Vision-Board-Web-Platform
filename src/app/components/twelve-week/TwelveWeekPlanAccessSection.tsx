import { Crown } from "lucide-react";
import { shouldShowBillingDebugUi } from "../../utils/app-mode";
import {
  getBillingActionStatusLabel,
  getBillingProviderModeLabel,
  getBillingReadinessLabel,
} from "../../utils/billing-contract";
import { getUserData } from "../../utils/storage";
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

function formatPlanDate(value: string | null | undefined): string {
  if (!value) return "Chưa có";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Không rõ";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function getSubscriptionStatusLabel(status: string | undefined): string {
  switch (status) {
    case "active":
      return "Đang hoạt động";
    case "trialing":
      return "Đang trong thời gian ưu đãi";
    case "canceled":
      return "Đã hủy";
    case "inactive":
      return "Không hoạt động";
    default:
      return "Chưa có thông tin";
  }
}

function getBillingCycleLabel(cycle: string | undefined): string {
  switch (cycle) {
    case "monthly":
      return "Hàng tháng";
    case "quarterly":
      return "Hàng quý";
    case "yearly":
      return "Hàng năm";
    default:
      return "Chu kỳ 12 tuần";
  }
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
  const billingDebugUi = shouldShowBillingDebugUi();
  const unlockedEntitlementCount = ENTITLEMENT_ORDER.filter((key) => entitlementKeys.includes(key)).length;
  const subscription = getUserData().subscription;
  const shouldShowSubscriptionDetails = currentPlanCode !== "FREE" || Boolean(subscription);
  const renewalLabel = subscription?.status === "canceled" ? "Hiệu lực đến" : "Gia hạn / hết hạn";

  return (
    <div className="rounded-[var(--r-control)] border border-violet-200/70 bg-violet-50/75 p-5 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">Gói và quyền của bạn</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{getPlanLabel(currentPlanCode)}</p>
          <p className="mt-2 text-sm leading-7 text-slate-700">{currentPlanDefinition.description}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-[var(--r-control)] border border-violet-200 bg-white text-violet-700">
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
        <div className="rounded-[var(--r-control)] border border-violet-100 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-violet-700">Trạng thái nhanh</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">
            {unlockedEntitlementCount}/{ENTITLEMENT_ORDER.length} quyền Plus đang mở
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Nâng cấp gói Plus để mở toàn bộ quyền nâng cao.
          </p>
        </div>

        {shouldShowSubscriptionDetails ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[var(--r-control)] border border-violet-100 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-violet-700">Trạng thái</p>
              <p className="mt-2 text-sm font-semibold text-slate-950">
                {getSubscriptionStatusLabel(subscription?.status)}
              </p>
            </div>
            <div className="rounded-[var(--r-control)] border border-violet-100 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-violet-700">{renewalLabel}</p>
              <p className="mt-2 text-sm font-semibold text-slate-950">{formatPlanDate(subscription?.renewsAt)}</p>
            </div>
            <div className="rounded-[var(--r-control)] border border-violet-100 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-violet-700">Chu kỳ</p>
              <p className="mt-2 text-sm font-semibold text-slate-950">
                {getBillingCycleLabel(subscription?.billingCycle)}
              </p>
            </div>
          </div>
        ) : null}

        {billingDebugUi ? (
          <>
            <div className="rounded-[var(--r-control)] border border-violet-100 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.16em] text-violet-700">Billing contract</p>
                <Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-800">
                  {getBillingProviderModeLabel(billingProviderStatus.mode)}
                </Badge>
              </div>
              <div className="mt-[var(--space-inline)] space-y-1 text-sm text-slate-700">
                <p>Đơn vị thanh toán: {billingProviderStatus.providerLabel}</p>
                <p>Thanh toán: {getBillingReadinessLabel(billingProviderStatus.checkoutReady, "Dự phòng trên thiết bị")}</p>
                <p>Khôi phục: {getBillingReadinessLabel(billingProviderStatus.restoreReady, "Dự phòng trên thiết bị")}</p>
                <p>
                  Kiểm tra quyền:{" "}
                  {getBillingReadinessLabel(billingProviderStatus.entitlementSyncReady, "Dự phòng trên thiết bị")}
                </p>
                <p>
                  Cổng quản lý: {getBillingReadinessLabel(billingProviderStatus.manageBillingReady, "Chưa cấu hình")}
                </p>
              </div>
            </div>

            <div
              className={`rounded-[var(--r-control)] border px-4 py-4 ${getBillingSnapshotTone(
                lastEntitlementSyncSnapshot?.providerMode ?? "local_test",
                lastEntitlementSyncSnapshot?.status ?? "local_only",
              )}`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em]">Kiểm tra quyền trên thiết bị</p>
                <Badge variant="outline" className="border-current/20 bg-white/70 text-current">
                  {getBillingActionStatusLabel(lastEntitlementSyncSnapshot?.status ?? "local_only")}
                </Badge>
              </div>
              <p className="mt-[var(--space-inline)] text-sm font-semibold">
                {lastEntitlementSyncSnapshot
                  ? `${lastEntitlementSyncSnapshot.planCode} · ${lastEntitlementSyncSnapshot.entitlementCount} quyền`
                  : "Chưa có lần kiểm tra nào"}
              </p>
              <p className="mt-1 text-sm opacity-80">
                {lastEntitlementSyncSnapshot?.message ??
                  "Khi kiểm tra, web sẽ đọc lại trạng thái quyền từ đơn vị thanh toán hoặc bản dự phòng trên thiết bị."}
              </p>
              <p className="mt-[var(--space-inline)] text-xs uppercase tracking-[0.16em] opacity-60">
                {lastEntitlementSyncSnapshot ? formatDateTimeLabel(lastEntitlementSyncSnapshot.at) : "Chưa chạy"}
              </p>
            </div>

            <div
              className={`rounded-[var(--r-control)] border px-4 py-4 ${getBillingSnapshotTone(
                lastRestoreAccessSnapshot?.providerMode ?? "local_test",
                lastRestoreAccessSnapshot?.status ?? "local_only",
              )}`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em]">Khôi phục quyền Plus</p>
                <Badge variant="outline" className="border-current/20 bg-white/70 text-current">
                  {getBillingActionStatusLabel(lastRestoreAccessSnapshot?.status ?? "local_only")}
                </Badge>
              </div>
              <p className="mt-[var(--space-inline)] text-sm font-semibold">
                {lastRestoreAccessSnapshot
                  ? `${lastRestoreAccessSnapshot.planCode} · ${lastRestoreAccessSnapshot.entitlementCount} quyền`
                  : "Chưa có lần khôi phục nào"}
              </p>
              <p className="mt-1 text-sm opacity-80">
                {lastRestoreAccessSnapshot?.message ??
                  "Dùng khi bạn đã từng mở Plus và muốn lấy lại quyền trên thiết bị này."}
              </p>
              <p className="mt-[var(--space-inline)] text-xs uppercase tracking-[0.16em] opacity-60">
                {lastRestoreAccessSnapshot ? formatDateTimeLabel(lastRestoreAccessSnapshot.at) : "Chưa chạy"}
              </p>
            </div>
          </>
        ) : (
          <div className="rounded-[var(--r-control)] border border-violet-100 bg-white p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-violet-700">Trạng thái gói</p>
            <p className="mt-2 text-lg font-semibold text-slate-950">
              {currentPlanCode === "FREE"
                ? "Bạn đang dùng gói Miễn phí."
                : "Gói Plus đang hoạt động."}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {currentPlanCode === "FREE"
                ? "Nâng cấp Plus để mở quyền nâng cao cho chu kỳ 12 tuần."
                : "Quyền nâng cao được đồng bộ từ tài khoản."}
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
          <div className="rounded-[var(--r-control)] border border-violet-100 bg-white px-4 py-3 text-sm text-slate-700">
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
