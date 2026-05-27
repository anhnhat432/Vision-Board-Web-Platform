import { useCallback, useEffect, useRef, useState } from "react";

import { getUserData, USER_DATA_STORAGE_KEY, USER_DATA_UPDATED_EVENT_NAME, type UserData } from "../utils/storage";

// Coalesce bursts of storage events (same-tab saves, cross-tab broadcasts, focus + visibility
// changes that fire together when switching back to the app) so listeners parse + normalize
// localStorage at most once per window. 50ms is short enough to feel instant but long enough
// to absorb the typical event burst.
const RELOAD_DEBOUNCE_MS = 50;

function isUserDataStorageEventKey(key: string | null): boolean {
  return key === null || key === USER_DATA_STORAGE_KEY || key.startsWith(`${USER_DATA_STORAGE_KEY}:auth:`);
}

export function useSyncedUserData(): {
  userData: UserData | null;
  reloadUserData: () => void;
} {
  const [userData, setUserData] = useState<UserData | null>(() =>
    typeof window === "undefined" ? null : getUserData(),
  );

  const reloadUserDataImmediate = useCallback(() => {
    setUserData(getUserData());
  }, []);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reloadUserData = useCallback(() => {
    if (typeof window === "undefined") {
      reloadUserDataImmediate();
      return;
    }

    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      reloadUserDataImmediate();
    }, RELOAD_DEBOUNCE_MS);
  }, [reloadUserDataImmediate]);

  useEffect(() => {
    reloadUserDataImmediate();

    const handleStorage = (event: StorageEvent) => {
      if (isUserDataStorageEventKey(event.key)) {
        reloadUserData();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        reloadUserData();
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", reloadUserData);
    window.addEventListener(USER_DATA_UPDATED_EVENT_NAME, reloadUserData);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", reloadUserData);
      window.removeEventListener(USER_DATA_UPDATED_EVENT_NAME, reloadUserData);
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [reloadUserData, reloadUserDataImmediate]);

  return { userData, reloadUserData };
}
