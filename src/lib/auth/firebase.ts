import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  onIdTokenChanged,
  reauthenticateWithCredential,
  sendEmailVerification as firebaseSendEmailVerification,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  verifyBeforeUpdateEmail,
  type Auth,
  type User,
  type UserCredential,
} from "firebase/auth";

const FIREBASE_TOKEN_STORAGE_KEY = "firebase_id_token";

type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  measurementId?: string;
};

function buildFirebaseConfig(): FirebaseConfig {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY?.trim() ?? "",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim() ?? "",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim() ?? "",
    appId: import.meta.env.VITE_FIREBASE_APP_ID?.trim() ?? "",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET?.trim() || undefined,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim() || undefined,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID?.trim() || undefined,
  };
}

function isFirebaseConfigured(config: FirebaseConfig): boolean {
  return (
    config.apiKey.length > 0 &&
    config.authDomain.length > 0 &&
    config.projectId.length > 0 &&
    config.appId.length > 0
  );
}

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;

function getFirebaseBundle(): { app: FirebaseApp; auth: Auth } | null {
  if (firebaseApp && firebaseAuth) {
    return { app: firebaseApp, auth: firebaseAuth };
  }

  const config = buildFirebaseConfig();
  if (!isFirebaseConfigured(config)) {
    return null;
  }

  firebaseApp = getApps().length > 0 ? getApp() : initializeApp(config);
  firebaseAuth = getAuth(firebaseApp);

  return { app: firebaseApp, auth: firebaseAuth };
}

export function isFirebaseAuthEnabled(): boolean {
  return getFirebaseBundle() !== null;
}

export function getFirebaseAuth(): Auth | null {
  return getFirebaseBundle()?.auth ?? null;
}

export function getStoredFirebaseToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(FIREBASE_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function setStoredFirebaseToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(FIREBASE_TOKEN_STORAGE_KEY, token);
  } catch {
    // ignore storage errors
  }
}

function clearStoredFirebaseToken(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(FIREBASE_TOKEN_STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
}

async function persistCurrentUserToken(user: User): Promise<string> {
  const token = await user.getIdToken();
  setStoredFirebaseToken(token);
  return token;
}

export async function getFirebaseToken(forceRefresh = false): Promise<string | null> {
  const auth = getFirebaseAuth();
  if (!auth?.currentUser) {
    clearStoredFirebaseToken();
    return getStoredFirebaseToken();
  }

  try {
    const token = await auth.currentUser.getIdToken(forceRefresh);
    setStoredFirebaseToken(token);
    return token;
  } catch (error) {
    console.error("Failed to read Firebase token.", error);
    return getStoredFirebaseToken();
  }
}

export async function loginWithGoogle(): Promise<UserCredential | null> {
  const auth = getFirebaseAuth();
  if (!auth) return null;

  const provider = new GoogleAuthProvider();
  const credential = await signInWithPopup(auth, provider);
  await persistCurrentUserToken(credential.user);
  return credential;
}

export async function loginWithEmail(
  email: string,
  password: string,
): Promise<UserCredential | null> {
  const auth = getFirebaseAuth();
  if (!auth) return null;

  const credential = await signInWithEmailAndPassword(auth, email, password);
  await persistCurrentUserToken(credential.user);
  return credential;
}

export async function registerWithEmail(
  email: string,
  password: string,
): Promise<UserCredential | null> {
  const auth = getFirebaseAuth();
  if (!auth) return null;

  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await persistCurrentUserToken(credential.user);
  return credential;
}

export async function logoutFirebase(): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth) {
    clearStoredFirebaseToken();
    return;
  }

  await signOut(auth);
  clearStoredFirebaseToken();
}

export async function resetPassword(email: string): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Firebase chưa được cấu hình.");
  await firebaseSendPasswordResetEmail(auth, email);
}

export async function sendVerificationEmail(): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth?.currentUser) throw new Error("Chưa đăng nhập.");
  if (auth.currentUser.emailVerified) return;
  await firebaseSendEmailVerification(auth.currentUser);
}

export async function changeEmailWithPassword(newEmail: string, currentPassword: string): Promise<void> {
  const auth = getFirebaseAuth();
  const user = auth?.currentUser;
  const currentEmail = user?.email?.trim();
  if (!user || !currentEmail) throw new Error("Chưa đăng nhập bằng email.");

  const credential = EmailAuthProvider.credential(currentEmail, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await verifyBeforeUpdateEmail(user, newEmail.trim());
}

export async function reloadCurrentUser(): Promise<User | null> {
  const auth = getFirebaseAuth();
  const user = auth?.currentUser ?? null;
  if (!user) return null;
  await user.reload();
  const token = await user.getIdToken(true);
  setStoredFirebaseToken(token);
  return user;
}

export function subscribeAuthState(
  callback: (user: User | null) => void,
): () => void {
  const auth = getFirebaseAuth();
  if (!auth) {
    callback(null);
    return () => undefined;
  }

  return onAuthStateChanged(auth, (user) => {
    if (!user) {
      clearStoredFirebaseToken();
      callback(null);
      return;
    }

    void persistCurrentUserToken(user).finally(() => {
      callback(user);
    });
  });
}

export function subscribeIdToken(
  callback: (user: User | null) => void,
): () => void {
  const auth = getFirebaseAuth();
  if (!auth) {
    callback(null);
    return () => undefined;
  }

  return onIdTokenChanged(auth, (user) => {
    if (!user) {
      clearStoredFirebaseToken();
      callback(null);
      return;
    }

    void persistCurrentUserToken(user).finally(() => {
      callback(user);
    });
  });
}
