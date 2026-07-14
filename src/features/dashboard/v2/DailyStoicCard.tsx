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
      className="relative aspect-[4/5] w-full select-none sm:aspect-[3/4] md:aspect-[4/5]"
      style={{ perspective: "1000px", WebkitPerspective: "1000px" }}
    >
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
          className="absolute inset-0 flex h-full w-full flex-col items-center justify-between overflow-hidden rounded-card bg-[#17150F] p-6 text-center text-white transition-all duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E7B400]/50"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(0deg)",
            WebkitTransform: "rotateY(0deg)",
            zIndex: isFlipped ? 0 : 2,
          }}
          onClick={handleFlip}
          onKeyDown={handleKeyDown}
        >
          {/* Glow amber radial */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(circle at 50% 0%, rgba(231,180,0,0.18), transparent 60%)" }}
            aria-hidden="true"
          />

          <div className="relative z-10 flex items-center gap-1.5">
            <Bookmark className="h-3.5 w-3.5 text-[#E7B400]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#E7B400]">Stoic Wisdom</span>
          </div>

          <div className="relative z-10 my-auto flex flex-col items-center gap-4">
            <div className="flex h-[58px] w-[58px] items-center justify-center rounded-full border border-[#E7B400]/40 bg-[#E7B400]/[0.16] text-[#E7B400]">
              <Sparkles className="h-[26px] w-[26px]" />
            </div>
            <div>
              <h3 className="font-serif text-[18px] font-bold text-white">Lá Bài Trí Tuệ</h3>
              <p className="mx-auto mt-2 max-w-[200px] font-serif text-[12.5px] italic leading-relaxed text-white/55">
                Chạm để lật mở châm ngôn Stoic và câu hỏi suy ngẫm dành riêng cho hôm nay
              </p>
            </div>
          </div>

          <span className="relative z-10 rounded-full border border-[#E7B400]/40 px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#E7B400]">
            Tap to reflect
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
          <div className="flex items-center justify-between border-b border-app-line/80 pb-3 pt-2">
            <div className="flex items-center gap-1.5">
              <HelpCircle className="h-4 w-4 text-app-accent" />
              <span className="text-[10px] font-extrabold tracking-[0.15em] uppercase text-app-ink-muted">
                Suy ngẫm hôm nay
              </span>
            </div>
            {isSaved && (
              <span className="flex items-center gap-1 text-[9px] font-bold text-app-accent bg-app-accent-soft px-2 py-0.5 rounded-full border border-app-accent/30">
                <Check className="h-3 w-3" /> Đã ghi nhận
              </span>
            )}
          </div>

          {/* Nội dung chính */}
          <div className="flex-1 flex flex-col justify-center py-3 overflow-y-auto min-h-0">
            <blockquote className="font-serif text-sm italic leading-relaxed text-app-ink-soft text-center select-none">
              “{currentQuote.quote}”
            </blockquote>

            <p className="text-[9px] font-bold text-center uppercase tracking-[0.15em] text-app-accent mt-2.5">
              — {currentQuote.author}
            </p>

            <div className="mt-4 pt-3 border-t border-app-line/80">
              <p className="text-xs font-bold text-app-ink leading-relaxed mb-2">
                💡 {currentQuote.question}
              </p>

              <textarea
                value={reflection}
                onChange={handleTextChange}
                placeholder="Ghi lại câu trả lời hoặc suy ngẫm của bạn tại đây..."
                className="w-full h-20 text-xs p-2.5 rounded-xl border border-app-line bg-app-bg-subtle/50 focus:bg-app-surface focus:outline-none focus:ring-1 focus:ring-app-accent/30 text-app-ink leading-relaxed placeholder:text-app-ink-muted resize-none font-semibold"
              />
            </div>
          </div>

          {/* Footer nút hành động */}
          <div className="mt-3 pt-2 border-t border-app-line/80">
            <Button
              onClick={handleSave}
              disabled={!reflection.trim() || isSaved}
              className={`w-full text-xs font-bold py-2.5 rounded-full transition-all duration-200 flex items-center justify-center gap-1.5 ${
                isSaved
                  ? "bg-app-bg-subtle text-app-ink-muted cursor-not-allowed border border-app-line"
                  : "bg-app-accent text-white hover:bg-app-accent-hover shadow-sm"
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
