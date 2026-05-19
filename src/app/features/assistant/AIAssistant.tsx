import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";
import { AssistantMascot } from "./AssistantMascot";
import { AssistantPanel } from "./AssistantPanel";
import { useProactiveNudge } from "./useProactiveNudge";

export function AIAssistant() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const { nudge, dismissNudge } = useProactiveNudge(isOpen);
  const previousOpenRef = useRef(false);

  useEffect(() => {
    if (!previousOpenRef.current && isOpen) {
      dismissNudge();
    }

    previousOpenRef.current = isOpen;
  }, [dismissNudge, isOpen]);

  return (
    <>
      <AssistantMascot
        onClick={() => setIsOpen(true)}
        isOpen={isOpen}
        nudge={nudge}
        dismissNudge={dismissNudge}
      />
      <AssistantPanel open={isOpen} onClose={() => setIsOpen(false)} route={location.pathname} />
    </>
  );
}
