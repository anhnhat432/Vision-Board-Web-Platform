import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Label } from "@/app/components/ui/label";
import { UpgradePaywallDialog } from "@/app/components/UpgradePaywallDialog";
import { DeleteDataConfirmationDialog } from "@/app/components/twelve-week/DeleteDataConfirmationDialog";
import type { PremiumFeatureContext } from "@/app/utils/twelve-week-premium/types";
import type { PricingPlanCode } from "@/app/utils/storage-types";

interface TwelveWeekSystemDialogsProps {
  // Upgrade Paywall
  isUpgradeDialogOpen: boolean;
  setIsUpgradeDialogOpen: (open: boolean) => void;
  upgradeContext: PremiumFeatureContext;
  activePlanCode: PricingPlanCode;
  activeGoal: { id: string } | null;
  upgradeRecommendedPlan: PricingPlanCode;
  activeTab: string;
  handleCheckoutComplete: () => void;

  // Reset Cycle
  isResetDialogOpen: boolean;
  setIsResetDialogOpen: (open: boolean) => void;
  handleResetCycle: () => void;

  // Clear Local
  isClearLocalDialogOpen: boolean;
  setIsClearLocalDialogOpen: (open: boolean) => void;
  handleClearLocalSignals: () => void;

  // Delete Cloud
  isDeleteCloudDialogOpen: boolean;
  setIsDeleteCloudDialogOpen: (open: boolean) => void;
  isCloudDeleteConfirmed: boolean;
  setIsCloudDeleteConfirmed: (confirmed: boolean) => void;
  handleConfirmDeleteCloudWorkspace: () => void;

  // Delete All Data
  isDeleteDataDialogOpen: boolean;
  setIsDeleteDataDialogOpen: (open: boolean) => void;
  demoMode: boolean;
  isSignedIn: boolean;
  handleDeleteAllData: () => void;
  isDeletingData: boolean;
}

export function TwelveWeekSystemDialogs({
  isUpgradeDialogOpen,
  setIsUpgradeDialogOpen,
  upgradeContext,
  activePlanCode,
  activeGoal,
  upgradeRecommendedPlan,
  activeTab,
  handleCheckoutComplete,

  isResetDialogOpen,
  setIsResetDialogOpen,
  handleResetCycle,

  isClearLocalDialogOpen,
  setIsClearLocalDialogOpen,
  handleClearLocalSignals,

  isDeleteCloudDialogOpen,
  setIsDeleteCloudDialogOpen,
  isCloudDeleteConfirmed,
  setIsCloudDeleteConfirmed,
  handleConfirmDeleteCloudWorkspace,

  isDeleteDataDialogOpen,
  setIsDeleteDataDialogOpen,
  demoMode,
  isSignedIn,
  handleDeleteAllData,
  isDeletingData,
}: TwelveWeekSystemDialogsProps) {
  return (
    <>
      <UpgradePaywallDialog
        open={isUpgradeDialogOpen}
        onOpenChange={setIsUpgradeDialogOpen}
        context={upgradeContext}
        currentPlan={activePlanCode}
        goalId={activeGoal?.id ?? ""}
        recommendedPlan={upgradeRecommendedPlan}
        source={
          activeTab === "settings" ? "settings" : upgradeContext === "review" ? "review_teaser" : "12_week_system"
        }
        onCheckoutComplete={handleCheckoutComplete}
      />

      <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <AlertDialogContent className="surface-elevated rounded-2xl border border-app-line bg-app-surface shadow-[var(--shadow-3)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-app-ink">Làm mới chu kỳ 12 tuần?</AlertDialogTitle>
            <AlertDialogDescription className="text-app-ink-soft">
              Hành động này sẽ bắt đầu lại tuần 1 từ tuần hiện tại, xóa việc đã hoàn thành, check-in hằng ngày, review
              tuần và nhật ký review tuần đã liên kết của chu kỳ đang chạy.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-app-line bg-app-surface text-app-ink hover:bg-app-bg">
              Quay lại
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-app-status-error text-white hover:bg-app-status-error/90"
              onClick={handleResetCycle}
            >
              Làm mới từ tuần này
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isClearLocalDialogOpen} onOpenChange={setIsClearLocalDialogOpen}>
        <AlertDialogContent className="surface-elevated rounded-2xl border border-app-line bg-app-surface shadow-[var(--shadow-3)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-app-ink">Xóa dấu vết trên thiết bị này?</AlertDialogTitle>
            <AlertDialogDescription className="text-app-ink-soft">
              Hành động này chỉ xóa nhật ký sự kiện, việc đang chờ đồng bộ và trạng thái nhắc việc trên thiết bị. Mục
              tiêu, review tuần, nhật ký và bảng tầm nhìn của bạn vẫn được giữ nguyên.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-app-line bg-app-surface text-app-ink hover:bg-app-bg">
              Giữ lại
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-app-status-error text-white hover:bg-app-status-error/90"
              onClick={handleClearLocalSignals}
            >
              Xóa dấu vết trên thiết bị
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteCloudDialogOpen} onOpenChange={setIsDeleteCloudDialogOpen}>
        <AlertDialogContent className="surface-elevated rounded-2xl border border-app-line bg-app-surface shadow-[var(--shadow-3)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-app-ink">Xóa dữ liệu 12 tuần đã đồng bộ?</AlertDialogTitle>
            <AlertDialogDescription className="text-app-ink-soft">
              Chỉ xóa dữ liệu kế hoạch trong tài khoản (mục tiêu, kế hoạch, tuần, việc, chỉ số, check-in, review). Không
              xóa dữ liệu trên thiết bị này. Không xóa gói Plus, đăng ký hay tài khoản. Hành động này không thể hoàn
              tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-start gap-2.5 px-1 py-1">
            <Checkbox
              id="cloud-delete-confirm-checkbox"
              checked={isCloudDeleteConfirmed}
              onCheckedChange={(checked) => setIsCloudDeleteConfirmed(checked === true)}
            />
            <Label
              htmlFor="cloud-delete-confirm-checkbox"
              className="text-sm font-medium leading-relaxed text-app-ink-soft select-none cursor-pointer pt-3"
            >
              Tôi hiểu hành động này là không thể rút lại và đồng ý xóa vĩnh viễn.
            </Label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-app-line bg-app-surface text-app-ink hover:bg-app-bg">
              Quay lại
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-app-status-error text-white hover:bg-app-status-error/90 disabled:opacity-50"
              onClick={handleConfirmDeleteCloudWorkspace}
              disabled={!isCloudDeleteConfirmed}
            >
              Xóa dữ liệu đã đồng bộ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DeleteDataConfirmationDialog
        open={isDeleteDataDialogOpen}
        onOpenChange={setIsDeleteDataDialogOpen}
        isDemoMode={demoMode}
        isSignedIn={isSignedIn}
        onConfirm={handleDeleteAllData}
        isLoading={isDeletingData}
      />
    </>
  );
}
