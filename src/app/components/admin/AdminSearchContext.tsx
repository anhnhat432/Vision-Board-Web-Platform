import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

/**
 * Topbar search slot.
 *
 * Pages own the actual search state. They publish `{ value, placeholder, onChange }`
 * to this context via `useAdminSearch`. The topbar renders an input bound to
 * whichever handler is currently registered. When no page is registered, the
 * topbar omits the search control.
 */
export interface AdminSearchHandler {
  value: string;
  placeholder: string;
  onChange: (next: string) => void;
}

interface AdminSearchContextValue {
  handler: AdminSearchHandler | null;
  registerSearch: (next: AdminSearchHandler | null) => void;
}

const AdminSearchContext = createContext<AdminSearchContextValue | null>(null);

export function AdminSearchProvider({ children }: { children: ReactNode }) {
  const [handler, setHandler] = useState<AdminSearchHandler | null>(null);

  const registerSearch = useCallback((next: AdminSearchHandler | null) => {
    setHandler(next);
  }, []);

  const value = useMemo(() => ({ handler, registerSearch }), [handler, registerSearch]);

  return <AdminSearchContext.Provider value={value}>{children}</AdminSearchContext.Provider>;
}

export function useAdminSearchSlot(): AdminSearchContextValue {
  return useContext(AdminSearchContext) ?? { handler: null, registerSearch: () => {} };
}

/**
 * Page hook: bind the topbar search input to the page's local query state.
 * Set `enabled` to false to opt out; the topbar omits the search control.
 */
export function useAdminSearch(
  value: string,
  onChange: (next: string) => void,
  placeholder = "Tìm kiếm…",
  enabled = true,
) {
  const { registerSearch } = useAdminSearchSlot();

  useEffect(() => {
    if (!enabled) {
      registerSearch(null);
      return;
    }
    registerSearch({ value, placeholder, onChange });
    return () => {
      registerSearch(null);
    };
  }, [enabled, value, placeholder, onChange, registerSearch]);
}
