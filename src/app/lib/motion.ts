/**
 * P2-01 Motion Design System.
 *
 * Shared duration + easing tokens (in milliseconds and bezier-array form)
 * so framer-motion (motion/react) variants stay in sync with the CSS
 * tokens declared in src/styles/theme.css. Always import from this file
 * instead of hardcoding numbers in component code.
 *
 * Variants below cover the common Phase 2 enter/exit cases:
 *  - fadeUp    : 8px translate + fade (sections, cards, list items)
 *  - fade      : pure opacity (async content, toasts)
 *  - scaleIn   : 4% scale + fade (overlays, dialogs, popovers)
 */

export const duration = {
  instant: 120,
  fast: 180,
  base: 240,
  medium: 360,
  slow: 560,
  slower: 820,
} as const;

export const ease = {
  emphasized: [0.22, 1, 0.36, 1] as const,
  standard: [0.4, 0, 0.2, 1] as const,
  decelerate: [0, 0, 0.2, 1] as const,
  accelerate: [0.4, 0, 1, 1] as const,
  spring: [0.5, 1.6, 0.4, 1] as const,
  overshoot: [0.34, 1.56, 0.64, 1] as const,
} as const;

export const fadeUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: duration.medium / 1000, ease: ease.decelerate },
} as const;

export const fade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: duration.base / 1000, ease: ease.standard },
} as const;

export const scaleIn = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
  transition: { duration: duration.base / 1000, ease: ease.decelerate },
} as const;
