import { createContext, type Dispatch, type SetStateAction, useContext, useEffect, useMemo, useState } from "react";

export interface AssistantPageContextValue {
  pageType: string;
  currentStep?: string;
  hint?: string;
}

interface AssistantPageContextState {
  value: AssistantPageContextValue | null;
  setValue: Dispatch<SetStateAction<AssistantPageContextValue | null>>;
}

const AssistantPageContext = createContext<AssistantPageContextState | null>(null);

function areAssistantPageContextsEqual(
  a: AssistantPageContextValue | null,
  b: AssistantPageContextValue | null,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;

  return (
    a.pageType === b.pageType &&
    (a.currentStep ?? null) === (b.currentStep ?? null) &&
    (a.hint ?? null) === (b.hint ?? null)
  );
}

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
  const setValue = context?.setValue;
  const pageType = ctx?.pageType ?? null;
  const currentStep = ctx?.currentStep ?? null;
  const hint = ctx?.hint ?? null;

  useEffect(() => {
    if (!setValue) {
      return;
    }

    const nextValue =
      pageType === null
        ? null
        : {
            pageType,
            ...(currentStep !== null ? { currentStep } : {}),
            ...(hint !== null ? { hint } : {}),
          };

    setValue((current) => (areAssistantPageContextsEqual(current, nextValue) ? current : nextValue));

    return () => {
      setValue((current) => (areAssistantPageContextsEqual(current, nextValue) ? null : current));
    };
  }, [currentStep, hint, pageType, setValue]);
}
