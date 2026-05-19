import type { SVGProps } from "react";

export interface OwlIconProps extends SVGProps<SVGSVGElement> {
  size?: number;
  blinking?: boolean;
}

/**
 * Calm owl mascot for the AI assistant. Outline style so it reads cleanly
 * on the forest-green badge background instead of looking like a
 * white-on-white smudge with two pinpoint dots.
 *
 * The owl is intentionally minimal: rounded body, two clear eye discs
 * with solid pupils inside, a small warm-tone beak (via .owl-beak), and
 * tucked ear tufts. All colors come through CSS currentColor so dark
 * mode and reduced contrast just work.
 *
 * `blinking` is forwarded as an `is-blinking` class on the eyes group so
 * the idle blink animation (useOwlIdleAnimation) can squash the eyes.
 */
export function OwlIcon({ size = 24, className, blinking = false, ...props }: OwlIconProps) {
  const stroke = 1.6;
  const eyeClass = blinking ? "owl-eyes is-blinking" : "owl-eyes";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-hidden="true"
      className={className}
      {...props}
    >
      {/* Ear tufts (behind body) */}
      <path
        d="M9.5 7.5 C 9 5.5, 10.5 4, 12 5"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M22.5 7.5 C 23 5.5, 21.5 4, 20 5"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        fill="none"
      />

      {/* Body */}
      <path
        d="M16 7 C 22 7, 25 11, 25 17 C 25 23, 21 26, 16 26 C 11 26, 7 23, 7 17 C 7 11, 10 7, 16 7 Z"
        stroke="currentColor"
        strokeWidth={stroke}
        fill="none"
      />

      {/* Eyes — outer disc + solid pupil, grouped so .owl-eyes.is-blinking
          can squash them via transform. */}
      <g className={eyeClass}>
        <g transform="translate(12.5, 15)">
          <circle r="3" stroke="currentColor" strokeWidth={stroke} fill="none" />
          <circle r="1.1" fill="currentColor" />
        </g>
        <g transform="translate(19.5, 15)">
          <circle r="3" stroke="currentColor" strokeWidth={stroke} fill="none" />
          <circle r="1.1" fill="currentColor" />
        </g>
      </g>

      {/* Beak — warm tone via .owl-beak class (forwarded from parent) */}
      <path
        d="M16 18 L 14.5 20.5 L 17.5 20.5 Z"
        fill="currentColor"
        className="owl-beak"
        opacity="0.85"
      />

      {/* Wing hint */}
      <path
        d="M11 19 Q 13 22, 16 21"
        stroke="currentColor"
        strokeWidth={stroke * 0.85}
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />
    </svg>
  );
}
