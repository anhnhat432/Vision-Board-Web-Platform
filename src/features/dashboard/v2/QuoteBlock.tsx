interface QuoteBlockProps {
  text?: string;
  author?: string;
  imageSrc?: string;
  imageCaption?: string;
}

export function QuoteBlock({
  text = "Điều nhỏ được làm đều đặn sẽ đổi hướng cả một mùa sống.",
  author = "Vision Board",
  imageSrc = "/study_desk_hero.png",
  imageCaption = "Góc nhỏ kỷ luật cho những chu kỳ chuyển mình rõ nét.",
}: QuoteBlockProps) {
  return (
    <div className="rounded-[20px] border border-app-line bg-app-surface p-5 select-none">
      <p className="mb-4 text-center font-serif text-[15px] italic leading-snug text-app-ink">“{text}”</p>
      <div className="mb-3 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-app-accent">{author}</div>
      <div className="relative overflow-hidden rounded-[13px]">
        <picture>
          {imageSrc === "/study_desk_hero.png" ? <source srcSet="/study_desk_hero.webp" type="image/webp" /> : null}
          <img
            src={imageSrc}
            alt={author}
            className="block h-[150px] w-full object-cover"
            width={320}
            height={150}
            loading="lazy"
            decoding="async"
          />
        </picture>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-app-ink/70 to-transparent p-3">
          <p className="font-serif text-[11px] italic text-white">“{imageCaption}”</p>
        </div>
      </div>
    </div>
  );
}
