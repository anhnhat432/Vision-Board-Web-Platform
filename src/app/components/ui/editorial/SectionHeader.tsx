import { Eyebrow } from "./Eyebrow";

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  as?: "h1" | "h2" | "h3";
  className?: string;
}

const alignStyles = {
  left: "",
  center: "text-center",
};

const headingStyles: Record<string, string> = {
  h1: "font-serif text-3xl sm:text-4xl font-bold leading-[1.2] tracking-tight text-app-ink md:text-[2.75rem]",
  h2: "font-serif text-2xl sm:text-3xl font-bold leading-[1.15] tracking-tight text-app-ink",
  h3: "font-serif text-xl sm:text-2xl font-semibold leading-[1.22] tracking-tight text-app-ink",
};

export function SectionHeader({
  eyebrow,
  title,
  description,
  align = "left",
  as = "h2",
  className = "",
}: SectionHeaderProps) {
  const HeadingTag = as;

  return (
    <div className={`${alignStyles[align]} ${className}`}>
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <HeadingTag className={`${eyebrow ? "mt-2" : ""} ${headingStyles[as]}`}>
        {title}
      </HeadingTag>
      {description ? (
        <p className="mt-2 text-sm text-app-ink-soft max-w-2xl leading-relaxed">
          {description}
        </p>
      ) : null}
    </div>
  );
}
