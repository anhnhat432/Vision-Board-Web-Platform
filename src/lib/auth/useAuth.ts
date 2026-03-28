import { useCallback, useEffect, useState } from "react";
import type { User, UserCredential } from "firebase/auth";

import {
  getFirebaseToken,
  isFirebaseAuthEnabled,
  loginWithEmail,
  loginWithGoogle,
  logoutFirebase,
  registerWithEmail,
  subscribeAuthState,
} from "./firebase";

type LoginProvider = "google" | "email";
type EmailLoginMode = "signin" | "signup";

export interface LoginOptions {
  provider?: LoginProvider;
  email?: string;
  password?: string;
  mode?: EmailLoginMode;
}

export interface UseAuthResult {
  user: User | null;
  loading: boolean;
  error: string | null;
  isConfigured: boolean;
  login: (options?: LoginOptions) => Promise<UserCredential | null>;
  logout: () => Promise<void>;
  getToken: (forceRefresh?: boolean) => Promise<string | null>;
}

const DEFAULT_LOGIN_OPTIONS: Required<Pick<LoginOptions, "provider" | "mode">> = {
  provider: "google",
  mode: "signin",
};

function resolveErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Authentication failed.";
}

export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isConfigured = isFirebaseAuthEnabled();

  useEffect(() => {
    const unsubscribe = subscribeAuthState((nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = useCallback(async (options?: LoginOptions): Promise<UserCredential | null> => {
    const resolvedProvider = options?.provider ?? DEFAULT_LOGIN_OPTIONS.provider;
    const resolvedMode = options?.mode ?? DEFAULT_LOGIN_OPTIONS.mode;

    setError(null);
    setLoading(true);

    try {
      if (!isConfigured) {
        return null;
      }

      if (resolvedProvider === "google") {
        return await loginWithGoogle();
      }

      const email = options?.email?.trim() ?? "";
      const password = options?.password ?? "";

      if (!email || !password) {
        throw new Error("Email and password are required.");
      }

      if (resolvedMode === "signup") {
        return await registerWithEmail(email, password);
      }

      return await loginWithEmail(email, password);
    } catch (nextError) {
      const message = resolveErrorMessage(nextError);
      setError(message);
      console.error("Login failed.", nextError);
      return null;
    } finally {
      setLoading(false);
    }
  }, [isConfigured]);

  const logout = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      await logoutFirebase();
    } catch (nextError) {
      const message = resolveErrorMessage(nextError);
      setError(message);
      console.error("Logout failed.", nextError);
    } finally {
      setLoading(false);
    }
  }, []);

  const getToken = useCallback(async (forceRefresh = false) => {
    setError(null);

    try {
      return await getFirebaseToken(forceRefresh);
    } catch (nextError) {
      const message = resolveErrorMessage(nextError);
      setError(message);
      console.error("Get token failed.", nextError);
      return null;
    }
  }, []);

  return {
    user,
    loading,
    error,
    isConfigured,
    login,
    logout,
    getToken,
  };
}
