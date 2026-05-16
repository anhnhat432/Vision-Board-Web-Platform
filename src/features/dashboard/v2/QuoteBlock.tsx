interface QuoteBlockProps {
  text?: string;
  author?: string;
}

export function QuoteBlock({
  text = "Điều nhỏ được làm đều đặn sẽ đổi hướng cả một mùa sống.",
  author = "Vision Board",
}: QuoteBlockProps) {
  return (
    <figure className="px-4 text-center">
      <blockquote className="font-serif text-[14px] italic leading-6 text-app-ink-soft">“{text}”</blockquote>
      <figcaption className="mt-2 text-[11px] font-medium uppercase tracking-[0.14em] text-app-ink-muted">
        {author}
      </figcaption>
    </figure>
  );
}
