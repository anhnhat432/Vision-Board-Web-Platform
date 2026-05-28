import { useState, useEffect, type RefObject } from "react";
import { useReducedMotion } from "../components/ui/use-reduced-motion";

interface ParallaxCoords {
  rotateX: number;
  rotateY: number;
  shineX: number;
  shineY: number;
}

export function useThreeDParallax(ref: RefObject<HTMLElement | null>, maxTilt = 6) {
  const isReduced = useReducedMotion();
  const [coords, setCoords] = useState<ParallaxCoords>({
    rotateX: 0,
    rotateY: 0,
    shineX: 50,
    shineY: 50,
  });
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || isReduced) return;

    let frameId: number;

    const handleMouseMove = (e: globalThis.MouseEvent) => {
      cancelAnimationFrame(frameId);

      frameId = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        
        // Mouse coordinate relative to the element
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Normalise coordinate between -0.5 and 0.5
        const normX = x / rect.width - 0.5;
        const normY = y / rect.height - 0.5;

        // Calculate tilt rotation
        // rotateX depends on Y mouse offset (move up tilts forward/rotateX negative, move down tilts back/rotateX positive)
        // rotateY depends on X mouse offset (move right tilts right/rotateY positive)
        const rotateX = -(normY * maxTilt);
        const rotateY = normX * maxTilt;

        // Calculate shine position percentages
        const shineX = (x / rect.width) * 100;
        const shineY = (y / rect.height) * 100;

        setCoords({ rotateX, rotateY, shineX, shineY });
      });
    };

    const handleMouseEnter = () => {
      setIsHovered(true);
    };

    const handleMouseLeave = () => {
      cancelAnimationFrame(frameId);
      setIsHovered(false);
      setCoords({ rotateX: 0, rotateY: 0, shineX: 50, shineY: 50 });
    };

    el.addEventListener("mousemove", handleMouseMove);
    el.addEventListener("mouseenter", handleMouseEnter);
    el.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      cancelAnimationFrame(frameId);
      el.removeEventListener("mousemove", handleMouseMove);
      el.removeEventListener("mouseenter", handleMouseEnter);
      el.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [ref, maxTilt, isReduced]);

  const style = isReduced || !isHovered
    ? {
        transform: "perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)",
        transition: "transform 0.4s ease-out",
      }
    : {
        transform: `perspective(1000px) rotateX(${coords.rotateX.toFixed(2)}deg) rotateY(${coords.rotateY.toFixed(2)}deg) scale(1.025)`,
        transition: "transform 0.1s ease-out",
      };

  return { style, shineX: coords.shineX, shineY: coords.shineY, isHovered };
}
