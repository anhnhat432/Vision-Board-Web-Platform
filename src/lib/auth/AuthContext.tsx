import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { User, UserCredential } from "firebase/auth";
import { toast } from "sonner";

import { post } from "@/lib/api/apiClient";
import type { UserProfile } from "@/types/api";
import { type LoginOptions, useAuth } from "./useAuth";
import { clearCachedUserProfile, readCachedUserProfile, writeCachedUserProfile } from "./userProfileCache";

interface AuthContextValue {
  user: User | null;
  userProfile: UserProfile | null;
  userProfileLoading: boolean;
  userProfileError: string | null;
  isProfileFromCache: boolean;
  authLoading: boolean;
  error: string | null;
  login: (options?: LoginOptions) => Promise<UserCredential | null>;
  logout: () => Promise<void>;
  refreshUserProfile: () => void;
  isConfigured: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const PROFILE_BOOTSTRAP_TIMEOUT_MS = 60_000;
const PROFILE_BOOTSTRAP_MAX_ATTEMPTS = 3;
const PROFILE_BOOTSTRAP_RETRY_DELAYS_MS = [1_200, 2_500] as const;
const PROFILE_BOOTSTRAP_RATE_LIMIT_DELAYS_MS = [1_000, 2_000, 4_000] as const;
const PROFILE_BOOTSTRAP_MAX_RATE_LIMIT_DELAY_MS = 8_000;
const EMAIL_VERIFICATION_RECHECK_INTERVAL_MS = 30_000;
const EMAIL_VERIFICATION_RECHECK_MAX_MS = 10 * 60_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getProfileBootstrapErrorMessage(error: unknown, timedOut: boolean): string {
  if (timedOut) {
    return "Máy chủ chưa mở được hồ sơ tài khoản sau vài lần thử. Hãy bấm Thử lại hoặc đăng xuất rồi đăng nhập lại.";
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (isRecord(error)) {
    const message = typeof error.message === "string" ? error.message.trim() : "";
    const status = typeof error.status === "number" ? error.status : null;

    if (message && status) return `${message} (HTTP ${status})`;
    if (message) return message;
    if (status) return `Không thể mở hồ sơ tài khoản. Máy chủ trả HTTP ${status}.`;
  }

  return "Không thể mở hồ sơ tài khoản. Vui lòng kiểm tra kết nối tới máy chủ và thử lại.";
}

function getErrorStatus(error: unknown): number | null {
  if (!isRecord(error)) return null;
  return typeof error.status === "number" ? error.status : null;
}

function isRateLimitError(error: unknown): boolean {
  if (!isRecord(error)) return false;
  if (error.rateLimited === true) return true;
  return getErrorStatus(error) === 429;
}

function getRetryAfterMs(error: unknown): number | null {
  if (!isRecord(error)) return null;
  return typeof error.retryAfterMs === "number" ? error.retryAfterMs : null;
}

function isNetworkError(error: unknown): boolean {
  return isRecord(error) && error.isNetworkError === true;
}

function shouldRetryProfileBootstrap(error: unknown, timedOut: boolean): boolean {
  if (timedOut || isNetworkError(error)) return true;
  if (isRateLimitError(error)) return true;

  const status = getErrorStatus(error);
  return status !== null && status >= 500;
}

function waitForProfileRetry(attemptIndex: number, error: unknown): Promise<void> {
  let delay: number;
  if (isRateLimitError(error)) {
    const retryAfter = getRetryAfterMs(error);
    const fallback =
      PROFILE_BOOTSTRAP_RATE_LIMIT_DELAYS_MS[attemptIndex] ??
      PROFILE_BOOTSTRAP_RATE_LIMIT_DELAYS_MS[PROFILE_BOOTSTRAP_RATE_LIMIT_DELAYS_MS.length - 1] ??
      0;
    delay = Math.min(
      PROFILE_BOOTSTRAP_MAX_RATE_LIMIT_DELAY_MS,
      Math.max(fallback, retryAfter ?? 0),
    );
  } else {
    const fallbackDelay = PROFILE_BOOTSTRAP_RETRY_DELAYS_MS[PROFILE_BOOTSTRAP_RETRY_DELAYS_MS.length - 1] ?? 0;
    delay = PROFILE_BOOTSTRAP_RETRY_DELAYS_MS[attemptIndex] ?? fallbackDelay;
  }

  if (delay <= 0) return Promise.resolve();

  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, delay);
  });
}

