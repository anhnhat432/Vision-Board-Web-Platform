import { Bell, Loader2, Mail, RefreshCw, Server, Shield } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAuthContext } from "@/lib/auth/AuthContext";
import { adminGetOverview } from "@/services/adminService";
import { AdminPageHeader } from "../components/admin/AdminPageHeader";
import { adminSurface } from "../components/admin/tokens";
import { ADMIN_LOAD_TIMEOUT_MS, formatDate, getErrorMessage, withTimeout } from "../components/admin/utils";
import { Button } from "../components/ui/button";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <span className="text-xs text-app-ink-muted shrink-0">{label}</span>
      <span className="text-sm text-app-ink text-right">{value}</span>
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
          <Button type="button" variant="outline" className="gap-2 border-app-line bg-app-bg-subtle text-app-ink hover:bg-app-accent-soft" disabled={loading} onClick={() => void load()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Tải lại
          </Button>
        }
      />

      {error ? (
        <div className="rounded-[var(--r-card)] border border-rose-300 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10">{error}</div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Email Status */}
        <div className={`${adminSurface.card} p-5 space-y-1`}>
          <div className="flex items-center gap-2 mb-3">
            <Mail className="h-4 w-4 text-app-ink-muted" />
            <h3 className="text-sm font-semibold text-app-ink">Email Provider</h3>
          </div>
          {loading ? (
            <div className="space-y-2">
              <div className="h-4 w-24 animate-pulse rounded bg-app-accent-soft" />
              <div className="h-4 w-32 animate-pulse rounded bg-app-accent-soft" />
            </div>
          ) : emailStatus ? (
            <>
              <InfoRow label="Provider" value={emailStatus.provider} />
              <InfoRow label="Trạng thái" value={emailStatus.configured ? "✅ Đã cấu hình" : "⚠️ Chưa cấu hình"} />
              {emailStatus.reason ? <InfoRow label="Chi tiết" value={emailStatus.reason} /> : null}
            </>
          ) : null}
        </div>

        {/* Payment Provider */}
        <div className={`${adminSurface.card} p-5 space-y-1`}>
          <div className="flex items-center gap-2 mb-3">
            <Server className="h-4 w-4 text-app-ink-muted" />
            <h3 className="text-sm font-semibold text-app-ink">Payment Provider</h3>
          </div>
          <InfoRow label="Mode" value={import.meta.env.VITE_APP_MODE === "real" ? "Production (real)" : "Demo"} />
          <InfoRow label="Billing mode" value={import.meta.env.VITE_BILLING_MODE || "N/A"} />
          <InfoRow label="Support email" value={import.meta.env.VITE_BILLING_SUPPORT_EMAIL || "N/A"} />
        </div>

        {/* App Info */}
        <div className={`${adminSurface.card} p-5 space-y-1`}>
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4 text-app-ink-muted" />
            <h3 className="text-sm font-semibold text-app-ink">Thông tin ứng dụng</h3>
          </div>
          <InfoRow label="App Mode" value={import.meta.env.VITE_APP_MODE || "N/A"} />
          <InfoRow label="Firebase" value={import.meta.env.VITE_FIREBASE_API_KEY ? "✅ Đã cấu hình" : "⚠️ Chưa cấu hình"} />
          <InfoRow label="Backend API" value={import.meta.env.VITE_API_BASE_URL || "Relative (same origin)"} />
          <InfoRow label="Cập nhật lúc" value={generatedAt ? formatDate(generatedAt) : "—"} />
        </div>

        {/* Reminders */}
        <div className={`${adminSurface.card} p-5 space-y-1`}>
          <div className="flex items-center gap-2 mb-3">
            <Bell className="h-4 w-4 text-app-ink-muted" />
            <h3 className="text-sm font-semibold text-app-ink">Nhắc hạn tự động</h3>
          </div>
          <p className="text-sm text-app-ink-soft leading-relaxed">
            Email nhắc hạn Plus được gửi thủ công từ Dashboard. Hệ thống chưa có cron job tự động. 
            Vào <strong>Tổng quan → Nhắc gia hạn Plus</strong> để gửi.
          </p>
        </div>
      </div>
    </div>
  );
}

export default AdminSettingsPage;
