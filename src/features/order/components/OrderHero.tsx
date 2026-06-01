import { BookOpen, Calendar, Sparkles } from "lucide-react";

import { INCLUDED_DOCS } from "@/features/order/catalog/included";

const ICON_MAP: Record<string, typeof Sparkles> = {
  "smart-guide": BookOpen,
  "twelve-week-guide": Calendar,
};

export function OrderHero() {
  return (
    <div className="rounded-[var(--r-card)] border border-[var(--order-border)] bg-[var(--order-bg)] p-6 sm:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--order-eyebrow)]">
            Vision Board Kit
          </div>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Đặt kit của riêng bạn</h1>
          <p className="mt-2 max-w-xl text-sm text-[var(--order-text-muted)]">
            Chọn khung gỗ, set ảnh chủ đề và sticker — chúng mình đóng gói gửi tận nhà.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-5 items-stretch w-full lg:w-auto shrink-0">
          {/* Visual Anchor */}
          <div className="relative overflow-hidden rounded-2xl border border-[var(--order-border)] shadow-sm aspect-[16/10] w-full sm:w-56 shrink-0 bg-white/50">
            <img
              src="/printed_vision_kit.png"
              alt="Bộ Vision Board Kit vật lý"
              className="w-full h-full object-cover dark:brightness-[0.85] dark:contrast-[1.05]"
              loading="lazy"
            />
          </div>

          <div className="rounded-[var(--r-card-sm)] border border-[var(--order-border)] bg-[var(--order-card)] p-4 flex-1 sm:w-56">
            <div className="text-xs font-medium text-[var(--order-text-muted)]">Bao gồm sẵn</div>
            <ul className="mt-2 space-y-2">
              {INCLUDED_DOCS.map((doc) => {
                const Icon = ICON_MAP[doc.id] ?? Sparkles;
                return (
                  <li key={doc.id} className="flex items-center gap-2 text-sm">
                    <Icon className="h-4 w-4 text-[var(--order-accent)]" />
                    <span>{doc.label}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
