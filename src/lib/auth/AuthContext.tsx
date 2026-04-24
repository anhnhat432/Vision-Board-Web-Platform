import { createContext, useContext, useEffect, useRef, useState } from "react";
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
  isConfigured: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, loading, error, login, logout, isConfigured } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userProfileLoading, setUserProfileLoading] = useState(false);
  const [userProfileError, setUserProfileError] = useState<string | null>(null);
  const bootstrappedUid = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      setUserProfile(null);
      setUserProfileLoading(false);
      setUserProfileError(null);
      bootstrappedUid.current = null;
      return;
    }

    // Avoid re-bootstrapping the same user on every render
    if (bootstrappedUid.current === user.uid) return;
    bootstrappedUid.current = user.uid;
    setUserProfileLoading(true);
    setUserProfileError(null);

    let cancelled = false;

    post<UserProfile>("/auth/profile")
      .then((profile) => {
        if (cancelled) return;
        setUserProfile(profile);
        setUserProfileError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error("Failed to bootstrap user profile.", err);
        setUserProfile(null);
        setUserProfileError(
          err instanceof Error && err.message.trim().length > 0
            ? err.message
            : "Không thể nối backend profile.",
        );
        // Allow retry on next user change
        bootstrappedUid.current = null;
      })
      .finally(() => {
        if (cancelled) return;
        setUserProfileLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const value: AuthContextValue = {
    user,
    userProfile,
    userProfileLoading,
    userProfileError,
    authLoading: loading,
    error,
    login,
    logout,
    isConfigured,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used inside AuthProvider");
  return ctx;
}
