import type { SVGProps } from "react";

export interface OwlIconProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

export function OwlIcon({ size = 24, className, ...props }: OwlIconProps) {
  const viewBox = size === 32 ? "0 0 32 32" : size === 28 ? "0 0 28 28" : "0 0 24 24";
  const cx = size === 32 ? 16 : size === 28 ? 14 : 12;
  const cy = size === 32 ? 17 : size === 28 ? 15 : 13;
  const r = size === 32 ? 11 : size === 28 ? 10 : 9;
  const eyeR = size === 32 ? 4 : size === 28 ? 3.5 : 3;
  const pupilR = size === 32 ? 1.5 : size === 28 ? 1.5 : 1.2;
  const earCx = size === 32 ? 11 : size === 28 ? 10 : 8.5;
  const earCy = size === 32 ? 7 : size === 28 ? 6 : 5;
  const earRx = size === 32 ? 2.5 : size === 28 ? 2 : 1.8;
  const earRy = size === 32 ? 4 : size === 28 ? 3.5 : 3;

  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <circle cx={cx} cy={cy} r={r} fill="white" />
      <circle cx={cx - 3} cy={cy - 2} r={eyeR} fill="white" />
      <circle cx={cx - 3} cy={cy - 2} r={pupilR} fill="#1e293b" />
      <circle cx={cx + 3} cy={cy - 2} r={eyeR} fill="white" />
      <circle cx={cx + 3} cy={cy - 2} r={pupilR} fill="#1e293b" />
      <polygon points={`${cx},${cy + 1} ${cx - 2},${cy + 4} ${cx + 2},${cy + 4}`} fill="#fbbf24" />
      <ellipse cx={earCx} cy={earCy} rx={earRx} ry={earRy} fill="white" transform={`rotate(-20 ${earCx} ${earCy})`} />
      <ellipse
        cx={size - earCx}
        cy={earCy}
        rx={earRx}
        ry={earRy}
        fill="white"
        transform={`rotate(20 ${size - earCx} ${earCy})`}
      />
    </svg>
  );
}
