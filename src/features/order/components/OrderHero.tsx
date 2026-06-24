import { BookOpen, Calendar, Sparkles } from "lucide-react";

import { INCLUDED_DOCS } from "@/features/order/catalog/included";

const ICON_MAP: Record<string, typeof Sparkles> = {
  "smart-guide": BookOpen,
  "twelve-week-guide": Calendar,
};

export function OrderHero() {
  return (
    <section className="relative overflow-hidden rounded-[var(--r-card)] border border-[var(--order-border)] bg-[var(--order-card)] p-6 sm:p-7 grid gap-5 sm:grid-cols-[1fr_170px_240px] items-center">
      <div>
        <div className="text-[10px] font-extrabold tracking-[0.14em] uppercase text-[var(--order-eyebrow)] mb-2.5">
          Vision board kit
        </div>
        <h1 className="font-semibold text-[clamp(24px,2.6vw,32px)] leading-[1.05] tracking-[-0.02em] m-0 mb-2">
          Đặt kit của riêng bạn
        </h1>
        <p className="text-[13.5px] leading-[1.55] text-[var(--order-text-soft)] m-0 max-w-[44ch]">
          Chọn khung gỗ, set ảnh chủ đề và sticker — chúng mình đóng gói gửi tận nhà.
        </p>
      </div>

      <div className="relative rounded-[14px] overflow-hidden self-stretch min-h-[120px]">
        <picture className="block h-full w-full">
          <source srcSet="/printed_vision_kit.webp" type="image/webp" />
          <img
            src="/printed_vision_kit.png"
            alt="Vision board kit"
            className="w-full h-full object-cover block absolute inset-0"
            loading="lazy"
            decoding="async"
          />
        </picture>
      </div>

      <div className="bg-[var(--order-surface)] border border-[var(--order-border)] rounded-[14px] p-4">
        <div className="text-[11px] font-bold text-[var(--order-text-soft)] mb-3">Bao gồm sẵn</div>
        <div className="flex flex-col gap-[11px]">
          {INCLUDED_DOCS.map((doc) => {
            const Icon = ICON_MAP[doc.id] ?? Sparkles;
            return (
              <div key={doc.id} className="flex items-start gap-[9px]">
                <span className="w-5 h-5 rounded-md bg-[var(--order-success-soft)] text-[var(--order-success)] flex items-center justify-center shrink-0">
                  <Icon className="h-3 w-3" />
                </span>
                <span className="text-xs text-[var(--order-text)] leading-[1.35]">{doc.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
