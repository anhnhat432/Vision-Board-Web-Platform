import { createContext, useContext, useEffect, useMemo, useState } from "react";

export interface AssistantPageContextValue {
  pageType: string;
  currentStep?: string;
  hint?: string;
}

interface AssistantPageContextState {
  value: AssistantPageContextValue | null;
  setValue: (v: AssistantPageContextValue | null) => void;
}

const AssistantPageContext = createContext<AssistantPageContextState | null>(null);

export function AssistantPageContextProvider({ children }: { children: React.ReactNode }) {
  const [value, setValue] = useState<AssistantPageContextValue | null>(null);

  const state = useMemo<AssistantPageContextState>(
    () => ({
      value,
      setValue,
    }),
    [value],
  );

  return <AssistantPageContext.Provider value={state}>{children}</AssistantPageContext.Provider>;
}

export function useAssistantPageContextValue(): AssistantPageContextValue | null {
  const context = useContext(AssistantPageContext);
  if (!context) {
    return null;
  }
  return context.value;
}

export function useSetAssistantPageContext(ctx: AssistantPageContextValue | null): void {
  const context = useContext(AssistantPageContext);

  useEffect(() => {
    if (!context) {
      return;
    }
    const { setValue } = context;
    setValue(ctx);
    return () => {
      setValue(null);
    };
  }, [context, ctx]);
}
