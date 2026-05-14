import { useEffect, useState } from "react";
import { Loader2, Mail, X } from "lucide-react";
import { toast } from "sonner";

import { useAuthContext } from "@/lib/auth/AuthContext";
import { sendVerificationEmail } from "@/lib/auth/firebase";
import { isDemoMode } from "@/app/utils/app-mode";
import { Button } from "../ui/button";

const RESEND_COOLDOWN_MS = 60_000;

/**
 * Shows a persistent banner when a signed-in user's email is not yet verified.
 * Only applies to email/password users in real mode — Google accounts are
 * auto-verified so this banner will never show for them.
 *
 * The banner can be dismissed for the current session (page reload brings it back).
 */
export function EmailVerificationBanner() {
  const { user } = useAuthContext();
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);
  const [lastSentAt, setLastSentAt] = useState<number | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    if (lastSentAt === null) {
      setCooldownSeconds(0);
      return;
    }
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((lastSentAt + RESEND_COOLDOWN_MS - Date.now()) / 1000));
      setCooldownSeconds(remaining);
      if (remaining === 0) {
        setLastSentAt(null);
      }
    };
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [lastSentAt]);

  // Don't show in demo mode
  if (isDemoMode()) return null;

  // Only show for signed-in users with unverified email
  if (!user || user.emailVerified) return null;

  // Google-sign-in users are always verified; skip them
  const isGoogleUser = (user.providerData ?? []).some((p) => p?.providerId === "google.com");
  if (isGoogleUser) return null;

  if (dismissed) return null;

  const handleResend = async () => {
    if (cooldownSeconds > 0) return;
    setSending(true);
    try {
      await sendVerificationEmail();
      setLastSentAt(Date.now());
      toast.success("Đã gửi lại email xác minh", {
        description: "Kiểm tra hộp thư và thư mục spam.",
      });
    } catch {
      toast.error("Không gửi được email xác minh. Vui lòng thử lại sau.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      role="alert"
      className="relative z-50 border-b border-amber-200 bg-amber-50/90 px-4 py-2 text-center text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/60 dark:text-amber-200 sm:px-6"
    >
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <span className="inline-flex items-center gap-1.5">
          <Mail className="h-3.5 w-3.5 flex-none" />
          Email chưa được xác minh.
        </span>
        <Button
          variant="outline"
          size="sm"
          className="h-6 rounded-[var(--r-pill)] border-amber-300 bg-white/80 px-2.5 text-[11px] font-medium text-amber-800 hover:bg-white dark:border-amber-500/40 dark:bg-amber-900/40 dark:text-amber-100"
          onClick={handleResend}
          disabled={sending || cooldownSeconds > 0}
        >
          {sending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : cooldownSeconds > 0 ? (
            `Gửi lại sau ${cooldownSeconds}s`
          ) : (
            "Gửi lại email xác minh"
          )}
        </Button>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-[var(--r-pill)] p-1 text-amber-600 transition-colors hover:bg-amber-100 hover:text-amber-800 dark:text-amber-300 dark:hover:bg-amber-900/50"
        aria-label="Ẩn thông báo xác minh email"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}