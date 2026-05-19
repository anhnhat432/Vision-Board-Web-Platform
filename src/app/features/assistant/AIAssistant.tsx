import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";
import { AssistantMascot } from "./AssistantMascot";
import { AssistantPanel } from "./AssistantPanel";
import { MascotBubble } from "./MascotBubble";
import { useBubblePeek } from "./useBubblePeek";
import { useDraggableMascot } from "./useDraggableMascot";
import { useProactiveNudge } from "./useProactiveNudge";

export function AIAssistant() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const { position, isDragging, handlePointerDown, wasDragged } = useDraggableMascot();
  const { nudge, dismissNudge } = useProactiveNudge(isOpen);
  const { peek, resetPeekCount, dismissPeek, pauseAutoHide, resumeAutoHide } = useBubblePeek({
    pause: isOpen || isDragging || nudge.active,
  });
  const previousOpenRef = useRef(false);

  useEffect(() => {
    if (!previousOpenRef.current && isOpen) {
      dismissNudge();
      resetPeekCount();
    }

    previousOpenRef.current = isOpen;
  }, [dismissNudge, isOpen, resetPeekCount]);

  return (
    <>
      <AssistantMascot
        onClick={() => setIsOpen(true)}
        isOpen={isOpen}
        nudge={nudge}
        dismissNudge={dismissNudge}
        position={position}
        isDragging={isDragging}
        handlePointerDown={handlePointerDown}
        wasDragged={wasDragged}
      />
      <MascotBubble
        text={peek.text}
        active={peek.active}
        mascotPosition={position}
        onDismiss={dismissPeek}
        onHoverStart={pauseAutoHide}
        onHoverEnd={resumeAutoHide}
      />
      <AssistantPanel open={isOpen} onClose={() => setIsOpen(false)} route={location.pathname} />
    </>
  );
}
