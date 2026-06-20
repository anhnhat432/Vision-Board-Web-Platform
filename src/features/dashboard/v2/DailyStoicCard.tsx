import { Bookmark, Check, HelpCircle, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/app/components/ui/button";

interface StoicQuote {
  quote: string;
  author: string;
  question: string;
}

const STOIC_QUOTES: StoicQuote[] = [
  {
    quote: "Chúng ta thường đau khổ trong tưởng tượng nhiều hơn là trong thực tế.",
    author: "Seneca",
    question: "Nỗi lo sợ nào đang bị phóng đại trong tâm trí bạn hôm nay? Hãy gọi tên và đối diện với nó.",
  },
  {
    quote:
      "Bạn có quyền kiểm soát tâm trí của mình, không phải các sự kiện bên ngoài. Hãy nhận ra điều này, và bạn sẽ tìm thấy sức mạnh.",
    author: "Marcus Aurelius",
    question:
      "Sự việc nào đang nằm ngoài tầm kiểm soát của bạn? Bạn sẽ tập trung năng lượng vào điều gì bạn có thể kiểm soát?",
  },
  {
    quote: "Không phải những gì xảy ra với bạn, mà là cách bạn phản ứng với nó mới là điều quan trọng.",
    author: "Epictetus",
    question: "Có sự việc không như ý nào xảy ra gần đây? Bạn sẽ chọn phản ứng chánh niệm với nó thế nào?",
  },
  {
    quote: "Trở ngại cản đường sẽ trở thành con đường. Dưới mọi khó khăn luôn ẩn chứa một cơ hội.",
    author: "Marcus Aurelius",
    question: "Trở ngại lớn nhất của bạn hôm nay là gì? Bạn có thể chuyển hóa nó thành cơ hội học hỏi nào?",
  },
  {
    quote: "Tài sản lớn nhất của con người là biết hài lòng với những gì mình đang có.",
    author: "Seneca",
    question: "Hãy ghi nhanh 3 điều giản dị xung quanh khiến bạn cảm thấy trân trọng và biết ơn ngày hôm nay.",
  },
  {
    quote: "Hãy coi mỗi ngày mới là một cuộc đời độc lập và trọn vẹn.",
    author: "Seneca",
    question: "If hôm nay là ngày duy nhất để sống ý nghĩa, bạn muốn dành trọn vẹn sự tập trung cho điều gì?",
  },
  {
    quote: "Bất cứ nơi nào có con người, ở đó có cơ hội cho sự tử tế.",
    author: "Seneca",
    question: "Hôm nay bạn có thể trao đi một hành động tử tế hay sự thấu hiểu nhỏ bé nào cho ai đó không?",
  },
  {
    quote: "Hạnh phúc của cuộc đời phụ thuộc vào chất lượng của những suy nghĩ trong tâm trí bạn.",
    author: "Marcus Aurelius",
    question: "Suy nghĩ nào đang chiếm lĩnh đầu óc bạn nhiều nhất? Nó mang lại sự bình an hay xáo động?",
  },
];

export function DailyStoicCard() {
  const [isFlipped, setIsFlipped] = useState(false);
  const [reflection, setReflection] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [currentQuote, setCurrentQuote] = useState<StoicQuote>(STOIC_QUOTES[0]);
  const [dateKey, setDateKey] = useState("");

  useEffect(() => {
    // Tạo key dựa trên ngày hiện tại để mỗi ngày có 1 thẻ duy nhất cố định
    const today = new Date();
    const tzOffset = today.getTimezoneOffset() * 60000;
    const localISODate = new Date(today.getTime() - tzOffset).toISOString().split("T")[0];
    setDateKey(localISODate);

    // Chọn châm ngôn dựa trên ngày (sử dụng ngày làm seed cố định)
    const seed = localISODate.split("-").reduce((acc, val) => acc + Number.parseInt(val, 10), 0);
    const quoteIndex = seed % STOIC_QUOTES.length;
    setCurrentQuote(STOIC_QUOTES[quoteIndex]);

    // Kiểm tra xem đã lưu phản tư cho ngày hôm nay chưa
    const savedData = localStorage.getItem(`daily_stoic_reflection_${localISODate}`);
    if (savedData) {
      const parsed = JSON.parse(savedData);
      setReflection(parsed.reflection || "");
      setIsFlipped(true);
      setIsSaved(true);
    }
  }, []);

  const handleFlip = () => {
    if (!isFlipped) {
      setIsFlipped(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleFlip();
    }
  };

  const handleSave = () => {
    if (!reflection.trim()) return;

    const dataToSave = {
      date: dateKey,
      quote: currentQuote.quote,
      author: currentQuote.author,
      reflection: reflection.trim(),
    };

    localStorage.setItem(`daily_stoic_reflection_${dateKey}`, JSON.stringify(dataToSave));
    setIsSaved(true);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReflection(e.target.value);
    if (isSaved) {
      setIsSaved(false); // Reset trạng thái đã lưu khi người dùng chỉnh sửa tiếp
    }
  };

  return (
    <div
      className="w-full aspect-[4/5] sm:aspect-[3/4] md:aspect-[4/5] relative"
      style={{ perspective: "1000px", WebkitPerspective: "1000px" }}
    >
      {/* 📌 Floating wood pin at the top center of Stoic card framework */}
      <span className="hidden sm:inline absolute -top-3 left-1/2 transform -translate-x-1/2 text-base opacity-70 select-none cursor-default z-30">
        📌
      </span>

      <div
        className="relative w-full h-full transition-transform duration-700"
        style={{
          transformStyle: "preserve-3d",
          WebkitTransformStyle: "preserve-3d",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* MẶT SAU THẺ BÀI (CARD BACK) - Nhìn thấy đầu tiên */}
        <button
          type="button"
          className="absolute inset-0 w-full h-full rounded-card border border-app-accent/30 p-6 flex flex-col items-center justify-between shadow-app-md cursor-pointer hover:shadow-app-lg hover:-translate-y-1 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/50"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(0deg)",
            WebkitTransform: "rotateY(0deg)",
            zIndex: isFlipped ? 0 : 2,
            background: "var(--grad-aspire)",
            color: "var(--app-ink-on-accent)",
          }}
          onClick={handleFlip}
          onKeyDown={handleKeyDown}
        >
          {/* Họa tiết góc cổ điển */}
          <div className="absolute top-4 left-4 w-4 h-4 border-t border-l border-[var(--app-ink-on-accent)]/20 rounded-tl" />
          <div className="absolute top-4 right-4 w-4 h-4 border-t border-r border-[var(--app-ink-on-accent)]/20 rounded-tr" />
          <div className="absolute bottom-4 left-4 w-4 h-4 border-b border-l border-[var(--app-ink-on-accent)]/20 rounded-bl" />
          <div className="absolute bottom-4 right-4 w-4 h-4 border-b border-r border-[var(--app-ink-on-accent)]/20 rounded-br" />

          <div className="flex items-center gap-1.5 opacity-60 mt-2">
            <Bookmark className="h-4 w-4" />
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-70">STOIC WISDOM</span>
          </div>

          <div className="flex flex-col items-center gap-4 text-center my-auto">
            <div className="relative flex items-center justify-center w-16 h-16 rounded-full border border-[var(--app-ink-on-accent)]/20 bg-[var(--app-ink-on-accent)]/10">
              <Sparkles className="h-6 w-6" />
              <div
                className="absolute inset-0 rounded-full border border-dashed border-[var(--app-ink-on-accent)]/20"
              />
            </div>
            <div>
              <h3 className="font-serif text-lg font-normal tracking-wide">Lá Bài Trí Tuệ</h3>
              <p className="text-xs opacity-60 mt-1.5 max-w-[200px] leading-relaxed font-serif italic">
                Chạm để lật mở châm ngôn Stoic và câu hỏi suy ngẫm dành riêng cho hôm nay
              </p>
            </div>
          </div>

          <span className="text-[9px] font-extrabold opacity-30 mb-2 tracking-widest uppercase">
            TAP TO REFLECT
          </span>
        </button>

        {/* MẶT TRƯỚC THẺ BÀI (CARD FRONT) - Hiển thị sau khi lật */}
        <div
          className="absolute inset-0 w-full h-full rounded-card border border-app-line bg-app-surface text-app-ink p-5 flex flex-col justify-between shadow-app-md"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            WebkitTransform: "rotateY(180deg)",
            zIndex: isFlipped ? 2 : 0,
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-app-line pb-3 pt-2">
            <div className="flex items-center gap-1.5">
              <HelpCircle className="h-4 w-4 text-app-accent" />
              <span className="text-[10px] font-extrabold tracking-[0.15em] uppercase text-app-ink-muted">
                Suy ngẫm hôm nay
              </span>
            </div>
            {isSaved && (
              <span className="flex items-center gap-1 text-[9px] font-bold text-app-status-success bg-app-accent-soft px-2 py-0.5 rounded-full border border-app-accent/20">
                <Check className="h-3 w-3" /> Đã ghi nhận
              </span>
            )}
          </div>

          {/* Nội dung chính */}
          <div className="flex-1 flex flex-col justify-center py-3 overflow-y-auto min-h-0">
            <blockquote className="font-serif text-sm italic leading-relaxed text-app-ink-soft text-center">
              “{currentQuote.quote}”
            </blockquote>

            <p className="text-[9px] font-bold text-center uppercase tracking-[0.15em] text-app-accent mt-2.5">
              — {currentQuote.author}
            </p>

            <div className="mt-4 pt-3 border-t border-app-line">
              <p className="text-xs font-bold text-app-ink leading-relaxed mb-2">
                💡 {currentQuote.question}
              </p>

              <textarea
                value={reflection}
                onChange={handleTextChange}
                placeholder="Ghi lại câu trả lời hoặc suy ngẫm của bạn tại đây..."
                className="w-full h-20 text-xs p-2.5 rounded-control border border-app-line bg-app-bg-subtle focus:bg-app-surface focus:outline-none focus:ring-1 focus:ring-app-accent/30 text-app-ink leading-relaxed placeholder:text-app-ink-muted resize-none font-semibold"
              />
            </div>
          </div>

          {/* Footer nút hành động */}
          <div className="mt-3 pt-2 border-t border-app-line">
            <Button
              onClick={handleSave}
              disabled={!reflection.trim() || isSaved}
              className={`w-full text-xs font-bold py-2.5 rounded-full transition-all duration-200 flex items-center justify-center gap-1.5 ${
                isSaved
                  ? "bg-app-bg-subtle text-app-ink-disabled cursor-not-allowed border border-app-line"
                  : "bg-app-accent text-[var(--app-ink-on-accent)] hover:bg-app-accent-hover shadow-app-sm"
              }`}
            >
              {isSaved ? "Đã lưu suy ngẫm" : "Lưu suy ngẫm"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
