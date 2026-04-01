import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { User, UserCredential } from "firebase/auth";

import { post } from "@/lib/api/apiClient";
import type { UserProfile } from "@/types/api";
import { type LoginOptions, useAuth } from "./useAuth";

interface AuthContextValue {
  user: User | null;
  userProfile: UserProfile | null;
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
  const bootstrappedUid = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      setUserProfile(null);
      bootstrappedUid.current = null;
      return;
    }

    // Avoid re-bootstrapping the same user on every render
    if (bootstrappedUid.current === user.uid) return;
    bootstrappedUid.current = user.uid;

    post<UserProfile>("/auth/profile")
      .then((profile) => {
        setUserProfile(profile);
      })
      .catch((err: unknown) => {
        console.error("Failed to bootstrap user profile.", err);
        // Allow retry on next user change
        bootstrappedUid.current = null;
      });
  }, [user]);

  const value: AuthContextValue = {
    user,
    userProfile,
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
