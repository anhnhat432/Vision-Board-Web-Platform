import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const iconBase = (props: IconProps) => ({
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  width: "1em",
  height: "1em",
  "aria-hidden": true as const,
  focusable: false as const,
  ...props,
});

export function LifeAreaHealthIcon(props: IconProps) {
  return (
    <svg {...iconBase(props)}>
      <path d="M3.5 13H7l2-6 4 12 2-6h3.5" />
    </svg>
  );
}

export function LifeAreaCareerIcon(props: IconProps) {
  return (
    <svg {...iconBase(props)}>
      <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      <rect x="2" y="6" width="20" height="14" rx="2" />
    </svg>
  );
}

export function LifeAreaFinanceIcon(props: IconProps) {
  return (
    <svg {...iconBase(props)}>
      <path d="M3 21h18" />
      <path d="M5 21V8l7-5 7 5v13" />
      <path d="M9 21v-6h6v6" />
    </svg>
  );
}

export function LifeAreaFamilyIcon(props: IconProps) {
  return (
    <svg {...iconBase(props)}>
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M9 22V12h6v10" />
    </svg>
  );
}

export function LifeAreaLearningIcon(props: IconProps) {
  return (
    <svg {...iconBase(props)}>
      <path d="M22 10v6" />
      <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
      <path d="m2 10 10-5 10 5-10 5z" />
    </svg>
  );
}

export function LifeAreaMindIcon(props: IconProps) {
  return (
    <svg {...iconBase(props)}>
      <path d="M7 20h10" />
      <path d="M10 20c5.5-2.5.8-6.4 3-10" />
      <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8" />
      <path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2" />
    </svg>
  );
}

export function LifeAreaFunIcon(props: IconProps) {
  return (
    <svg {...iconBase(props)}>
      <path d="M6 11h4" />
      <path d="M8 9v4" />
      <path d="M15 12h.01" />
      <path d="M18 10h.01" />
      <path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z" />
    </svg>
  );
}

export function LifeAreaRelationshipIcon(props: IconProps) {
  return (
    <svg {...iconBase(props)}>
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}
