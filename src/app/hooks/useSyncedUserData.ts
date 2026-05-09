import { useCallback, useEffect, useState } from "react";

import { getUserData, USER_DATA_STORAGE_KEY, USER_DATA_UPDATED_EVENT_NAME, type UserData } from "../utils/storage";

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

  const reloadUserData = useCallback(() => {
    setUserData(getUserData());
  }, []);

  useEffect(() => {
    reloadUserData();

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
    window.addEventListener(USER_DATA_UPDATED_EVENT_NAME, reloadUserData);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(USER_DATA_UPDATED_EVENT_NAME, reloadUserData);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [reloadUserData]);

  return { userData, reloadUserData };
}
