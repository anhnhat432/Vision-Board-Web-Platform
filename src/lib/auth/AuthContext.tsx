import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { User, UserCredential } from "firebase/auth";

import { post } from "@/lib/api/apiClient";
import type { UserProfile } from "@/types/api";
import { type LoginOptions, useAuth } from "./useAuth";

interface AuthContextValue {
  user: User | null;
  userProfile: UserProfile | null;
  userProfileLoading: boolean;
  userProfileError: string | null;
  authLoading: boolean;
  error: string | null;
  login: (options?: LoginOptions) => Promise<UserCredential | null>;
  logout: () => Promise<void>;
  refreshUserProfile: () => void;
  isConfigured: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const PROFILE_BOOTSTRAP_TIMEOUT_MS = 20_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getProfileBootstrapErrorMessage(error: unknown, timedOut: boolean): string {
  if (timedOut) {
    return "Backend phản hồi quá lâu khi mở hồ sơ tài khoản. Nếu Render vừa ngủ, đợi vài giây rồi bấm Thử lại.";
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (isRecord(error)) {
    const message = typeof error.message === "string" ? error.message.trim() : "";
    const status = typeof error.status === "number" ? error.status : null;

    if (message && status) return `${message} (HTTP ${status})`;
    if (message) return message;
    if (status) return `Không thể mở hồ sơ tài khoản. Backend trả HTTP ${status}.`;
  }

  return "Không thể mở hồ sơ tài khoản. Vui lòng kiểm tra kết nối backend và thử lại.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, loading, error, login, logout, isConfigured } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userProfileLoading, setUserProfileLoading] = useState(false);
  const [userProfileError, setUserProfileError] = useState<string | null>(null);
  const [profileRefreshIndex, setProfileRefreshIndex] = useState(0);
  const bootstrappedUid = useRef<string | null>(null);

  const refreshUserProfile = useCallback(() => {
    bootstrappedUid.current = null;
    setProfileRefreshIndex((index) => index + 1);
  }, []);

  useEffect(() => {
    if (!user) {
      setUserProfile(null);
      setUserProfileLoading(false);
      setUserProfileError(null);
      bootstrappedUid.current = null;
      return;
    }

    // Avoid re-bootstrapping the same user on every render unless the user retries.
    const bootstrapKey = `${user.uid}:${profileRefreshIndex}`;
    if (bootstrappedUid.current === bootstrapKey) return;
    bootstrappedUid.current = bootstrapKey;
    setUserProfileLoading(true);
    setUserProfileError(null);

    let cancelled = false;
    let timedOut = false;
    const controller = new AbortController();
    const timeoutId = globalThis.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, PROFILE_BOOTSTRAP_TIMEOUT_MS);

    post<UserProfile>("/auth/profile", undefined, { signal: controller.signal })
      .then((profile) => {
        if (cancelled) return;
        setUserProfile(profile);
        setUserProfileError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error("Failed to bootstrap user profile.", err);
        setUserProfile(null);
        if (timedOut) {
          setUserProfileError(getProfileBootstrapErrorMessage(err, true));
        } else {
          setUserProfileError(getProfileBootstrapErrorMessage(err, false));
        }
        // Allow retry on next user change
        bootstrappedUid.current = null;
      })
      .finally(() => {
        if (cancelled) return;
        globalThis.clearTimeout(timeoutId);
        setUserProfileLoading(false);
      });

    return () => {
      cancelled = true;
      globalThis.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [user, profileRefreshIndex]);

  const value: AuthContextValue = {
    user,
    userProfile,
    userProfileLoading,
    userProfileError,
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
