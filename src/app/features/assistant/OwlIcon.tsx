import type { SVGProps } from "react";

export interface OwlIconProps extends SVGProps<SVGSVGElement> {
  size?: number;
  blinking?: boolean;
}

/**
 * Cute filled owl mascot for the AI assistant.
 *
 * Switched from a thin outline (which read as a generic circle at 28px)
 * to a chunky filled silhouette that actually looks like an owl:
 *   - Cream/white body with rounded belly so the silhouette is unmistakable
 *   - Two big round eyes with solid dark pupils (high contrast on body)
 *   - Warm-tone triangular beak between the eyes
 *   - Two ear tufts at the top
 *   - A wing curve on the side
 *
 * The eye color overrides via `.owl-eye-disc` / `.owl-pupil` / `.owl-beak`
 * / `.owl-belly` classes so the parent can tweak palette without forking
 * this component.
 *
 * `blinking=true` toggles `is-blinking` on each `<g class="owl-eyes">` so
 * the existing `owl-blink` keyframes (scaleY 1 → 0.1) squash each eye
 * around its own center.
 */
export function OwlIcon({ size = 24, className, blinking = false, ...props }: OwlIconProps) {
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
      {/* Ear tufts (drawn first so body overlaps the base of them) */}
      <path d="M9.5 9 C 9 6, 10.5 4.5, 12.5 6.5 L 11.5 9.5 Z" fill="currentColor" className="owl-body" />
      <path d="M22.5 9 C 23 6, 21.5 4.5, 19.5 6.5 L 20.5 9.5 Z" fill="currentColor" className="owl-body" />

      {/* Body — chubby rounded silhouette */}
      <path
        d="M16 8
           C 21.5 8, 25 11.5, 25 17
           C 25 22.5, 21 26, 16 26
           C 11 26, 7 22.5, 7 17
           C 7 11.5, 10.5 8, 16 8 Z"
        fill="currentColor"
        className="owl-body"
      />

      {/* Belly highlight — a softer oval inside the body for depth */}
      <ellipse cx="16" cy="20" rx="5.5" ry="5" fill="currentColor" className="owl-belly" opacity="0.45" />

      {/* Eyes — each eye is its own .owl-eyes group with its own translate
          so the blink scaleY animation squashes around the eye's own center. */}
      <g
        className={eyeClass}
        transform="translate(12, 15)"
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
      >
        <circle r="3" fill="currentColor" className="owl-eye-disc" />
        <circle r="1.5" fill="currentColor" className="owl-pupil" />
        {/* Catchlight — tiny white sparkle so the eye looks alive */}
        <circle cx="-0.8" cy="-0.8" r="0.6" fill="#ffffff" className="owl-catchlight" />
      </g>
      <g
        className={eyeClass}
        transform="translate(20, 15)"
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
      >
        <circle r="3" fill="currentColor" className="owl-eye-disc" />
        <circle r="1.5" fill="currentColor" className="owl-pupil" />
        <circle cx="-0.8" cy="-0.8" r="0.6" fill="#ffffff" className="owl-catchlight" />
      </g>

      {/* Beak — warm tone via .owl-beak class */}
      <path d="M16 18.5 L 14.5 21 L 17.5 21 Z" fill="currentColor" className="owl-beak" />

      {/* Wing hint — a soft curve on the side */}
      <path
        d="M9.5 17 Q 8.5 21, 11 23"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
        opacity="0.55"
        className="owl-wing"
      />
    </svg>
  );
}
