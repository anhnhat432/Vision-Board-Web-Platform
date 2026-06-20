import { Sparkles } from "lucide-react";

export function DreamyPinboardMockup() {
  return (
    <div className="relative rounded-3xl border border-app-line/80 bg-gradient-to-br from-app-surface/90 to-app-surface/40 p-5 shadow-3xs select-none overflow-hidden min-h-[340px] flex flex-col justify-between transition-all duration-300 hover:shadow-2xs">
      {/* Background ambient decorative soft grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#262626_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

      <div className="relative z-10">
        <span className="absolute -top-3.5 left-2.5 text-xl filter drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.08)] z-20">
          📌
        </span>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-app-accent mb-6 pl-6 flex items-center gap-1.5">
          <span>Bảng tầm nhìn ước mơ mẫu</span>
          <Sparkles className="h-3 w-3 text-app-energy animate-pulse" />
        </p>

        {/* Overlapping Polaroid pile */}
        <div className="relative h-48 mt-4 flex items-center justify-center">
          {/* Polaroid 1 (Left, rotated) */}
          <div className="absolute left-2 top-4 w-28 bg-app-surface p-2 pb-4 shadow-3xs border border-app-line rounded-sm -rotate-[6deg] hover:rotate-0 hover:-translate-y-1 hover:shadow-2xs duration-300 transition-all cursor-pointer">
            <div className="h-16 w-full bg-gradient-to-tr from-rose-100 to-amber-50 rounded-xs flex items-center justify-center text-xl">
              🥗
            </div>
            <p className="mt-2 text-[9px] font-serif font-semibold italic text-app-ink-soft text-center">
              Ăn lành mạnh
            </p>
            <div className="absolute top-1.5 right-1.5 text-[8px] opacity-40">✨</div>
          </div>

          {/* Polaroid 2 (Center, back) */}
          <div className="absolute top-0 w-28 bg-app-surface p-2 pb-4 shadow-2xs border border-app-line rounded-sm rotate-[2deg] hover:rotate-0 hover:-translate-y-1 hover:shadow-xs duration-300 transition-all cursor-pointer z-10">
            {/* Washi tape mockup */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-10 h-3.5 bg-amber-200/40 border border-amber-300/10 backdrop-blur-xs rotate-[12deg] shadow-3xs" />
            <div className="h-16 w-full bg-gradient-to-tr from-sky-100 to-teal-50 rounded-xs flex items-center justify-center text-xl">
              📖
            </div>
            <p className="mt-2 text-[9px] font-serif font-semibold italic text-app-ink-soft text-center">
              Đọc 12 cuốn sách
            </p>
          </div>

          {/* Polaroid 3 (Right, rotated) */}
          <div className="absolute right-2 top-6 w-28 bg-app-surface p-2 pb-4 shadow-3xs border border-app-line rounded-sm rotate-[8deg] hover:rotate-0 hover:-translate-y-1 hover:shadow-2xs duration-300 transition-all cursor-pointer">
            <div className="h-16 w-full bg-gradient-to-tr from-violet-100 to-indigo-50 rounded-xs flex items-center justify-center text-xl">
              💻
            </div>
            <p className="mt-2 text-[9px] font-serif font-semibold italic text-app-ink-soft text-center">
              Xây dựng sự nghiệp
            </p>
            <div className="absolute top-1.5 right-1.5 text-[8px] opacity-40">🔥</div>
          </div>
        </div>
      </div>

      <p className="relative z-10 text-[10px] leading-relaxed text-app-ink-muted font-semibold text-center italic font-serif mt-2 border-t border-app-line pt-3">
        "Tầm nhìn rõ ràng là một nửa chặng đường thành công."
      </p>
    </div>
  );
}
