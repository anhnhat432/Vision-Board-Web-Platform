import { useEffect, useMemo, useState } from "react";
import { Loader2, Mail, Pencil } from "lucide-react";
import { toast } from "sonner";

import { useAuthContext } from "@/lib/auth/AuthContext";
import { changeEmailWithPassword, sendVerificationEmail } from "@/lib/auth/firebase";
import { isDemoMode } from "@/app/utils/app-mode";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";

const RESEND_COOLDOWN_MS = 60_000;

function formatSentAt(timestamp: number | null): string | null {
  if (!timestamp) return null;
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(timestamp));
}

function isEmailPasswordUser(user: { providerData?: Array<{ providerId?: string | null } | null> }): boolean {
  return (user.providerData ?? []).some((provider) => provider?.providerId === "password");
}

export function EmailVerificationBanner() {
  const { user } = useAuthContext();
  const [sending, setSending] = useState(false);
  const [lastSentAt, setLastSentAt] = useState<number | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [changingEmail, setChangingEmail] = useState(false);
  const [changeEmailError, setChangeEmailError] = useState<string | null>(null);

  const pendingEmail = user?.email?.trim() ?? "";
  const lastSentLabel = useMemo(() => formatSentAt(lastSentAt), [lastSentAt]);

  useEffect(() => {
    if (lastSentAt === null) {
      setCooldownSeconds(0);
      return;
    }
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((lastSentAt + RESEND_COOLDOWN_MS - Date.now()) / 1000));
      setCooldownSeconds(remaining);
    };
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [lastSentAt]);

  useEffect(() => {
    setNewEmail(pendingEmail);
    setPassword("");
    setChangeEmailError(null);
  }, [pendingEmail]);

  if (isDemoMode()) return null;
  if (!user || user.emailVerified) return null;

  const canChangeEmail = isEmailPasswordUser(user);

  const handleResend = async () => {
    if (cooldownSeconds > 0) return;
    setSending(true);
    try {
      await sendVerificationEmail();
      setLastSentAt(Date.now());
      toast.success("Đã gửi lại email xác thực", {
        description: "Kiểm tra hộp thư và thư mục spam.",
      });
    } catch {
      toast.error("Không gửi được email xác thực. Vui lòng thử lại sau.");
    } finally {
      setSending(false);
    }
  };

  const handleChangeEmail = async () => {
    const trimmedEmail = newEmail.trim();
    if (!trimmedEmail || !password) {
      setChangeEmailError("Nhập email mới và mật khẩu hiện tại.");
      return;
    }

    setChangingEmail(true);
    setChangeEmailError(null);
    try {
      await changeEmailWithPassword(trimmedEmail, password);
      setLastSentAt(Date.now());
      toast.success("Đã gửi email xác thực tới địa chỉ mới", {
        description: "Email tài khoản sẽ đổi sau khi bạn bấm link xác thực.",
      });
      setEmailDialogOpen(false);
      setPassword("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không đổi được email. Kiểm tra mật khẩu rồi thử lại.";
      setChangeEmailError(message);
    } finally {
      setChangingEmail(false);
    }
  };

  return (
    <>
      <div
        role="alert"
        className="relative z-50 border-b border-amber-200 bg-amber-50/95 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/75 dark:text-amber-100 sm:px-6"
      >
        <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 font-semibold">
              <Mail className="h-4 w-4 flex-none" />
              Email chưa xác thực: <span className="break-all">{pendingEmail || "chưa có email"}</span>
            </p>
            <p className="mt-1 text-xs leading-5 text-amber-800 dark:text-amber-200">
              Xác thực giúp chúng tôi gửi biên nhận, hỗ trợ hoàn tiền và bảo vệ tài khoản khi dùng tính năng trả phí hoặc đồng bộ cloud.
              {lastSentLabel ? ` Gần nhất đã gửi: ${lastSentLabel}.` : ""}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-amber-300 bg-white/85 text-amber-900 hover:bg-white dark:border-amber-500/40 dark:bg-amber-900/40 dark:text-amber-100"
              onClick={handleResend}
              disabled={sending || cooldownSeconds > 0}
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : cooldownSeconds > 0 ? (
                `Gửi lại sau ${cooldownSeconds}s`
              ) : (
                "Gửi lại email xác thực"
              )}
            </Button>
            {canChangeEmail ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-amber-900 hover:bg-amber-100 dark:text-amber-100 dark:hover:bg-amber-900/50"
                onClick={() => setEmailDialogOpen(true)}
              >
                <Pencil className="mr-1 h-3.5 w-3.5" />
                Đổi email
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đổi email tài khoản</DialogTitle>
            <DialogDescription>
              Nhập email đúng và mật khẩu hiện tại. Chúng tôi sẽ gửi link xác thực tới email mới trước khi cập nhật tài khoản.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="verification-new-email" className="text-sm font-medium text-slate-700">
                Email mới
              </label>
              <Input
                id="verification-new-email"
                type="email"
                value={newEmail}
                onChange={(event) => setNewEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="verification-current-password" className="text-sm font-medium text-slate-700">
                Mật khẩu hiện tại
              </label>
              <Input
                id="verification-current-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
              />
            </div>
            {changeEmailError ? <p className="text-sm text-red-600">{changeEmailError}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)} disabled={changingEmail}>
              Huỷ
            </Button>
            <Button onClick={handleChangeEmail} disabled={changingEmail}>
              {changingEmail ? "Đang gửi..." : "Gửi xác thực email mới"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