async function requestUserProfileWithTimeout(): Promise<{ profile: UserProfile; timedOut: false }> {
  let timedOut = false;
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, PROFILE_BOOTSTRAP_TIMEOUT_MS);

  try {
    const profile = await post<UserProfile>("/auth/profile", undefined, { signal: controller.signal });
    return { profile, timedOut: false };
  } catch (error) {
    throw { error, timedOut };
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, loading, error, login, logout: rawLogout, isConfigured, refreshUser } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userProfileLoading, setUserProfileLoading] = useState(false);
  const [userProfileError, setUserProfileError] = useState<string | null>(null);
  const [isProfileFromCache, setIsProfileFromCache] = useState(false);
  const [profileRefreshIndex, setProfileRefreshIndex] = useState(0);
  const bootstrappedUid = useRef<string | null>(null);
  const previousEmailVerified = useRef<boolean | null>(null);

  const refreshUserProfile = useCallback(() => {
    bootstrappedUid.current = null;
    setProfileRefreshIndex((index) => index + 1);
  }, []);

  const logout = useCallback(async () => {
    const currentUid = user?.uid;
    if (currentUid) {
      clearCachedUserProfile(currentUid);
    }
    await rawLogout();
  }, [rawLogout, user?.uid]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleForceLogout = () => {
      void logout();
    };

    window.addEventListener("auth:force-logout", handleForceLogout);
    return () => window.removeEventListener("auth:force-logout", handleForceLogout);
  }, [logout]);

  useEffect(() => {
    if (!user) {
      setUserProfile(null);
      setUserProfileLoading(false);
      setUserProfileError(null);
      setIsProfileFromCache(false);
      bootstrappedUid.current = null;
      return;
    }

    // Avoid re-bootstrapping the same user on every render unless the user retries.
    const bootstrapKey = `${user.uid}:${profileRefreshIndex}`;
    if (bootstrappedUid.current === bootstrapKey) return;
    bootstrappedUid.current = bootstrapKey;

    const cachedProfile = readCachedUserProfile(user.uid);
    if (cachedProfile) {
      // Hiển thị profile từ cache ngay để gate không lock UI khi đang refresh
      // ngầm. `isProfileFromCache=true` báo cho guard chấp nhận session này.
      setUserProfile(cachedProfile);
      setIsProfileFromCache(true);
    } else {
      setIsProfileFromCache(false);
    }

    setUserProfileLoading(true);
    setUserProfileError(null);

    let cancelled = false;
    const bootstrapUid = user.uid;

    async function bootstrapProfile() {
      let lastError: unknown = null;
      let lastTimedOut = false;

      for (let attempt = 0; attempt < PROFILE_BOOTSTRAP_MAX_ATTEMPTS; attempt++) {
        try {
          const result = await requestUserProfileWithTimeout();
          if (cancelled) return;
          setUserProfile(result.profile);
          setUserProfileError(null);
          setIsProfileFromCache(false);
          writeCachedUserProfile(result.profile);
          return;
        } catch (thrown: unknown) {
          if (cancelled) return;

          const error = isRecord(thrown) && "error" in thrown ? thrown.error : thrown;
          const timedOut = isRecord(thrown) && thrown.timedOut === true;
          lastError = error;
          lastTimedOut = timedOut;

          const hasAttemptsLeft = attempt < PROFILE_BOOTSTRAP_MAX_ATTEMPTS - 1;
          if (hasAttemptsLeft && shouldRetryProfileBootstrap(error, timedOut)) {
            await waitForProfileRetry(attempt, error);
            if (cancelled) return;
            continue;
          }

          break;
        }
      }

      if (cancelled) return;
      console.error("Failed to bootstrap user profile.", lastError);

      // Hết retry: nếu lỗi là 429/network, ưu tiên giữ session bằng cache
      // (đã set ở trên hoặc đọc lại để chắc chắn). Chỉ kick về null khi
      // không có cache hoặc lỗi nặng (5xx liên tục).
      const cachedFallback = readCachedUserProfile(bootstrapUid);
      const errorIsRecoverable = isRateLimitError(lastError) || isNetworkError(lastError) || lastTimedOut;
      if (cachedFallback && errorIsRecoverable) {
        setUserProfile(cachedFallback);
        setIsProfileFromCache(true);
        setUserProfileError(null);
        bootstrappedUid.current = null;
        return;
      }

      setUserProfile(null);
      setIsProfileFromCache(false);
      setUserProfileError(getProfileBootstrapErrorMessage(lastError, lastTimedOut));
      // Allow retry on next user change
      bootstrappedUid.current = null;
    }

    bootstrapProfile().finally(() => {
      if (cancelled) return;
      setUserProfileLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [user, profileRefreshIndex]);

  useEffect(() => {
    if (!user || user.emailVerified) return;

    const startedAt = Date.now();
    const interval = globalThis.setInterval(() => {
      if (Date.now() - startedAt > EMAIL_VERIFICATION_RECHECK_MAX_MS) {
        globalThis.clearInterval(interval);
        return;
      }
      void refreshUser();
    }, EMAIL_VERIFICATION_RECHECK_INTERVAL_MS);

    return () => globalThis.clearInterval(interval);
  }, [refreshUser, user]);

  useEffect(() => {
    if (!user) {
      previousEmailVerified.current = null;
      return;
    }

    const wasVerified = previousEmailVerified.current;
    previousEmailVerified.current = user.emailVerified === true;
    if (wasVerified === false && user.emailVerified === true) {
      toast.success("Email đã xác thực, bạn có thể tiếp tục");
      const redirectPath =
        typeof window !== "undefined" ? window.sessionStorage.getItem("emailVerification:returnTo") : null;
      if (redirectPath && typeof window !== "undefined") {
        window.sessionStorage.removeItem("emailVerification:returnTo");
        window.location.assign(redirectPath);
      }
    }
  }, [user]);

  const value: AuthContextValue = {
    user,
    userProfile,
    userProfileLoading,
    userProfileError,
    isProfileFromCache,
    authLoading: loading,
    error,
    login,
    logout,
    refreshUserProfile,
    isConfigured,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used inside AuthProvider");
  return ctx;
}

export function useOptionalAuthContext(): AuthContextValue | null {
  return useContext(AuthContext);
}
