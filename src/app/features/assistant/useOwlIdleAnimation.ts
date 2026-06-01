import { useEffect, useState } from "react";

const BLINK_DURATION_MS = 150;
const MIN_BLINK_INTERVAL_MS = 3000;
const MAX_BLINK_INTERVAL_MS = 6000;

function randomInterval(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

interface UseOwlIdleAnimationOptions {
  pause?: boolean;
}

export function useOwlIdleAnimation({ pause = false }: UseOwlIdleAnimationOptions = {}) {
  const [blinking, setBlinking] = useState(false);

  useEffect(() => {
    if (pause) {
      setBlinking(false);
      return;
    }

    let timerId: number | null = null;
    let blinkTimeoutId: number | null = null;

    function scheduleBlink() {
      if (pause) return;

      const delay = randomInterval(MIN_BLINK_INTERVAL_MS, MAX_BLINK_INTERVAL_MS);
      timerId = window.setTimeout(() => {
        setBlinking(true);
        blinkTimeoutId = window.setTimeout(() => {
          setBlinking(false);
          timerId = null;
          scheduleBlink();
        }, BLINK_DURATION_MS);
      }, delay);
    }

    scheduleBlink();

    return () => {
      if (timerId !== null) {
        window.clearTimeout(timerId);
      }
      if (blinkTimeoutId !== null) {
        window.clearTimeout(blinkTimeoutId);
      }
    };
  }, [pause]);

  return { blinking };
}
