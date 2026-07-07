import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const firebaseAppMock = vi.hoisted(() => ({
  getApp: vi.fn(),
  getApps: vi.fn(),
  initializeApp: vi.fn(),
}));

const firebaseAuthMock = vi.hoisted(() => ({
  createUserWithEmailAndPassword: vi.fn(),
  EmailAuthProvider: { credential: vi.fn() },
  getAuth: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  onAuthStateChanged: vi.fn(),
  onIdTokenChanged: vi.fn(),
  reauthenticateWithCredential: vi.fn(),
  sendEmailVerification: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  verifyBeforeUpdateEmail: vi.fn(),
}));

vi.mock("firebase/app", () => ({
  getApp: firebaseAppMock.getApp,
  getApps: firebaseAppMock.getApps,
  initializeApp: firebaseAppMock.initializeApp,
}));

vi.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword: firebaseAuthMock.createUserWithEmailAndPassword,
  EmailAuthProvider: firebaseAuthMock.EmailAuthProvider,
  getAuth: firebaseAuthMock.getAuth,
  GoogleAuthProvider: firebaseAuthMock.GoogleAuthProvider,
  onAuthStateChanged: firebaseAuthMock.onAuthStateChanged,
  onIdTokenChanged: firebaseAuthMock.onIdTokenChanged,
  reauthenticateWithCredential: firebaseAuthMock.reauthenticateWithCredential,
  sendEmailVerification: firebaseAuthMock.sendEmailVerification,
  sendPasswordResetEmail: firebaseAuthMock.sendPasswordResetEmail,
  signInWithEmailAndPassword: firebaseAuthMock.signInWithEmailAndPassword,
  signInWithPopup: firebaseAuthMock.signInWithPopup,
  signOut: firebaseAuthMock.signOut,
  verifyBeforeUpdateEmail: firebaseAuthMock.verifyBeforeUpdateEmail,
}));

function stubConfiguredFirebaseEnv() {
  vi.stubEnv("VITE_FIREBASE_API_KEY", "test-api-key");
  vi.stubEnv("VITE_FIREBASE_AUTH_DOMAIN", "test.firebaseapp.com");
  vi.stubEnv("VITE_FIREBASE_PROJECT_ID", "vision-test");
  vi.stubEnv("VITE_FIREBASE_APP_ID", "app-test");
}

function stubUnconfiguredFirebaseEnv() {
  vi.stubEnv("VITE_FIREBASE_API_KEY", "");
  vi.stubEnv("VITE_FIREBASE_AUTH_DOMAIN", "");
  vi.stubEnv("VITE_FIREBASE_PROJECT_ID", "");
  vi.stubEnv("VITE_FIREBASE_APP_ID", "");
}

async function loadFirebaseModule() {
  vi.resetModules();
  return import("./firebase");
}

function makeCredential(emailVerified = false) {
  const user = {
    uid: "user_signup",
    email: "new@example.test",
    emailVerified,
    getIdToken: vi.fn().mockResolvedValue("token-test"),
  };
  return { user };
}

describe("registerWithEmail", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    firebaseAppMock.getApps.mockReturnValue([]);
    firebaseAppMock.initializeApp.mockReturnValue({ name: "firebase-app" });
    firebaseAuthMock.getAuth.mockReturnValue({ currentUser: null });
    firebaseAuthMock.sendEmailVerification.mockResolvedValue(undefined);
    stubConfiguredFirebaseEnv();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("sends an initial verification email for unverified signups", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_765_000_000_000);
    const credential = makeCredential(false);
    firebaseAuthMock.createUserWithEmailAndPassword.mockResolvedValue(credential);
    const { registerWithEmail } = await loadFirebaseModule();

    await expect(registerWithEmail("new@example.test", "password123")).resolves.toBe(credential);

    expect(firebaseAuthMock.createUserWithEmailAndPassword).toHaveBeenCalledWith(
      { currentUser: null },
      "new@example.test",
      "password123",
    );
    expect(credential.user.getIdToken).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem("firebase_id_token")).toBe("session");
    expect(firebaseAuthMock.sendEmailVerification).toHaveBeenCalledWith(credential.user);
    expect(window.localStorage.getItem("emailVerificationLastSentAt:user_signup")).toBe("1765000000000");
  });

  it("does not send a verification email for already verified signups", async () => {
    const credential = makeCredential(true);
    firebaseAuthMock.createUserWithEmailAndPassword.mockResolvedValue(credential);
    const { registerWithEmail } = await loadFirebaseModule();

    await expect(registerWithEmail("verified@example.test", "password123")).resolves.toBe(credential);

    expect(firebaseAuthMock.sendEmailVerification).not.toHaveBeenCalled();
    expect(window.localStorage.getItem("emailVerificationLastSentAt:user_signup")).toBeNull();
  });

  it("keeps signup successful when initial verification email sending fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const credential = makeCredential(false);
    firebaseAuthMock.createUserWithEmailAndPassword.mockResolvedValue(credential);
    firebaseAuthMock.sendEmailVerification.mockRejectedValue(new Error("SMTP unavailable"));
    const { registerWithEmail } = await loadFirebaseModule();

    await expect(registerWithEmail("new@example.test", "password123")).resolves.toBe(credential);

    expect(window.localStorage.getItem("firebase_id_token")).toBe("session");
    expect(window.localStorage.getItem("emailVerificationLastSentAt:user_signup")).toBeNull();
    expect(consoleError).toHaveBeenCalledWith("Failed to send initial verification email.", expect.any(Error));
  });

  it("does not attempt signup or verification when Firebase auth is unconfigured", async () => {
    vi.unstubAllEnvs();
    stubUnconfiguredFirebaseEnv();
    const { registerWithEmail } = await loadFirebaseModule();

    await expect(registerWithEmail("new@example.test", "password123")).resolves.toBeNull();

    expect(firebaseAuthMock.createUserWithEmailAndPassword).not.toHaveBeenCalled();
    expect(firebaseAuthMock.sendEmailVerification).not.toHaveBeenCalled();
  });

  it("does not return a legacy localStorage token when Firebase restores no current user", async () => {
    const authStateReady = vi.fn().mockResolvedValue(undefined);
    firebaseAuthMock.getAuth.mockReturnValue({ authStateReady, currentUser: null });
    window.localStorage.setItem("firebase_id_token", "legacy-bearer-token");
    const { getFirebaseToken } = await loadFirebaseModule();

    await expect(getFirebaseToken()).resolves.toBeNull();

    expect(authStateReady).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem("firebase_id_token")).toBeNull();
  });
});
