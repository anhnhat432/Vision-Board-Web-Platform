# Firebase Token Memory-Only Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove application-managed Firebase ID token persistence while preserving Firebase session restoration and protected API retry behavior.

**Architecture:** A small auth utility deletes the retired `firebase_id_token` key without exposing a read API. `firebase.ts` obtains tokens only from Firebase `currentUser`, while `useAuth` subscribes on every configured cold load rather than using token storage as a bootstrap signal. Storage baseline tooling explicitly excludes the retired credential key from the product-data contract.

**Tech Stack:** React 18, TypeScript, Firebase Auth client SDK, Vitest, Testing Library, existing `authedFetch` bearer-token adapter.

## Global Constraints

- Do not persist Firebase ID tokens in application-controlled localStorage, sessionStorage, IndexedDB, cookies, URLs, logs, analytics, or app state.
- Preserve `getFirebaseToken(forceRefresh?: boolean): Promise<string | null>` and `UseAuthResult.getToken(forceRefresh?: boolean): Promise<string | null>`.
- Preserve the existing one-time force refresh after HTTP 401 and `auth:force-logout` after the second HTTP 401.
- Preserve Firebase-optional demo and unconfigured behavior.
- Do not change backend Firebase Admin middleware, API contracts, Firebase persistence mode, dependencies, or visible UI copy.
- Treat deletion of `firebase_id_token` as mandatory credential cleanup; never back up or migrate its value.
- Work in the current checkout and stage only the auth/storage-plan files listed in this plan; leave Dashboard, Schedule, ops, `.qoder`, and other WIP untouched.

---

### Task 1: Remove token persistence from the Firebase adapter

**Files:**
- Create: `src/lib/auth/legacyFirebaseToken.ts`
- Modify: `src/lib/auth/firebase.test.ts`
- Modify: `src/lib/auth/firebase.ts`

**Interfaces:**
- Produces: `clearLegacyFirebaseToken(): void` and a storage-free implementation of `getFirebaseToken(forceRefresh?: boolean)`.
- Preserves: login/register/logout/reload/subscription function signatures exported by `firebase.ts`.

- [ ] **Step 1: Add failing Firebase token-storage tests**

Add these tests to `firebase.test.ts` after the existing registration tests:

```ts
describe("getFirebaseToken", () => {
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
```

Change the existing registration assertions from persisted-token success to:

```ts
expect(credential.user.getIdToken).not.toHaveBeenCalled();
expect(window.localStorage.getItem("firebase_id_token")).toBeNull();
```

- [ ] **Step 2: Run Firebase tests and verify RED**

Run:

```bash
npm run test:run -- src/lib/auth/firebase.test.ts
```

Expected: FAIL because registration still persists `token-test`, signed-out/error paths return the stale token, and unconfigured Firebase returns stored credentials.

- [ ] **Step 3: Create the legacy cleanup utility**

Create `legacyFirebaseToken.ts`:

```ts
const LEGACY_FIREBASE_TOKEN_STORAGE_KEY = "firebase_id_token";

export function clearLegacyFirebaseToken(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(LEGACY_FIREBASE_TOKEN_STORAGE_KEY);
  } catch {
    // Credential cleanup must not break auth initialization when storage is unavailable.
  }
}
```

- [ ] **Step 4: Remove storage reads, writes, and fallbacks from `firebase.ts`**

Import the cleanup utility:

```ts
import { clearLegacyFirebaseToken } from "./legacyFirebaseToken";
```

Delete `FIREBASE_TOKEN_STORAGE_KEY`, `getStoredFirebaseToken`, `setStoredFirebaseToken`, `clearStoredFirebaseToken`, and `persistCurrentUserToken`.

Call cleanup before Firebase configuration is resolved:

```ts
function getFirebaseBundle(): { app: FirebaseApp; auth: Auth } | null {
  clearLegacyFirebaseToken();
```

Replace `getFirebaseToken` with:

```ts
export async function getFirebaseToken(forceRefresh = false): Promise<string | null> {
  const auth = getFirebaseAuth();
  if (!auth) return null;

  if (typeof auth.authStateReady === "function") {
    try {
      await auth.authStateReady();
    } catch {
      // Continue with Firebase's current in-memory auth state.
    }
  }

  if (!auth.currentUser) return null;

  try {
    return await auth.currentUser.getIdToken(forceRefresh);
  } catch (error) {
    console.error("Failed to read Firebase token.", error);
    return null;
  }
}
```

For Google login, email login, and registration, return the Firebase credential directly after the Firebase SDK call. Keep initial verification-email sending unchanged, but do not call `getIdToken` during login/registration.

Replace logout with:

```ts
export async function logoutFirebase(): Promise<void> {
  clearLegacyFirebaseToken();
  const auth = getFirebaseAuth();
  if (!auth) return;
  await signOut(auth);
  clearLegacyFirebaseToken();
}
```

Keep `reloadCurrentUser` refreshing the SDK token without persistence:

```ts
export async function reloadCurrentUser(): Promise<User | null> {
  const auth = getFirebaseAuth();
  const user = auth?.currentUser ?? null;
  if (!user) return null;
  await user.reload();
  await user.getIdToken(true);
  return user;
}
```

