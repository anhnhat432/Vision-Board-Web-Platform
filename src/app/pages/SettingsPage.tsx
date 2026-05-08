import type { ChangeEvent } from "react";
import { useRef, useState } from "react";
import { CalendarDays, CloudDownload, CreditCard, Loader2, User2 } from "lucide-react";
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
import { exportAccountData } from "@/services/syncService";

function downloadJsonFile(payload: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }

  return fallback;
}

export function SettingsPage() {
  const navigate = useNavigate();
  const importFileRef = useRef<HTMLInputElement>(null);
  const [isExportingAccount, setIsExportingAccount] = useState(false);
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

  const handleAccountExport = async () => {
    if (!isConfigured || !user) {
      toast.error("Bạn cần đăng nhập để xuất dữ liệu tài khoản trên cloud.");
      return;
    }

    setIsExportingAccount(true);
    try {
      const exported = await exportAccountData();
      const dateSlug = exported.generatedAt.slice(0, 10) || new Date().toISOString().slice(0, 10);
      downloadJsonFile(exported, `dear-our-future-account-export-${dateSlug}.json`);
      toast.success("Đã tải bản xuất dữ liệu tài khoản.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể xuất dữ liệu tài khoản lúc này."));
    } finally {
      setIsExportingAccount(false);
    }
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
        <Card className="glass-surface-sm rounded-2xl border shadow-none">
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
            <Button
              type="button"
              variant="outline"
              className="mt-5 w-full gap-2 rounded-full"
              disabled={!isConfigured || !user || isExportingAccount}
              onClick={handleAccountExport}
            >
              {isExportingAccount ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CloudDownload className="h-4 w-4" />
              )}
              Xuất dữ liệu tài khoản
            </Button>
          </CardContent>
        </Card>

        <Card className="glass-surface-sm rounded-2xl border shadow-none">
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
