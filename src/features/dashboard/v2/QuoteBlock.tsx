import { Quote } from "lucide-react";

interface QuoteBlockProps {
  text?: string;
  author?: string;
}

export function QuoteBlock({
  text = "Điều nhỏ được làm đều đặn sẽ đổi hướng cả một mùa sống.",
  author = "Vision Board",
}: QuoteBlockProps) {
  return (
    <div className="relative overflow-hidden rounded-[14px] border border-app-line bg-app-surface p-6">
      {/* Background Decorative Quote Icon */}
      <div className="absolute -right-3 -top-3 text-app-accent-soft/40 pointer-events-none transform rotate-180">
        <Quote className="h-16 w-16" />
      </div>

      <figure className="relative z-10 text-center">
        <blockquote className="font-serif text-base italic leading-relaxed text-app-ink-soft select-none">
          “{text}”
        </blockquote>
        <div className="mt-4 flex items-center justify-center gap-2">
          <div className="h-px w-6 bg-app-line" />
          <figcaption className="text-[10px] font-bold uppercase tracking-[0.2em] text-app-accent">
            {author}
          </figcaption>
          <div className="h-px w-6 bg-app-line" />
        </div>
      </figure>
    </div>
  );
}
