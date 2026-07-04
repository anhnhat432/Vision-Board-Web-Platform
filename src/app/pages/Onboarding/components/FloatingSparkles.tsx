import { motion, useReducedMotion } from "motion/react";
import { useMemo } from "react";
import { useIsMobile } from "../../../components/ui/use-mobile";

interface Sparkle {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
  color: string;
}

export function FloatingSparkles() {
  const reduceMotion = useReducedMotion();
  const isMobile = useIsMobile();

  const sparkles = useMemo<Sparkle[]>(() => {
    const colors = [
      "rgba(12, 94, 58, 0.18)",
      "rgba(168, 82, 47, 0.16)",
      "rgba(231, 164, 0, 0.14)",
      "rgba(91, 165, 144, 0.16)",
    ];

    const count = isMobile ? 12 : 24;
    return Array.from({ length: count }, (_, index) => ({
      id: index,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 6 + 2,
      delay: Math.random() * 4,
      duration: Math.random() * 4 + 4,
      color: colors[index % colors.length] ?? colors[0],
    }));
  }, [isMobile]);

  if (reduceMotion) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      {sparkles.map((sparkle) => (
        <motion.div
          key={sparkle.id}
          className="absolute rounded-full"
          style={{
            left: `${sparkle.x}%`,
            top: `${sparkle.y}%`,
            width: sparkle.size,
            height: sparkle.size,
            backgroundColor: sparkle.color,
            boxShadow: `0 0 ${sparkle.size * 2}px ${sparkle.size}px ${sparkle.color}`,
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 0.8, 0],
            scale: [0, 1, 0.5],
            y: [0, -20, -40],
          }}
          transition={{
            duration: sparkle.duration,
            delay: sparkle.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
