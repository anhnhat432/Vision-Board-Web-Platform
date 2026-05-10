import { createContext } from "react";

import type { AutoCloudSyncState } from "@/features/plan12week/hooks/useAutoCloudSync";

export const AutoCloudSyncContext = createContext<AutoCloudSyncState | null>(null);
