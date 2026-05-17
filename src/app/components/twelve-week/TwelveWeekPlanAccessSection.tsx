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
  _mode: BillingProviderMode,
  status: "success" | "local_only" | "not_configured" | "offline" | "error",
) {
  if (status === "success") {
    return "border-app-accent/20 bg-app-accent-soft text-app-accent";
  }

  if (status === "local_only") return "border-app-warm/30 bg-app-warm-soft text-app-warm";
  if (status === "offline") return "border-app-warm/30 bg-app-warm-soft text-app-warm";
  if (status === "not_configured") return "border-app-line bg-app-bg text-app-ink-soft";

  return "border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-bg)] text-[color:var(--color-danger-fg)]";
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
    <div className="rounded-card border border-app-line bg-app-surface p-5 md:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-app-accent">Gói và quyền của bạn</p>
          <p className="mt-2 font-serif text-2xl font-medium text-app-ink">{getPlanLabel(currentPlanCode)}</p>
          <p className="mt-2 text-[14px] leading-7 text-app-ink-soft">{currentPlanDefinition.description}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-app-accent/20 bg-app-accent-soft text-app-accent">
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
                  ? "border-app-accent/20 bg-app-accent-soft text-app-accent"
                  : "border-app-line bg-app-bg text-app-ink-muted"
              }
            >
              {isUnlocked ? "Đang mở" : "Đang khóa"} · {getEntitlementLabel(key)}
            </Badge>
          );
        })}
      </div>

      <div className="mt-4 grid gap-3">
        <div className="rounded-lg border border-app-line bg-app-bg p-4">
          <p className="text-[12px] uppercase tracking-[0.16em] text-app-ink-muted">Trạng thái nhanh</p>
          <p className="mt-2 font-serif text-lg font-medium text-app-ink">
            {unlockedEntitlementCount}/{ENTITLEMENT_ORDER.length} quyền Plus đang mở
          </p>
          <p className="mt-1 text-[14px] text-app-ink-soft">
            Nâng cấp gói Plus để mở toàn bộ quyền nâng cao.
          </p>
        </div>

        {shouldShowSubscriptionDetails ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-app-line bg-app-bg p-4">
              <p className="text-[12px] uppercase tracking-[0.16em] text-app-ink-muted">Trạng thái</p>
              <p className="mt-2 text-[14px] font-semibold text-app-ink">
                {getSubscriptionStatusLabel(subscription?.status)}
              </p>
            </div>
            <div className="rounded-lg border border-app-line bg-app-bg p-4">
              <p className="text-[12px] uppercase tracking-[0.16em] text-app-ink-muted">{renewalLabel}</p>
              <p className="mt-2 text-[14px] font-semibold text-app-ink">{formatPlanDate(subscription?.renewsAt)}</p>
            </div>
            <div className="rounded-lg border border-app-line bg-app-bg p-4">
              <p className="text-[12px] uppercase tracking-[0.16em] text-app-ink-muted">Chu kỳ</p>
              <p className="mt-2 text-[14px] font-semibold text-app-ink">
                {getBillingCycleLabel(subscription?.billingCycle)}
              </p>
            </div>
          </div>
        ) : null}

        {billingDebugUi ? (
          <>
            <div className="rounded-lg border border-app-line bg-app-bg p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[12px] uppercase tracking-[0.16em] text-app-ink-muted">Billing contract</p>
                <Badge variant="outline" className="border-app-accent/20 bg-app-accent-soft text-app-accent">
                  {getBillingProviderModeLabel(billingProviderStatus.mode)}
                </Badge>
              </div>
              <div className="mt-3 space-y-1 text-[14px] text-app-ink-soft">
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
              className={`rounded-lg border px-4 py-4 ${getBillingSnapshotTone(
                lastEntitlementSyncSnapshot?.providerMode ?? "local_test",
                lastEntitlementSyncSnapshot?.status ?? "local_only",
              )}`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-[12px] font-semibold uppercase tracking-[0.16em]">Kiểm tra quyền trên thiết bị</p>
                <Badge variant="outline" className="border-current/20 bg-app-surface/70 text-current">
                  {getBillingActionStatusLabel(lastEntitlementSyncSnapshot?.status ?? "local_only")}
                </Badge>
              </div>
              <p className="mt-3 text-[14px] font-semibold">
                {lastEntitlementSyncSnapshot
                  ? `${lastEntitlementSyncSnapshot.planCode} · ${lastEntitlementSyncSnapshot.entitlementCount} quyền`
                  : "Chưa có lần kiểm tra nào"}
              </p>
              <p className="mt-1 text-[14px] opacity-80">
                {lastEntitlementSyncSnapshot?.message ??
                  "Khi kiểm tra, web sẽ đọc lại trạng thái quyền từ đơn vị thanh toán hoặc bản dự phòng trên thiết bị."}
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
                <p className="text-[12px] font-semibold uppercase tracking-[0.16em]">Khôi phục quyền Plus</p>
                <Badge variant="outline" className="border-current/20 bg-app-surface/70 text-current">
                  {getBillingActionStatusLabel(lastRestoreAccessSnapshot?.status ?? "local_only")}
                </Badge>
              </div>
              <p className="mt-3 text-[14px] font-semibold">
                {lastRestoreAccessSnapshot
                  ? `${lastRestoreAccessSnapshot.planCode} · ${lastRestoreAccessSnapshot.entitlementCount} quyền`
                  : "Chưa có lần khôi phục nào"}
              </p>
              <p className="mt-1 text-[14px] opacity-80">
                {lastRestoreAccessSnapshot?.message ??
                  "Dùng khi bạn đã từng mở Plus và muốn lấy lại quyền trên thiết bị này."}
              </p>
              <p className="mt-3 text-xs uppercase tracking-[0.16em] opacity-60">
                {lastRestoreAccessSnapshot ? formatDateTimeLabel(lastRestoreAccessSnapshot.at) : "Chưa chạy"}
              </p>
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-app-line bg-app-bg p-4">
            <p className="text-[12px] uppercase tracking-[0.16em] text-app-ink-muted">Trạng thái gói</p>
            <p className="mt-2 font-serif text-lg font-medium text-app-ink">
              {currentPlanCode === "FREE"
                ? "Bạn đang dùng gói Miễn phí."
                : "Gói Plus đang hoạt động."}
            </p>
            <p className="mt-1 text-[14px] text-app-ink-soft">
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
            <Button className="bg-app-accent text-white hover:bg-app-accent/90" onClick={() => onOpenUpgradePlan("PLUS")}>
              Nâng cấp Plus
            </Button>
            <Button
              variant="outline"
              className="border-app-line bg-app-surface text-app-ink hover:bg-app-bg"
              onClick={onRestorePlanAccess}
            >
              Khôi phục quyền đã mua
            </Button>
          </>
        ) : (
          <div className="rounded-lg border border-app-line bg-app-bg px-4 py-3 text-[14px] text-app-ink-soft">
            Gói Plus đang hoạt động trên tài khoản của bạn.
          </div>
        )}
      </div>

      <div className="mt-2 grid gap-2">
        {billingProviderStatus.manageBillingReady && (
          <Button
            variant="outline"
            className="border-app-line bg-app-surface text-app-ink hover:bg-app-bg"
            onClick={onOpenBillingPortal}
          >
            Quản lý thanh toán
          </Button>
        )}
        {billingDebugUi && (
          <Button
            variant="outline"
            className="border-app-line bg-app-surface text-app-ink hover:bg-app-bg"
            onClick={onSyncEntitlements}
            disabled={isSyncingEntitlements}
          >
            {isSyncingEntitlements ? "Đang kiểm tra..." : "Kiểm tra quyền local"}
          </Button>
        )}
        <Button
          variant="outline"
          className="border-app-line bg-app-surface text-app-ink hover:bg-app-bg"
          onClick={onRestorePlanAccess}
          disabled={isRestoringPlanAccess}
        >
          {isRestoringPlanAccess ? "Đang khôi phục..." : "Khôi phục quyền đã mua"}
        </Button>
      </div>
    </div>
  );
}
