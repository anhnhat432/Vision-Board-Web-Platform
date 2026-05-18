import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

const STORAGE_KEY = "assistant.mascot.position";
const MASCOT_SIZE = 64;
const MIN_GAP = 8;
const DRAG_THRESHOLD = 5;
const LONG_PRESS_MS = 200;

interface Position {
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

export function useDraggableMascot() {
  const [position, setPosition] = useState<Position>(() => {
    const fallback = {
      x: typeof window !== "undefined" ? window.innerWidth - MASCOT_SIZE - MIN_GAP : MIN_GAP,
      y: typeof window !== "undefined" ? window.innerHeight - MASCOT_SIZE - MIN_GAP : MIN_GAP,
    };

    if (typeof window === "undefined" || typeof localStorage === "undefined") {
      return fallback;
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return fallback;

      const parsed = JSON.parse(raw) as Position;
      if (typeof parsed.x === "number" && typeof parsed.y === "number") {
        return parsed;
      }
    } catch {
      // Ignore parse errors
    }

    return fallback;
  });

  const [isDragging, setIsDragging] = useState(false);
  const [wasDragged, setWasDragged] = useState(false);

  const dragStartRef = useRef<DragStartRef | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);

  const constrainPosition = useMemo(() => {
    return (pos: Position, width: number, height: number): Position => {
      const maxX = width - MASCOT_SIZE - MIN_GAP;
      const maxY = height - MASCOT_SIZE - MIN_GAP;

      return {
        x: Math.max(MIN_GAP, Math.min(maxX, pos.x)),
        y: Math.max(MIN_GAP, Math.min(maxY, pos.y)),
      };
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        const constrained = constrainPosition(prev, window.innerWidth, window.innerHeight);
        return constrained;
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [constrainPosition]);

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

  const handlePointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.preventDefault();

    const rect = e.currentTarget.getBoundingClientRect();
    const initialPos = {
      x: rect.left,
      y: rect.top,
    };

    dragStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      posX: initialPos.x,
      posY: initialPos.y,
      startTime: Date.now(),
    };

    e.currentTarget.setPointerCapture(e.nativeEvent.pointerId);

    const onPointerMove = (ev: PointerEvent) => {
      if (!dragStartRef.current) return;

      const { pointerX, pointerY, posX, posY } = dragStartRef.current;
      const dx = ev.clientX - pointerX;
      const dy = ev.clientY - pointerY;
      const distance = Math.hypot(dx, dy);

      if (!isDragging && distance > DRAG_THRESHOLD) {
        setIsDragging(true);
      }

      if (isDragging) {
        const newPos = {
          x: posX + dx,
          y: posY + dy,
        };
        setPosition(newPos);
      }
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
        const newPos = {
          x: posX + dx,
          y: posY + dy,
        };
        setPosition(newPos);
      }

      dragStartRef.current = null;
      setIsDragging(false);

      window.setTimeout(() => {
        setWasDragged(false);
      }, 50);

      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("pointercancel", onPointerUp);
    };

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("pointercancel", onPointerUp);
  };

  return {
    position,
    isDragging,
    handlePointerDown,
    wasDragged,
  };
}