In `subscribeAuthState` and `subscribeIdToken`, clear the legacy key once and invoke `callback(user)` directly from the Firebase observer; do not request or persist a second token inside the observer.

- [ ] **Step 5: Run Firebase tests and verify GREEN**

Run:

```bash
npm run test:run -- src/lib/auth/firebase.test.ts
```

Expected: all Firebase tests pass with no `firebase_id_token` value remaining in localStorage.

---

### Task 2: Bootstrap configured auth without a stored-token signal

**Files:**
- Modify: `src/lib/auth/useAuth.logout.test.ts`
- Modify: `src/lib/auth/useAuth.ts`

**Interfaces:**
- Consumes: `clearLegacyFirebaseToken()` and `subscribeIdToken()`.
- Produces: configured cold-load subscription without reading application token storage; unconfigured `getToken()` returns `null`.

- [ ] **Step 1: Add failing cold-load and unconfigured cleanup tests**

Add to `useAuth.logout.test.ts` before the existing logout test:

```tsx
it("subscribes on a configured cold load without a stored token", async () => {
  firebaseMock.setCurrentUser(makeAuthUser(USER_A_UID));

  const { result } = renderHook(() => useAuth());

  await waitFor(() => {
    expect(result.current.user?.uid).toBe(USER_A_UID);
  });
  expect(firebaseMock.subscribeIdToken).toHaveBeenCalledTimes(1);
  expect(localStorage.getItem("firebase_id_token")).toBeNull();
});

it("cleans a legacy token and returns null when Firebase is unconfigured", async () => {
  vi.stubEnv("VITE_FIREBASE_API_KEY", "");
  vi.stubEnv("VITE_FIREBASE_AUTH_DOMAIN", "");
  vi.stubEnv("VITE_FIREBASE_PROJECT_ID", "");
  vi.stubEnv("VITE_FIREBASE_APP_ID", "");
  localStorage.setItem("firebase_id_token", "stale-token");

  const { result } = renderHook(() => useAuth());

  await waitFor(() => {
    expect(result.current.loading).toBe(false);
  });
  await expect(result.current.getToken()).resolves.toBeNull();
  expect(localStorage.getItem("firebase_id_token")).toBeNull();
  expect(firebaseMock.subscribeIdToken).not.toHaveBeenCalled();
});
```

In the existing logout test, after auth bootstrap settles, add:

```tsx
expect(localStorage.getItem("firebase_id_token")).toBeNull();
```

- [ ] **Step 2: Run focused `useAuth` tests and verify RED**

Run:

```bash
npm run test:run -- src/lib/auth/useAuth.logout.test.ts
```

Expected: the cold-load test times out because subscription currently requires a stored token; the unconfigured path returns the stale token.

- [ ] **Step 3: Remove stored-token bootstrap logic from `useAuth.ts`**

Import cleanup:

```ts
import { clearLegacyFirebaseToken } from "./legacyFirebaseToken";
```

Delete `FIREBASE_TOKEN_STORAGE_KEY`, `readStoredFirebaseToken`, and `hasStoredFirebaseToken`.

Initialize configured auth directly:

```ts
export function useAuth(): UseAuthResult {
  const isConfigured = isFirebaseAuthConfiguredFromEnv();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isConfigured);
  const [error, setError] = useState<string | null>(null);
  const [shouldSubscribeAuth, setShouldSubscribeAuth] = useState(isConfigured);

  useEffect(() => {
    clearLegacyFirebaseToken();
  }, []);
```

Keep the existing subscription effect and login/logout state transitions. In `getToken`, use:

```ts
if (!isConfigured) {
  clearLegacyFirebaseToken();
  return null;
}
```

At the start and end of logout cleanup, call `clearLegacyFirebaseToken()` so a legacy value is removed even if Firebase is unconfigured or sign-out rejects.

- [ ] **Step 4: Run focused `useAuth` tests and verify GREEN**

Run:

```bash
npm run test:run -- src/lib/auth/useAuth.logout.test.ts src/lib/auth/useAuth.test.ts
```

Expected: configured cold-load restoration, unconfigured cleanup, account-scoped logout cleanup, auth error mapping, and terms acceptance tests all pass.

- [ ] **Step 5: Verify the protected-request retry contract**

Run:

```bash
npm run test:run -- src/lib/auth/authedFetch.test.ts
```

Expected: the first 401 forces one token refresh, the second 401 dispatches force logout, and timeout behavior remains green.

---

### Task 3: Retire the credential key from storage baselines

**Files:**
- Modify: `src/test/ux-ui-upgrade/storage-keys-scan.ts`
- Modify: `src/test/ux-ui-upgrade/property-9-storage-keys.test.ts`
- Modify: `src/test/ux-ui-upgrade/global-property-11-storage-keys.test.ts`
- Modify: `src/test/ux-ui-upgrade/__snapshots__/storage-keys.baseline.json`

**Interfaces:**
- Consumes: production storage-key scanner output.
- Produces: a product-data storage contract that excludes cleanup-only retired credentials.

- [ ] **Step 1: Add failing retirement assertions**

