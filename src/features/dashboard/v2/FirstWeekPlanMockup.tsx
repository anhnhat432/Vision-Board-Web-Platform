import { Check, Info } from "lucide-react";

export function FirstWeekPlanMockup() {
  return (
    <div className="relative rounded-2xl border border-app-line/80 bg-app-surface p-5 shadow-3xs overflow-hidden select-none max-w-xl mx-auto transition-all duration-300 hover:shadow-2xs">
      {/* Red vertical margin line of a notebook */}
      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-red-400/20" />

      {/* Washi tape mockup at the top */}
      <div className="absolute -top-2.5 left-1/3 w-12 h-4 bg-teal-200/30 border border-teal-300/10 backdrop-blur-xs rotate-[-8deg] shadow-3xs" />

      {/* Content area with simulated writing style lines */}
      <div className="relative z-10 pl-6 space-y-4 font-serif">
        <div className="flex items-center justify-between border-b border-dashed border-app-line pb-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-app-ink-muted font-sans flex items-center gap-1">
            <Info className="h-3 w-3 text-app-accent" />
            Ví dụ Kế hoạch Tuần 1
          </span>
          <span className="text-[9px] font-semibold text-app-ink-muted font-sans">Mục tiêu: Đạt IELTS 6.5</span>
        </div>

        <ul className="space-y-3.5 text-xs text-app-ink-soft font-medium italic">
          <li className="flex items-start gap-3 border-b border-dashed border-app-line pb-2.5">
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-md border border-app-accent bg-app-accent/10 text-app-accent mt-0.5">
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            <span className="line-through text-app-ink-muted">
              [Sáng] 🧘‍♀️ Ngồi thiền 5 phút & uống 1 ly nước ấm
            </span>
          </li>

          <li className="flex items-start gap-3 border-b border-dashed border-app-line pb-2.5">
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-md border border-app-accent bg-app-accent/10 text-app-accent mt-0.5">
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            <span className="line-through text-app-ink-muted">
              [Chiều] 📚 Luyện 1 đề Listening Practice (Tuần 1)
            </span>
          </li>

          <li className="flex items-start gap-3 border-b border-dashed border-app-line pb-2.5">
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-md border border-app-line mt-0.5" />
            <span>[Tối] 🏃‍♂️ Đi bộ nhanh 15 phút quanh hồ</span>
          </li>
        </ul>

        <div className="pt-2 text-center">
          <p className="text-[9px] leading-relaxed text-app-ink-muted font-sans font-bold">
            💡 Mỗi ngày chỉ cần hoàn thành 3 việc nhỏ để tích lũy Streak 12 tuần!
          </p>
        </div>
      </div>
    </div>
  );
}
