import { Loader2, RefreshCw } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { useAuthContext } from "@/lib/auth/AuthContext";
import { adminGetOverview } from "@/services/adminService";
import { AdminDataPanel } from "../components/admin/AdminDataPanel";
import { AdminFeedbackBanner } from "../components/admin/AdminFeedbackBanner";
import { AdminPageHeader } from "../components/admin/AdminPageHeader";
import { AdminStatusBadge } from "../components/admin/AdminStatusBadge";
import { ADMIN_LOAD_TIMEOUT_MS, formatDate, getErrorMessage, withTimeout } from "../components/admin/utils";
import { Button } from "../components/ui/button";

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <span className="text-xs text-app-ink-muted shrink-0">{label}</span>
      <span className="min-w-0 break-words text-right text-sm text-app-ink">{value}</span>
    </div>
  );
}

export function AdminSettingsPage() {
  const { authLoading, user, userProfile, userProfileLoading } = useAuthContext();
  const isAdmin = userProfile?.role === "admin";

  const [emailStatus, setEmailStatus] = useState<{ configured: boolean; provider: string; reason?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const overview = await withTimeout(adminGetOverview(), ADMIN_LOAD_TIMEOUT_MS, "Quá thời gian tải.");
      setEmailStatus(overview.email);
      setGeneratedAt(overview.generatedAt);
    } catch (err) {
      setError(getErrorMessage(err, "Không thể tải cấu hình hệ thống."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || userProfileLoading) return;
    if (!user || !isAdmin) { setLoading(false); return; }
    void load();
  }, [authLoading, isAdmin, load, user, userProfileLoading]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Cài đặt hệ thống"
        description="Trạng thái các dịch vụ và cấu hình hệ thống."
        actions={
          <Button
            type="button"
            variant="outline"
            className="gap-2 border-app-line bg-app-bg-subtle text-app-ink hover:bg-app-accent-soft"
            disabled={loading}
            onClick={() => void load()}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : (
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
            )}
            Tải lại
          </Button>
        }
      />

      {error ? (
        <AdminFeedbackBanner
          tone="error"
          summary={error}
          action={
            <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
              Thử lại
            </Button>
          }
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <AdminDataPanel title="Email Provider" busy={loading} contentClassName="space-y-1 p-5">
          {loading && !emailStatus ? (
            <div className="space-y-2">
              <div className="h-4 w-24 animate-pulse rounded bg-app-accent-soft motion-reduce:animate-none" />
              <div className="h-4 w-32 animate-pulse rounded bg-app-accent-soft motion-reduce:animate-none" />
            </div>
          ) : emailStatus ? (
            <>
              <InfoRow label="Provider" value={emailStatus.provider} />
              <InfoRow
                label="Trạng thái"
                value={
                  <AdminStatusBadge tone={emailStatus.configured ? "completed" : "failed"}>
                    {emailStatus.configured ? "Đã cấu hình" : "Chưa cấu hình"}
                  </AdminStatusBadge>
                }
              />
              {emailStatus.reason ? <InfoRow label="Chi tiết" value={emailStatus.reason} /> : null}
            </>
          ) : null}
        </AdminDataPanel>

        <AdminDataPanel title="Payment Provider" contentClassName="space-y-1 p-5">
          <InfoRow label="Mode" value={import.meta.env.VITE_APP_MODE === "real" ? "Production (real)" : "Demo"} />
          <InfoRow label="Billing mode" value={import.meta.env.VITE_BILLING_MODE || "N/A"} />
          <InfoRow label="Support email" value={import.meta.env.VITE_BILLING_SUPPORT_EMAIL || "N/A"} />
        </AdminDataPanel>

        <AdminDataPanel title="Thông tin ứng dụng" contentClassName="space-y-1 p-5">
          <InfoRow label="App Mode" value={import.meta.env.VITE_APP_MODE || "N/A"} />
          <InfoRow
            label="Firebase"
            value={
              <AdminStatusBadge tone={import.meta.env.VITE_FIREBASE_API_KEY ? "completed" : "failed"}>
                {import.meta.env.VITE_FIREBASE_API_KEY ? "Đã cấu hình" : "Chưa cấu hình"}
              </AdminStatusBadge>
            }
          />
          <InfoRow label="Backend API" value={import.meta.env.VITE_API_BASE_URL || "Relative (same origin)"} />
          <InfoRow label="Cập nhật lúc" value={generatedAt ? formatDate(generatedAt) : "—"} />
        </AdminDataPanel>

        <AdminDataPanel title="Nhắc hạn tự động" contentClassName="p-5">
          <p className="text-sm leading-relaxed text-app-ink-soft">
            Email nhắc hạn Plus được gửi thủ công từ Dashboard. Hệ thống chưa có cron job tự động.{" "}
            Vào <strong>Tổng quan → Nhắc gia hạn Plus</strong> để gửi.
          </p>
        </AdminDataPanel>
      </div>
    </div>
  );
}

export default AdminSettingsPage;
