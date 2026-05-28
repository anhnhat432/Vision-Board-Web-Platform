import { useRef, useState, type MouseEvent } from "react";
import { useReducedMotion } from "./use-reduced-motion";
import { cn } from "./utils";

interface SpotlightCardProps extends React.ComponentPropsWithoutRef<"div"> {
  children: React.ReactNode;
}

export function SpotlightCard({ children, className, ...props }: SpotlightCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [isFocused, setIsFocused] = useState(false);
  const reduced = useReducedMotion();

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (reduced || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setCoords({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Spotlight hover is purely visual presentation
    <div
      ref={cardRef}
      className={cn(
        "relative overflow-hidden rounded-card border border-app-line bg-app-surface transition-shadow duration-300 hover:shadow-2",
        className
      )}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsFocused(true)}
      onMouseLeave={() => setIsFocused(false)}
      {...props}
    >
      {!reduced && isFocused && (
        <div
          className="pointer-events-none absolute -inset-px rounded-card opacity-0 transition-opacity duration-300"
          style={{
            opacity: 0.12,
            background: `radial-gradient(350px circle at ${coords.x}px ${coords.y}px, var(--app-accent), transparent 80%)`,
          }}
        />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
