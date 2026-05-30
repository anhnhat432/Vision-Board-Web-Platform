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
    <div className="relative overflow-hidden rounded-3xl border border-neutral-200/80 dark:border-neutral-800/85 bg-white/40 dark:bg-neutral-900/10 backdrop-blur-sm p-6 -rotate-[1.5deg] hover:rotate-0 hover:border-app-accent/20 transition-all duration-300 select-none shadow-[0_4px_24px_rgba(0,0,0,0.005)]">
      {/* 📌 Floating wood pin at the top center of the quote note */}
      <span className="absolute -top-3 left-1/2 transform -translate-x-1/2 text-xl filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.05)]">📌</span>

      {/* Background Decorative Quote Icon */}
      <div className="absolute -right-3 -top-3 text-app-accent-soft/10 pointer-events-none transform rotate-180">
        <Quote className="h-16 w-16" />
      </div>

      <figure className="relative z-10 text-center pt-2">
        <blockquote className="font-serif text-sm italic leading-relaxed text-neutral-600 dark:text-neutral-400 select-none">
          “{text}”
        </blockquote>
        <div className="mt-4 flex items-center justify-center gap-2">
          <div className="h-px w-6 bg-neutral-200 dark:bg-neutral-800" />
          <figcaption className="text-[9px] font-bold uppercase tracking-[0.2em] text-app-accent">
            {author}
          </figcaption>
          <div className="h-px w-6 bg-neutral-200 dark:bg-neutral-800" />
        </div>
      </figure>
    </div>
  );
}
