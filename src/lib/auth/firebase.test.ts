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
    expect(credential.user.getIdToken).not.toHaveBeenCalled();
    expect(window.localStorage.getItem("firebase_id_token")).toBeNull();
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

    expect(window.localStorage.getItem("firebase_id_token")).toBeNull();
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
});

describe("getFirebaseToken", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    firebaseAppMock.getApps.mockReturnValue([]);
    firebaseAppMock.initializeApp.mockReturnValue({ name: "firebase-app" });
    stubConfiguredFirebaseEnv();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("removes the legacy token and reads the current Firebase user token", async () => {
    const currentUser = {
      getIdToken: vi.fn().mockResolvedValue("fresh-token"),
    };
    const auth = {
      currentUser,
      authStateReady: vi.fn().mockResolvedValue(undefined),
    };
    firebaseAuthMock.getAuth.mockReturnValue(auth);
    localStorage.setItem("firebase_id_token", "stale-token");
    const { getFirebaseToken } = await loadFirebaseModule();

    await expect(getFirebaseToken(true)).resolves.toBe("fresh-token");

    expect(auth.authStateReady).toHaveBeenCalledTimes(1);
    expect(currentUser.getIdToken).toHaveBeenCalledWith(true);
    expect(localStorage.getItem("firebase_id_token")).toBeNull();
  });

  it("returns null instead of falling back to a legacy token when Firebase is signed out", async () => {
    firebaseAuthMock.getAuth.mockReturnValue({
      currentUser: null,
      authStateReady: vi.fn().mockResolvedValue(undefined),
    });
    localStorage.setItem("firebase_id_token", "stale-token");
    const { getFirebaseToken } = await loadFirebaseModule();

    await expect(getFirebaseToken()).resolves.toBeNull();
    expect(localStorage.getItem("firebase_id_token")).toBeNull();
  });

  it("returns null instead of falling back when Firebase token refresh fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    firebaseAuthMock.getAuth.mockReturnValue({
      currentUser: {
        getIdToken: vi.fn().mockRejectedValue(new Error("refresh failed")),
      },
      authStateReady: vi.fn().mockResolvedValue(undefined),
    });
    localStorage.setItem("firebase_id_token", "stale-token");
    const { getFirebaseToken } = await loadFirebaseModule();

    await expect(getFirebaseToken(true)).resolves.toBeNull();
    expect(localStorage.getItem("firebase_id_token")).toBeNull();
    expect(consoleError).toHaveBeenCalledWith("Failed to read Firebase token.", expect.any(Error));
  });

  it("removes the legacy token and returns null when Firebase is unconfigured", async () => {
    vi.unstubAllEnvs();
    stubUnconfiguredFirebaseEnv();
    localStorage.setItem("firebase_id_token", "stale-token");
    const { getFirebaseToken } = await loadFirebaseModule();

    await expect(getFirebaseToken()).resolves.toBeNull();
    expect(localStorage.getItem("firebase_id_token")).toBeNull();
  });
});