In both storage property files, remove `firebase_id_token` from the core-key spot-check list and add:

```ts
it("không coi Firebase ID token đã retired là storage contract", () => {
  expect(baseline.has("firebase_id_token")).toBe(false);
  expect(current.has("firebase_id_token")).toBe(false);
});
```

- [ ] **Step 2: Run storage property tests and verify RED**

Run:

```bash
npm run test:run -- src/test/ux-ui-upgrade/property-9-storage-keys.test.ts src/test/ux-ui-upgrade/global-property-11-storage-keys.test.ts
```

Expected: FAIL because the committed baseline and cleanup-only production source still expose `firebase_id_token`.

- [ ] **Step 3: Exclude intentionally retired credentials from the scanner**

Add near the scanner configuration:

```ts
export const INTENTIONALLY_RETIRED_STORAGE_KEYS: ReadonlySet<string> = new Set(["firebase_id_token"]);
```

Before returning from `collectStorageKeys`, remove retired keys:

```ts
for (const retiredKey of INTENTIONALLY_RETIRED_STORAGE_KEYS) {
  all.delete(retiredKey);
}

return all;
```

This keeps the cleanup literal auditable in production source while preventing a credential-removal path from being classified as persistent product data.

- [ ] **Step 4: Update the committed storage snapshot intentionally**

In `storage-keys.baseline.json`, change `keyCount` from `90` to `89` and remove exactly:

```json
"firebase_id_token",
```

- [ ] **Step 5: Run storage property tests and verify GREEN**

Run:

```bash
npm run test:run -- src/test/ux-ui-upgrade/property-9-storage-keys.test.ts src/test/ux-ui-upgrade/global-property-11-storage-keys.test.ts
```

Expected: both baseline equality/superset properties pass and explicitly assert that the retired credential is absent.

---

### Task 4: Security verification and bounded commit

**Files:**
- Verify all files from Tasks 1-3.
- Include: `docs/superpowers/plans/2026-08-06-firebase-token-memory-only.md`.

**Interfaces:**
- Produces: fresh security, type, lint, test, build, and Git-scope evidence.

- [ ] **Step 1: Run the complete focused auth set**

Run:

```bash
npm run test:run -- src/lib/auth/firebase.test.ts src/lib/auth/useAuth.test.ts src/lib/auth/useAuth.logout.test.ts src/lib/auth/authedFetch.test.ts
```

Expected: all focused auth tests pass.

- [ ] **Step 2: Run security-specific source checks**

Run:

```bash
rg -n "firebase_id_token|getStoredFirebaseToken|setStoredFirebaseToken" src
rg -n "localStorage|sessionStorage" src/lib/auth
```

Expected: `firebase_id_token` appears only in the legacy deletion utility, isolated tests, retired-key scanner metadata, and intentional test assertions. No production auth code reads or writes token values; the only production storage operation for this key is `removeItem`.

- [ ] **Step 3: Run frontend gates**

Run:

```bash
npm run typecheck
npm run lint
npm run test:run
npm run build
```

Expected: all commands exit 0. Existing lint information outside this scope may remain, but no error is allowed.

- [ ] **Step 4: Review and stage only bounded files**

Review:

```bash
git diff -- docs/superpowers/plans/2026-08-06-firebase-token-memory-only.md src/lib/auth/legacyFirebaseToken.ts src/lib/auth/firebase.ts src/lib/auth/firebase.test.ts src/lib/auth/useAuth.ts src/lib/auth/useAuth.logout.test.ts src/test/ux-ui-upgrade/storage-keys-scan.ts src/test/ux-ui-upgrade/property-9-storage-keys.test.ts src/test/ux-ui-upgrade/global-property-11-storage-keys.test.ts src/test/ux-ui-upgrade/__snapshots__/storage-keys.baseline.json
```

Stage and commit:

```bash
git add -- docs/superpowers/plans/2026-08-06-firebase-token-memory-only.md src/lib/auth/legacyFirebaseToken.ts src/lib/auth/firebase.ts src/lib/auth/firebase.test.ts src/lib/auth/useAuth.ts src/lib/auth/useAuth.logout.test.ts src/test/ux-ui-upgrade/storage-keys-scan.ts src/test/ux-ui-upgrade/property-9-storage-keys.test.ts src/test/ux-ui-upgrade/global-property-11-storage-keys.test.ts src/test/ux-ui-upgrade/__snapshots__/storage-keys.baseline.json
git commit -m "fix(auth): stop persisting Firebase ID tokens"
```

Expected: the commit contains exactly these ten files and no pre-existing Dashboard, Schedule, ops, `.qoder`, or unrelated untracked changes.

## Plan Self-Review

- Spec coverage: `AUTH-TOKEN-001` through `AUTH-TOKEN-012` map to Tasks 1-4.
- Type consistency: public auth/token method signatures remain unchanged; the only new export is `clearLegacyFirebaseToken(): void`.
- Security boundary: no token read/cache API is introduced; legacy cleanup cannot return the removed value.
- Scope: no backend, cookie-session, Firebase persistence-mode, dependency, UI, import, billing, or sync-flag change is included.
