import type { CSSProperties, ReactElement } from "react";
import type { VisionBoardStickerId } from "@/app/utils/storage-types";

/**
 * Inline SVG stickers for the vision board. All decorative elements are defined
 * as pure SVG paths — no external images required.
 */

const stickers: Record<VisionBoardStickerId, ReactElement> = {
  "flower-pink": (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      {[0, 72, 144, 216, 288].map((angle) => (
        <ellipse
          key={`flower-pink-${angle}`}
          cx="40"
          cy="40"
          rx="10"
          ry="20"
          fill="#f9a8d4"
          transform={`rotate(${angle} 40 40) translate(0 -12)`}
        />
      ))}
      <circle cx="40" cy="40" r="8" fill="#fbbf24" />
      <circle cx="40" cy="40" r="4" fill="#f59e0b" opacity="0.6" />
    </svg>
  ),
  "flower-white": (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      {[0, 60, 120, 180, 240, 300].map((angle) => (
        <ellipse
          key={`flower-white-${angle}`}
          cx="40"
          cy="40"
          rx="9"
          ry="17"
          fill="white"
          stroke="#e5e7eb"
          strokeWidth="0.5"
          transform={`rotate(${angle} 40 40) translate(0 -11)`}
        />
      ))}
      <circle cx="40" cy="40" r="7" fill="#fcd34d" opacity="0.8" />
    </svg>
  ),
  "leaf-green": (
    <svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <path
        d="M36 8C36 8 56 20 56 40C56 52 48 60 36 60C24 60 16 52 16 40C16 20 36 8 36 8Z"
        fill="#86efac"
        opacity="0.8"
      />
      <path d="M36 16V56" stroke="#22c55e" strokeWidth="1.5" opacity="0.6" />
      <path d="M36 28C42 24 48 28 48 34" stroke="#22c55e" strokeWidth="1" opacity="0.4" fill="none" />
      <path d="M36 38C30 34 22 38 22 44" stroke="#22c55e" strokeWidth="1" opacity="0.4" fill="none" />
    </svg>
  ),
  "leaf-gold": (
    <svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <path
        d="M36 8C36 8 56 20 56 40C56 52 48 60 36 60C24 60 16 52 16 40C16 20 36 8 36 8Z"
        fill="#fcd34d"
        opacity="0.85"
      />
      <path d="M36 16V56" stroke="#d97706" strokeWidth="1.5" opacity="0.5" />
      <path d="M36 28C42 24 48 28 48 34" stroke="#d97706" strokeWidth="1" opacity="0.3" fill="none" />
      <path d="M36 38C30 34 22 38 22 44" stroke="#d97706" strokeWidth="1" opacity="0.3" fill="none" />
    </svg>
  ),
  "star-gold": (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <path
        d="M32 6L39.5 24.5L58 28L44 41L48 60L32 50L16 60L20 41L6 28L24.5 24.5L32 6Z"
        fill="#fbbf24"
        stroke="#f59e0b"
        strokeWidth="1"
        opacity="0.9"
      />
      <path d="M32 14L36.5 26L48 28L39 36L42 48L32 42L22 48L25 36L16 28L27.5 26L32 14Z" fill="#f59e0b" opacity="0.4" />
    </svg>
  ),
  "star-silver": (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <path
        d="M32 6L39.5 24.5L58 28L44 41L48 60L32 50L16 60L20 41L6 28L24.5 24.5L32 6Z"
        fill="#e2e8f0"
        stroke="#cbd5e1"
        strokeWidth="1"
        opacity="0.9"
      />
      <path d="M32 14L36.5 26L48 28L39 36L42 48L32 42L22 48L25 36L16 28L27.5 26L32 14Z" fill="#94a3b8" opacity="0.3" />
    </svg>
  ),
  "heart-pink": (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <path
        d="M32 56C32 56 6 40 6 22C6 12 14 6 22 6C27 6 31 9 32 12C33 9 37 6 42 6C50 6 58 12 58 22C58 40 32 56 32 56Z"
        fill="#f9a8d4"
        opacity="0.85"
      />
      <path
        d="M32 56C32 56 12 42 12 26C12 18 18 12 24 12C28 12 31 14 32 17C33 14 36 12 40 12C46 12 52 18 52 26C52 42 32 56 32 56Z"
        fill="#ec4899"
        opacity="0.3"
      />
    </svg>
  ),
  "heart-red": (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <path
        d="M32 56C32 56 6 40 6 22C6 12 14 6 22 6C27 6 31 9 32 12C33 9 37 6 42 6C50 6 58 12 58 22C58 40 32 56 32 56Z"
        fill="#fca5a5"
        opacity="0.85"
      />
      <path
        d="M32 56C32 56 12 42 12 26C12 18 18 12 24 12C28 12 31 14 32 17C33 14 36 12 40 12C46 12 52 18 52 26C52 42 32 56 32 56Z"
        fill="#ef4444"
        opacity="0.3"
      />
    </svg>
  ),
  "ribbon-pink": (
    <svg viewBox="0 0 100 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <path
        d="M2 12C2 12 20 4 50 8C80 12 98 4 98 4V20C98 20 80 28 50 24C20 20 2 28 2 28V12Z"
        fill="#f9a8d4"
        opacity="0.8"
      />
      <path d="M2 12C2 12 20 4 50 8C80 12 98 4 98 4" stroke="#ec4899" strokeWidth="1" opacity="0.5" fill="none" />
      <path d="M2 28C2 28 20 20 50 24C80 28 98 20 98 20" stroke="#ec4899" strokeWidth="1" opacity="0.5" fill="none" />
      <path d="M44 16L50 8L56 16L50 24Z" fill="#f472b6" opacity="0.5" />
    </svg>
  ),
  confetti: (
    <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      {[
        { x: 10, y: 8, w: 6, h: 3, fill: "#f9a8d4", r: 25 },
        { x: 25, y: 14, w: 5, h: 2.5, fill: "#fbbf24", r: -35 },
        { x: 45, y: 6, w: 7, h: 3, fill: "#86efac", r: 15 },
        { x: 65, y: 12, w: 5, h: 2.5, fill: "#93c5fd", r: -20 },
        { x: 85, y: 8, w: 6, h: 3, fill: "#c4b5fd", r: 40 },
        { x: 100, y: 14, w: 5, h: 2.5, fill: "#fca5a5", r: -10 },
        { x: 15, y: 40, w: 5, h: 2.5, fill: "#fcd34d", r: -30 },
        { x: 35, y: 48, w: 6, h: 3, fill: "#a78bfa", r: 20 },
        { x: 55, y: 42, w: 5, h: 2.5, fill: "#fb923c", r: -45 },
        { x: 75, y: 36, w: 7, h: 3, fill: "#f9a8d4", r: 35 },
        { x: 95, y: 44, w: 5, h: 2.5, fill: "#34d399", r: -15 },
        { x: 50, y: 60, w: 6, h: 3, fill: "#fbbf24", r: 50 },
        { x: 70, y: 56, w: 5, h: 2.5, fill: "#f87171", r: -25 },
      ].map((c) => (
        <rect
          key={`${c.x}-${c.y}-${c.fill}`}
          x={c.x}
          y={c.y}
          width={c.w}
          height={c.h}
          rx="1.25"
          fill={c.fill}
          opacity="0.75"
          transform={`rotate(${c.r} ${c.x + c.w / 2} ${c.y + c.h / 2})`}
        />
      ))}
    </svg>
  ),
};

interface StickerSVGProps {
  id: VisionBoardStickerId;
  className?: string;
  style?: CSSProperties;
}

export function StickerSVG({ id, className = "", style }: StickerSVGProps) {
  const svg = stickers[id];
  if (!svg) return null;

  return (
    <span className={`pointer-events-none inline-block ${className}`} style={style} aria-hidden="true">
      {svg}
    </span>
  );
}
