import { useEffect, useState } from "react";

import { getPlanLink } from "@/features/plan12week/persistence/planLinkStore";

export function useDashboardPlanLink(goalId: string | null | undefined): string | null {
  const [planId, setPlanId] = useState<string | null>(null);

  useEffect(() => {
    if (!goalId) {
      setPlanId(null);
      return;
    }

    const resolvePlanId = () => {
      setPlanId(getPlanLink(goalId)?.planId ?? null);
    };

    resolvePlanId();

    if (typeof window === "undefined") {
      return;
    }

    const handleStorage = () => {
      resolvePlanId();
    };
    const handleFocus = () => {
      resolvePlanId();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleFocus);
    };
  }, [goalId]);

  return planId;
}
