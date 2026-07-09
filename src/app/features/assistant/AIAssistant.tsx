import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";
import { loadWithChunkReload } from "@/app/utils/chunkLoad";
import { AssistantMascot } from "./AssistantMascot";
import { MascotBubble } from "./MascotBubble";
import { useBubblePeek } from "./useBubblePeek";
import { useDraggableMascot } from "./useDraggableMascot";
import { useProactiveNudge } from "./useProactiveNudge";

const AssistantPanel = lazy(() =>
  loadWithChunkReload(async () => ({
    default: (await import("./AssistantPanel")).AssistantPanel,
  })),
);

export function AIAssistant() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [hasOpenedPanel, setHasOpenedPanel] = useState(false);
  const { position, isDragging, handlePointerDown, wasDragged } = useDraggableMascot();
  const { nudge, dismissNudge, actOnNudge } = useProactiveNudge(isOpen);
  const { peek, resetPeekCount, dismissPeek, pauseAutoHide, resumeAutoHide } = useBubblePeek({
    pause: isOpen || isDragging || nudge.active,
  });
  const previousOpenRef = useRef(false);

  useEffect(() => {
    if (!previousOpenRef.current && isOpen) {
      setHasOpenedPanel(true);
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
        onNudgeAction={actOnNudge}
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
      {hasOpenedPanel ? (
        <Suspense fallback={null}>
          <AssistantPanel open={isOpen} onClose={() => setIsOpen(false)} route={location.pathname} />
        </Suspense>
      ) : null}
    </>
  );
}
