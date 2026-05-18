import { createContext, useContext, useMemo, type ReactNode } from "react";

import { useAutoCloudSync, type AutoCloudSyncState } from "./useAutoCloudSync";

export const AutoCloudSyncContext = createContext<AutoCloudSyncState | null>(null);

interface AutoCloudSyncProviderProps {
  children: ReactNode;
}

export function AutoCloudSyncProvider({ children }: AutoCloudSyncProviderProps) {
  const autoCloudSyncState = useAutoCloudSync();
  const value = useMemo(() => autoCloudSyncState, [autoCloudSyncState]);

  return <AutoCloudSyncContext.Provider value={value}>{children}</AutoCloudSyncContext.Provider>;
}

export function useOptionalAutoCloudSyncContext(): AutoCloudSyncState | null {
  return useContext(AutoCloudSyncContext);
}

export function useAutoCloudSyncContext(): AutoCloudSyncState {
  const context = useOptionalAutoCloudSyncContext();

  if (!context) {
    throw new Error("useAutoCloudSyncContext must be used inside AutoCloudSyncProvider");
  }

  return context;
}
