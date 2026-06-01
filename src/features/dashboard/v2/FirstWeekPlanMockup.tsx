import { Check, Info } from "lucide-react";

export function FirstWeekPlanMockup() {
  return (
    <div className="relative rounded-2xl border border-amber-200/50 bg-[#fffdf9] dark:bg-neutral-900/60 p-5 shadow-3xs overflow-hidden select-none max-w-xl mx-auto transition-all duration-300 hover:shadow-2xs">
      {/* Red vertical margin line of a notebook */}
      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-red-400/20" />

      {/* Washi tape mockup at the top */}
      <div className="absolute -top-2.5 left-1/3 w-12 h-4 bg-teal-200/30 border border-teal-300/10 backdrop-blur-xs rotate-[-8deg] shadow-3xs" />

      {/* Content area with simulated writing style lines */}
      <div className="relative z-10 pl-6 space-y-4 font-serif">
        <div className="flex items-center justify-between border-b border-dashed border-neutral-200 dark:border-neutral-800 pb-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400 dark:text-neutral-500 font-sans flex items-center gap-1">
            <Info className="h-3 w-3 text-app-accent" />
            Ví dụ Kế hoạch Tuần 1
          </span>
          <span className="text-[9px] font-semibold text-neutral-400 font-sans">Mục tiêu: Đạt IELTS 6.5</span>
        </div>

        <ul className="space-y-3.5 text-xs text-neutral-700 dark:text-neutral-300 font-medium italic">
          <li className="flex items-start gap-3 border-b border-dashed border-neutral-100 dark:border-neutral-900 pb-2.5">
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-md border border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mt-0.5">
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            <span className="line-through text-neutral-400 dark:text-neutral-500">
              [Sáng] 🧘‍♀️ Ngồi thiền 5 phút & uống 1 ly nước ấm
            </span>
          </li>

          <li className="flex items-start gap-3 border-b border-dashed border-neutral-100 dark:border-neutral-900 pb-2.5">
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-md border border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mt-0.5">
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            <span className="line-through text-neutral-400 dark:text-neutral-500">
              [Chiều] 📚 Luyện 1 đề Listening Practice (Tuần 1)
            </span>
          </li>

          <li className="flex items-start gap-3 border-b border-dashed border-neutral-100 dark:border-neutral-900 pb-2.5">
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-md border border-neutral-300 dark:border-neutral-700 mt-0.5" />
            <span>[Tối] 🏃‍♂️ Đi bộ nhanh 15 phút quanh hồ</span>
          </li>
        </ul>

        <div className="pt-2 text-center">
          <p className="text-[9px] leading-relaxed text-neutral-400 dark:text-neutral-500 font-sans font-bold">
            💡 Mỗi ngày chỉ cần hoàn thành 3 việc nhỏ để tích lũy Streak 12 tuần!
          </p>
        </div>
      </div>
    </div>
  );
}
