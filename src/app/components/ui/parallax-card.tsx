import { useRef } from "react";
import { useThreeDParallax } from "../../hooks/use3dParallax";
import { cn } from "./utils";
import { useReducedMotion } from "./use-reduced-motion";

interface ParallaxCardProps extends React.ComponentPropsWithoutRef<"div"> {
  children: React.ReactNode;
  maxTilt?: number;
}

export function ParallaxCard({ children, className, maxTilt = 6, ...props }: ParallaxCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { style, shineX, shineY, isHovered } = useThreeDParallax(cardRef, maxTilt);
  const isReduced = useReducedMotion();

  return (
    <div
      ref={cardRef}
      style={style}
      className={cn(
        "relative overflow-hidden transition-all duration-300 will-change-transform select-none",
        className
      )}
      {...props}
    >
      {/* Specular Light Dynamic Shine Effect */}
      {!isReduced && isHovered && (
        <div
          className="pointer-events-none absolute inset-0 z-20 mix-blend-overlay opacity-20 transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle 240px at ${shineX}% ${shineY}%, rgba(255, 255, 255, 0.2), transparent 75%)`,
          }}
        />
      )}
      <div className="relative z-10 h-full w-full">{children}</div>
    </div>
  );
}
export default ParallaxCard;
