import type { User, UserCredential } from "firebase/auth";
import { useCallback, useEffect, useState } from "react";

import { activateAuthenticatedUserData, persistActiveAuthenticatedUserData } from "@/app/utils/storage";
import { clearAuthScopedSensitiveData } from "@/app/utils/storage-auth-scope";
import { patch, post } from "@/lib/api/apiClient";
import type { UserProfile } from "@/types/api";

type LoginProvider = "google" | "email";
type EmailLoginMode = "signin" | "signup";
type FirebaseAuthModule = typeof import("./firebase");

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
  refreshUser: () => Promise<User | null>;
}

const DEFAULT_LOGIN_OPTIONS: Required<Pick<LoginOptions, "provider" | "mode">> = {
  provider: "google",
  mode: "signin",
};
const FIREBASE_TOKEN_STORAGE_KEY = "firebase_id_token";

let firebaseAuthModulePromise: Promise<FirebaseAuthModule> | null = null;

function loadFirebaseAuthModule(): Promise<FirebaseAuthModule> {
  firebaseAuthModulePromise ??= import("./firebase");
  return firebaseAuthModulePromise;
}

function isFirebaseAuthConfiguredFromEnv(): boolean {
  return (
    (import.meta.env.VITE_FIREBASE_API_KEY?.trim() ?? "").length > 0 &&
    (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim() ?? "").length > 0 &&
    (import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim() ?? "").length > 0 &&
    (import.meta.env.VITE_FIREBASE_APP_ID?.trim() ?? "").length > 0
  );
}

function readStoredFirebaseToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(FIREBASE_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function hasStoredFirebaseToken(): boolean {
  return Boolean(readStoredFirebaseToken());
}

export async function recordSignupTermsAcceptance(now: Date = new Date()): Promise<UserProfile> {
  await post<UserProfile>("/auth/profile");
  return patch<UserProfile, { termsAcceptedAt: string }>("/auth/profile", {
    termsAcceptedAt: now.toISOString(),
  });
}

function getFirebaseErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object" || !("code" in error)) return null;

  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

export function resolveAuthErrorMessage(error: unknown): string {
  const code = getFirebaseErrorCode(error);

  switch (code) {
    case "auth/configuration-not-found":
      return "Đăng nhập hiện chưa sẵn sàng. Vui lòng thử lại sau hoặc liên hệ hỗ trợ.";
    case "auth/operation-not-allowed":
      return "Phương thức đăng nhập này chưa sẵn sàng. Vui lòng thử cách khác hoặc liên hệ hỗ trợ.";
    case "auth/unauthorized-domain":
      return "Trang này chưa được phép đăng nhập trên tên miền hiện tại. Vui lòng liên hệ hỗ trợ.";
    case "auth/popup-blocked":
      return "Trình duyệt đã chặn popup đăng nhập. Hãy cho phép popup rồi thử lại.";
    case "auth/popup-closed-by-user":
      return "Bạn đã đóng popup đăng nhập trước khi hoàn tất.";
    case "auth/email-already-in-use":
      return "Email này đã có tài khoản. Hãy chuyển sang đăng nhập.";
    case "auth/invalid-email":
      return "Email không hợp lệ.";
    case "auth/user-not-found":
      return "Không tìm thấy tài khoản với email này. Hãy kiểm tra lại email hoặc tạo tài khoản mới.";
    case "auth/wrong-password":
      return "Mật khẩu không đúng. Hãy thử lại hoặc dùng Quên mật khẩu để đặt lại.";
    case "auth/invalid-credential":
      return "Email hoặc mật khẩu không đúng.";
    case "auth/weak-password":
      return "Mật khẩu quá yếu. Hãy dùng ít nhất 6 ký tự.";
    default:
      break;
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Đăng nhập thất bại.";
}

export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => hasStoredFirebaseToken());
  const [error, setError] = useState<string | null>(null);
  const [shouldSubscribeAuth, setShouldSubscribeAuth] = useState(() => hasStoredFirebaseToken());

  const isConfigured = isFirebaseAuthConfiguredFromEnv();

  useEffect(() => {
    if (!isConfigured || !shouldSubscribeAuth) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | null = null;
    setLoading(true);

    void loadFirebaseAuthModule()
      .then(({ subscribeIdToken }) => {
        if (cancelled) return;
        unsubscribe = subscribeIdToken((nextUser) => {
          if (nextUser) {
            activateAuthenticatedUserData(nextUser.uid);
          } else {
            persistActiveAuthenticatedUserData();
          }
          setUser(nextUser);
          setLoading(false);
        });
      })
      .catch((nextError) => {
        if (cancelled) return;
        setError(resolveAuthErrorMessage(nextError));
        setLoading(false);
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [isConfigured, shouldSubscribeAuth]);

  const login = useCallback(
    async (options?: LoginOptions): Promise<UserCredential | null> => {
      const resolvedProvider = options?.provider ?? DEFAULT_LOGIN_OPTIONS.provider;
      const resolvedMode = options?.mode ?? DEFAULT_LOGIN_OPTIONS.mode;

      setError(null);
      setLoading(true);

      try {
        if (!isConfigured) {
          return null;
        }

        if (resolvedProvider === "google") {
          const { loginWithGoogle } = await loadFirebaseAuthModule();
          const credential = await loginWithGoogle();
          if (credential) {
            activateAuthenticatedUserData(credential.user.uid);
            setUser(credential.user);
            setShouldSubscribeAuth(true);
          }
          return credential;
        }

        const email = options?.email?.trim() ?? "";
        const password = options?.password ?? "";

        if (!email || !password) {
          throw new Error("Vui lòng nhập email và mật khẩu.");
        }

        if (resolvedMode === "signup") {
          const { registerWithEmail } = await loadFirebaseAuthModule();
          const credential = await registerWithEmail(email, password);
          if (credential) {
            activateAuthenticatedUserData(credential.user.uid);
            setUser(credential.user);
            setShouldSubscribeAuth(true);
            await recordSignupTermsAcceptance();
          }
          return credential;
        }

        const { loginWithEmail } = await loadFirebaseAuthModule();
        const credential = await loginWithEmail(email, password);
        if (credential) {
          activateAuthenticatedUserData(credential.user.uid);
          setUser(credential.user);
          setShouldSubscribeAuth(true);
        }
        return credential;
      } catch (nextError) {
        const message = resolveAuthErrorMessage(nextError);
        setError(message);
        console.error("Login failed.", nextError);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [isConfigured],
  );

  const logout = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      const firebase = isConfigured ? await loadFirebaseAuthModule() : null;
      const currentAuthUid = firebase?.getFirebaseAuth()?.currentUser?.uid ?? user?.uid ?? null;

      if (currentAuthUid) {
        clearAuthScopedSensitiveData(currentAuthUid);
      }

      persistActiveAuthenticatedUserData();
      await firebase?.logoutFirebase();
      setShouldSubscribeAuth(false);
      setUser(null);
    } catch (nextError) {
      const message = resolveAuthErrorMessage(nextError);
      setError(message);
      console.error("Logout failed.", nextError);
    } finally {
      setLoading(false);
    }
  }, [isConfigured, user?.uid]);

  const getToken = useCallback(
    async (forceRefresh = false) => {
      setError(null);

      try {
        if (!isConfigured) return readStoredFirebaseToken();
        const { getFirebaseToken } = await loadFirebaseAuthModule();
        return await getFirebaseToken(forceRefresh);
      } catch (nextError) {
        const message = resolveAuthErrorMessage(nextError);
        setError(message);
        console.error("Get token failed.", nextError);
        return null;
      }
    },
    [isConfigured],
  );

  const refreshUser = useCallback(async () => {
    setError(null);

    try {
      if (!isConfigured) return null;
      const { reloadCurrentUser } = await loadFirebaseAuthModule();
      const refreshedUser = await reloadCurrentUser();
      if (refreshedUser) setUser(refreshedUser);
      return refreshedUser;
    } catch (nextError) {
      const message = resolveAuthErrorMessage(nextError);
      setError(message);
      console.error("Refresh user failed.", nextError);
      return null;
    }
  }, [isConfigured]);

  return {
    user,
    loading,
    error,
    isConfigured,
    login,
    logout,
    getToken,
    refreshUser,
  };
}
