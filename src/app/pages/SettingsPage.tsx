import type { ChangeEvent } from "react";
import { useRef } from "react";
import { CalendarDays, CreditCard, User2 } from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import { DataStorageInfo } from "../components/DataStorageInfo";
import { PageHeader } from "../components/layout/PageHeader";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { DashboardDataBackupCard } from "@/features/dashboard/components/DashboardDataBackupCard";
import { useSyncedUserData } from "../hooks/useSyncedUserData";
import { useAuthContext } from "@/lib/auth/AuthContext";
import { downloadLocalUserDataBackup } from "../utils/local-data-backup";
import { getUserData, parseStoredUserData, saveUserData } from "../utils/storage";

export function SettingsPage() {
  const navigate = useNavigate();
  const importFileRef = useRef<HTMLInputElement>(null);
  const { isConfigured, user, userProfile } = useAuthContext();
  const { userData: syncedUserData, reloadUserData } = useSyncedUserData();
  const userData = syncedUserData ?? getUserData();
  const accountLabel = userProfile?.displayName || user?.displayName || user?.email || "Khách";
  const accountStatus = !isConfigured
    ? "Đang dùng demo local"
    : user
      ? userProfile?.email || user.email || "Đã đăng nhập"
      : "Chưa đăng nhập";

  const handleExport = () => {
    downloadLocalUserDataBackup({ data: userData, filenamePrefix: "dear-our-future-backup" });
    toast.success("Đã tải bản sao lưu dữ liệu.");
  };

  const handleImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result;
      if (typeof text !== "string") {
        toast.error("Không đọc được file.");
        return;
      }

      const parsed = parseStoredUserData(text);
      if (!parsed) {
        toast.error("File không hợp lệ hoặc bị hỏng.");
        return;
      }

      saveUserData(parsed);
      reloadUserData();
      toast.success("Đã nhập dữ liệu. Dashboard sẽ dùng dữ liệu mới.");
    };
    reader.onerror = () => toast.error("Không đọc được file.");
    reader.readAsText(file);
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHeader
        eyebrow="Cài đặt"
        title="Tài khoản và dữ liệu"
        description="Quản lý dữ liệu lưu trên trình duyệt, bản sao lưu và các lối tắt cài đặt quan trọng."
      />

      <section className="space-y-3" aria-label="Dữ liệu và sao lưu">
        <DataStorageInfo variant="banner" />
        <DashboardDataBackupCard
          importInputRef={importFileRef}
          onExport={handleExport}
          onImport={handleImport}
          onOpenImportPicker={() => importFileRef.current?.click()}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]" aria-label="Cài đặt nhanh">
        <Card className="glass-surface-sm rounded-[24px] border shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <User2 className="h-4 w-4 text-slate-500" />
              Tài khoản
            </CardTitle>
            <CardDescription>Thông tin đăng nhập hiện tại của workspace này.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="truncate text-sm font-semibold text-slate-900">{accountLabel}</p>
            <p className="mt-1 truncate text-sm text-slate-500">{accountStatus}</p>
          </CardContent>
        </Card>

        <Card className="glass-surface-sm rounded-[24px] border shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Lối tắt cài đặt</CardTitle>
            <CardDescription>Mở đúng khu vực khi cần chỉnh chu kỳ hoặc gói truy cập.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button variant="outline" className="gap-2 rounded-full" onClick={() => navigate("/12-week-system/settings")}>
              <CalendarDays className="h-4 w-4" />
              Cài đặt chu kỳ
            </Button>
            <Button variant="outline" className="gap-2 rounded-full" onClick={() => navigate("/billing/plan")}>
              <CreditCard className="h-4 w-4" />
              Gói & thanh toán
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
