import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

const STORAGE_KEY = "assistant.mascot.position";
const MASCOT_SIZE = 64;
const MIN_GAP = 8;
const DRAG_THRESHOLD = 5;
const LONG_PRESS_MS = 200;

export interface Position {
  x: number;
  y: number;
}

interface DragStartRef {
  pointerX: number;
  pointerY: number;
  posX: number;
  posY: number;
  startTime: number;
}

function getViewportSize() {
  if (typeof window === "undefined") {
    return {
      width: MASCOT_SIZE + MIN_GAP * 2,
      height: MASCOT_SIZE + MIN_GAP * 2,
    };
  }

  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

function constrainPosition(
  pos: Position,
  width = getViewportSize().width,
  height = getViewportSize().height,
): Position {
  const maxX = width - MASCOT_SIZE - MIN_GAP;
  const maxY = height - MASCOT_SIZE - MIN_GAP;

  return {
    x: Math.max(MIN_GAP, Math.min(maxX, pos.x)),
    y: Math.max(MIN_GAP, Math.min(maxY, pos.y)),
  };
}

function getFallbackPosition(): Position {
  const { width, height } = getViewportSize();

  return constrainPosition(
    {
      x: width - MASCOT_SIZE - MIN_GAP,
      y: height - MASCOT_SIZE - MIN_GAP,
    },
    width,
    height,
  );
}

function getInitialPosition(): Position {
  const fallback = getFallbackPosition();

  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return fallback;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw) as Position;
    if (typeof parsed.x === "number" && typeof parsed.y === "number") {
      return constrainPosition(parsed);
    }
  } catch {
    return fallback;
  }

  return fallback;
}

export function useDraggableMascot() {
  const [position, setPosition] = useState<Position>(getInitialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [wasDragged, setWasDragged] = useState(false);

  const dragStartRef = useRef<DragStartRef | null>(null);
  const isDraggingRef = useRef(false);
  const saveTimeoutRef = useRef<number | null>(null);
  const resetWasDraggedTimeoutRef = useRef<number | null>(null);
  const cleanupListenersRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => constrainPosition(prev));
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (isDragging) return;

    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = window.setTimeout(() => {
      if (typeof localStorage !== "undefined") {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
        } catch {
          // Ignore storage errors
        }
      }
    }, 200);

    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [position, isDragging]);

  useEffect(() => {
    return () => {
      cleanupListenersRef.current?.();
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
      if (resetWasDraggedTimeoutRef.current) {
        window.clearTimeout(resetWasDraggedTimeoutRef.current);
      }
    };
  }, []);

  const handlePointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.preventDefault();

    cleanupListenersRef.current?.();
    cleanupListenersRef.current = null;
    isDraggingRef.current = false;
    setIsDragging(false);

    const rect = e.currentTarget.getBoundingClientRect();

    dragStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      posX: rect.left,
      posY: rect.top,
      startTime: Date.now(),
    };

    e.currentTarget.setPointerCapture(e.nativeEvent.pointerId);

    const updatePositionFromPointer = (ev: PointerEvent) => {
      if (!dragStartRef.current) return;

      const { pointerX, pointerY, posX, posY } = dragStartRef.current;
      const dx = ev.clientX - pointerX;
      const dy = ev.clientY - pointerY;
      const distance = Math.hypot(dx, dy);

      if (!isDraggingRef.current && distance > DRAG_THRESHOLD) {
        isDraggingRef.current = true;
        setIsDragging(true);
      }

      if (isDraggingRef.current) {
        setPosition(
          constrainPosition({
            x: posX + dx,
            y: posY + dy,
          }),
        );
      }
    };

    const onPointerMove = (ev: PointerEvent) => {
      updatePositionFromPointer(ev);
    };

    const onPointerUp = (ev: PointerEvent) => {
      if (!dragStartRef.current) return;

      const { pointerX, pointerY, posX, posY, startTime } = dragStartRef.current;
      const dx = ev.clientX - pointerX;
      const dy = ev.clientY - pointerY;
      const distance = Math.hypot(dx, dy);
      const duration = Date.now() - startTime;
      const actuallyDragged = distance > DRAG_THRESHOLD || duration > LONG_PRESS_MS;

      setWasDragged(actuallyDragged);
      if (actuallyDragged) {
        setPosition(
          constrainPosition({
            x: posX + dx,
            y: posY + dy,
          }),
        );
      }

      dragStartRef.current = null;
      isDraggingRef.current = false;
      setIsDragging(false);

      if (resetWasDraggedTimeoutRef.current) {
        window.clearTimeout(resetWasDraggedTimeoutRef.current);
      }
      resetWasDraggedTimeoutRef.current = window.setTimeout(() => {
        setWasDragged(false);
      }, 50);

      cleanupListenersRef.current?.();
      cleanupListenersRef.current = null;
    };

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("pointercancel", onPointerUp);

    cleanupListenersRef.current = () => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("pointercancel", onPointerUp);
    };
  };

  return {
    position,
    isDragging,
    handlePointerDown,
    wasDragged,
  };
}
