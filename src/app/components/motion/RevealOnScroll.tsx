import type { ElementType, HTMLAttributes, ReactNode } from "react";

import { useInView } from "@/app/hooks/useInView";
import { useReducedMotion } from "@/app/hooks/useReducedMotion";

interface RevealOnScrollProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  /** Delay before this element animates in (ms). Useful for staggering siblings. */
  delay?: number;
  /** IntersectionObserver threshold. Defaults to 0.15 (15% visible). */
  threshold?: number;
  /** Wrapper element. Defaults to "div". */
  as?: ElementType;
}

/**
 * P2-03 Scroll-Triggered Reveal.
 *
 * Wraps a section so it fades + translates 12px upward when ≥15% of it
 * enters the viewport. Once-only — does not re-trigger on scroll up.
 *
 * Reduced motion: skips animation entirely (renders the final state via
 * the same className guard that motion-reveal uses).
 *
 * Usage on landing sections (NOT hero):
 *
 * <RevealOnScroll as="section" aria-labelledby="...">
 *   ...
 * </RevealOnScroll>
 *
 * For staggered lists, pass delay = index * 80 to each child item.
 */
export function RevealOnScroll({
  children,
  delay = 0,
  threshold = 0.15,
  as: Tag = "div",
  className = "",
  style,
  ...props
}: RevealOnScrollProps) {
  const { ref, inView } = useInView<HTMLElement>({ threshold });
  const reduced = useReducedMotion();

  // Reduced-motion: skip the transition machinery entirely.
  if (reduced) {
    return (
      <Tag ref={ref} className={className} style={style} {...props}>
        {children}
      </Tag>
    );
  }

  const motionClass = inView ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0";

  return (
    <Tag
      ref={ref}
      className={`transition-[opacity,transform] motion-safe:will-change-[opacity,transform] ${motionClass} ${className}`}
      style={{
        transitionDuration: "var(--duration-medium)",
        transitionTimingFunction: "var(--ease-decelerate)",
        transitionDelay: inView ? `${delay}ms` : "0ms",
        ...style,
      }}
      {...props}
    >
      {children}
    </Tag>
  );
}
