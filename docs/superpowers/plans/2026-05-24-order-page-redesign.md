# Order Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `/order` với tone warm scrapbook (cream + peach), thêm progress bar 5 bước, step cards, và preview ảnh trong summary.

**Architecture:** Tokens scoped trong `.order-page`, không động global theme. Giữ nguyên 100% logic pricing/validation/storage/services. Chỉ restructure layout + restyle picker components. Không thêm dependency.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Lucide icons, Vitest, React Testing Library.

**Spec:** `docs/superpowers/specs/2026-05-24-order-page-redesign-design.md`

---

## File Structure

**Create:**
- `src/features/order/styles/order-theme.css` — tokens scoped `.order-page`
- `src/features/order/components/OrderProgressBar.tsx` — sticky progress 5 bước
- `src/features/order/components/OrderProgressBar.test.tsx`
- `src/features/order/components/StepCard.tsx` — wrapper card cho mỗi section
- `src/features/order/components/OrderHero.tsx` — hero header gộp INCLUDED_DOCS

**Modify:**
- `src/features/order/pages/OrderPage.tsx` — restructure layout
- `src/features/order/components/OrderSummary.tsx` — thêm preview block + restyle, mở rộng props
- `src/features/order/components/OrderSummary.test.tsx` — assertion cho preview block
- `src/features/order/components/FrameSizePicker.tsx` — restyle (ring peach + tick)
- `src/features/order/components/ThemePicker.tsx` — restyle + search icon + counter chip
- `src/features/order/components/StickerAddon.tsx` — restyle theo tone
- `src/features/order/pages/OrderPage.test.tsx` — assertion progress bar
- `src/styles/index.css` — import order-theme.css

**Delete:** (sau khi confirm chỉ OrderPage dùng)
- `src/features/order/components/IncludedItemsCard.tsx`

---

## Task 1: Tạo tokens scoped và import vào style chính

**Files:**
- Create: `src/features/order/styles/order-theme.css`
- Modify: `src/styles/index.css`

- [ ] **Step 1: Tạo file tokens**

Tạo `src/features/order/styles/order-theme.css`:

```css
.order-page {
  --order-bg: #FBF6EE;
  --order-card: #FFFFFF;
  --order-border: #E8DFCF;
  --order-accent: #F4A582;
  --order-accent-soft: #FBE4D5;
  --order-text-muted: #7A6F5E;
  --order-eyebrow: #B8956F;
}
```

- [ ] **Step 2: Import vào style chính**

Đọc `src/styles/index.css`, thêm dòng `@import` ở vị trí thích hợp (sau các import font, trước các block khác):

```css
@import './fonts.css';
@import '../features/order/styles/order-theme.css';
```

- [ ] **Step 3: Build để xác nhận CSS hợp lệ**

Run: `npm run build`
Expected: build pass, không lỗi CSS.

- [ ] **Step 4: Commit**

```bash
rtk git add src/features/order/styles/order-theme.css src/styles/index.css
rtk git commit -m "feat(order): add scoped warm scrapbook tokens" --no-gpg-sign
```

---

## Task 2: OrderProgressBar component

**Files:**
- Create: `src/features/order/components/OrderProgressBar.tsx`
- Test: `src/features/order/components/OrderProgressBar.test.tsx`

- [ ] **Step 1: Viết test fail trước**

Tạo `src/features/order/components/OrderProgressBar.test.tsx`:

```ts
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { OrderProgressBar } from "./OrderProgressBar";

describe("OrderProgressBar", () => {
  it("renders 5 steps with correct status", () => {
    render(
      <OrderProgressBar
        currentStep={2}
        completedSteps={[1]}
        onStepClick={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: /Khung/ })).toHaveAttribute(
      "data-status",
      "done",
    );
    expect(screen.getByRole("button", { name: /Theme/ })).toHaveAttribute(
      "data-status",
      "current",
    );
    expect(screen.getByRole("button", { name: /Sticker/ })).toHaveAttribute(
      "data-status",
      "pending",
    );
  });

  it("calls onStepClick with step number when clicked", () => {
    const onStepClick = vi.fn();
    render(
      <OrderProgressBar
        currentStep={1}
        completedSteps={[]}
        onStepClick={onStepClick}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Theme/ }));
    expect(onStepClick).toHaveBeenCalledWith(2);
  });

  it("shows mobile compact label with current step name", () => {
    render(
      <OrderProgressBar
        currentStep={2}
        completedSteps={[1]}
        onStepClick={() => {}}
      />,
    );
    expect(screen.getByText(/Bước 2\/5/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

Run: `npx vitest run src/features/order/components/OrderProgressBar.test.tsx`
Expected: FAIL — `OrderProgressBar` chưa tồn tại.

- [ ] **Step 3: Implement component**

Tạo `src/features/order/components/OrderProgressBar.tsx`:

```tsx
import { Check } from "lucide-react";

import { cn } from "@/app/components/ui/utils";

const STEPS = [
  { num: 1, label: "Khung" },
  { num: 2, label: "Theme" },
  { num: 3, label: "Sticker" },
  { num: 4, label: "Giao hàng" },
  { num: 5, label: "Ghi chú" },
] as const;

export interface OrderProgressBarProps {
  currentStep: number;
  completedSteps: number[];
  onStepClick: (step: number) => void;
}

export function OrderProgressBar({
  currentStep,
  completedSteps,
  onStepClick,
}: OrderProgressBarProps) {
  function statusOf(num: number): "done" | "current" | "pending" {
    if (completedSteps.includes(num)) return "done";
    if (num === currentStep) return "current";
    return "pending";
  }

  const currentLabel = STEPS.find((s) => s.num === currentStep)?.label ?? "";

  return (
    <div className="sticky top-0 z-20 -mx-4 mb-6 border-b border-[var(--order-border)] bg-[var(--order-bg)]/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto max-w-6xl">
        <div className="hidden gap-2 sm:flex">
          {STEPS.map((s) => {
            const status = statusOf(s.num);
            return (
              <button
                key={s.num}
                type="button"
                data-status={status}
                onClick={() => onStepClick(s.num)}
                className="group flex flex-1 flex-col items-start gap-1.5 text-left"
              >
                <div
                  className={cn(
                    "flex h-1.5 w-full rounded-full transition-colors",
                    status === "done" && "bg-[var(--order-accent)]",
                    status === "current" && "bg-[var(--order-accent-soft)]",
                    status === "pending" && "bg-[var(--order-border)]",
                  )}
                />
                <div className="flex items-center gap-1.5 text-xs">
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold",
                      status === "done" &&
                        "bg-[var(--order-accent)] text-white",
                      status === "current" &&
                        "border border-[var(--order-accent)] text-[var(--order-accent)]",
                      status === "pending" &&
                        "bg-[var(--order-border)] text-[var(--order-text-muted)]",
                    )}
                  >
                    {status === "done" ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      s.num
                    )}
                  </span>
                  <span
                    className={cn(
                      status === "current" &&
                        "font-medium text-[var(--order-accent)]",
                      status !== "current" && "text-[var(--order-text-muted)]",
                    )}
                  >
                    {s.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
        <div className="sm:hidden">
          <div className="mb-2 text-xs font-medium text-[var(--order-text-muted)]">
            Bước {currentStep}/5 — {currentLabel}
          </div>
          <div className="flex h-1.5 overflow-hidden rounded-full bg-[var(--order-border)]">
            <div
              className="bg-[var(--order-accent)] transition-all"
              style={{
                width: `${(completedSteps.length / STEPS.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test, expect PASS**

Run: `npx vitest run src/features/order/components/OrderProgressBar.test.tsx`
Expected: 3 pass.

- [ ] **Step 5: Commit**

```bash
rtk git add src/features/order/components/OrderProgressBar.tsx src/features/order/components/OrderProgressBar.test.tsx
rtk git commit -m "feat(order): add OrderProgressBar component" --no-gpg-sign
```

---

## Task 3: StepCard component

**Files:**
- Create: `src/features/order/components/StepCard.tsx`

- [ ] **Step 1: Implement StepCard**

Tạo `src/features/order/components/StepCard.tsx`:

```tsx
import type { ReactNode } from "react";
import { Check } from "lucide-react";

import { cn } from "@/app/components/ui/utils";

export interface StepCardProps {
  step: number;
  title: string;
  status?: "pending" | "current" | "done";
  hint?: string;
  errorText?: string;
  children: ReactNode;
  id?: string;
}

export function StepCard({
  step,
  title,
  status = "pending",
  hint,
  errorText,
  children,
  id,
}: StepCardProps) {
  return (
    <section
      id={id}
      className="rounded-[var(--r-card)] border border-[var(--order-border)] bg-[var(--order-card)] p-5 shadow-sm sm:p-6"
    >
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
              status === "done" && "bg-[var(--order-accent)] text-white",
              status === "current" &&
                "border-2 border-[var(--order-accent)] text-[var(--order-accent)]",
              status === "pending" &&
                "bg-[var(--order-border)] text-[var(--order-text-muted)]",
            )}
          >
            {status === "done" ? <Check className="h-4 w-4" /> : step}
          </span>
          <h2 className="text-base font-semibold sm:text-lg">{title}</h2>
        </div>
        {hint && (
          <span className="text-xs text-[var(--order-text-muted)]">{hint}</span>
        )}
      </header>
      <div>{children}</div>
      {errorText && (
        <p className="mt-2 text-xs text-destructive">{errorText}</p>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
rtk git add src/features/order/components/StepCard.tsx
rtk git commit -m "feat(order): add StepCard wrapper component" --no-gpg-sign
```

---

## Task 4: OrderHero component

**Files:**
- Create: `src/features/order/components/OrderHero.tsx`

- [ ] **Step 1: Implement OrderHero**

Tạo `src/features/order/components/OrderHero.tsx`:

```tsx
import { BookOpen, Calendar, Sparkles } from "lucide-react";

import { INCLUDED_DOCS } from "@/features/order/catalog/included";

const ICON_MAP: Record<string, typeof Sparkles> = {
  "smart-guide": BookOpen,
  "twelve-week-guide": Calendar,
};

export function OrderHero() {
  return (
    <div className="rounded-[var(--r-card)] border border-[var(--order-border)] bg-[var(--order-bg)] p-6 sm:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--order-eyebrow)]">
            Vision Board Kit
          </div>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
            Đặt kit của riêng bạn
          </h1>
          <p className="mt-2 max-w-xl text-sm text-[var(--order-text-muted)]">
            Chọn khung gỗ, set ảnh chủ đề và sticker — chúng mình đóng gói gửi
            tận nhà.
          </p>
        </div>
        <div className="rounded-[var(--r-card-sm)] border border-[var(--order-border)] bg-[var(--order-card)] p-4">
          <div className="text-xs font-medium text-[var(--order-text-muted)]">
            Bao gồm sẵn
          </div>
          <ul className="mt-2 space-y-2">
            {INCLUDED_DOCS.map((doc) => {
              const Icon = ICON_MAP[doc.id] ?? Sparkles;
              return (
                <li
                  key={doc.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <Icon className="h-4 w-4 text-[var(--order-accent)]" />
                  <span>{doc.label}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
rtk git add src/features/order/components/OrderHero.tsx
rtk git commit -m "feat(order): add OrderHero with included docs" --no-gpg-sign
```

---

## Task 5: Restyle FrameSizePicker

**Files:**
- Modify: `src/features/order/components/FrameSizePicker.tsx`

- [ ] **Step 1: Sửa class theo tone mới**

Đọc `src/features/order/components/FrameSizePicker.tsx`. Thay nội dung trả về của map button bằng:

```tsx
return (
  <button
    type="button"
    key={frame.itemId}
    onClick={() => onChange(frame.itemId)}
    aria-pressed={isSelected}
    className={cn(
      "group relative rounded-[var(--r-card)] border bg-[var(--order-card)] p-4 text-left transition-all duration-150",
      isSelected
        ? "border-[var(--order-accent)] ring-2 ring-[var(--order-accent-soft)]"
        : "border-[var(--order-border)] hover:-translate-y-[2px] hover:border-[var(--order-accent)]/60 hover:shadow-sm",
    )}
  >
    {isSelected && (
      <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--order-accent)] text-white shadow-sm">
        <Check className="h-3.5 w-3.5" />
      </span>
    )}
    {frame.thumbnail ? (
      <img
        src={frame.thumbnail}
        alt={frame.label}
        className="mb-3 aspect-[3/4] w-full rounded-[var(--r-card-sm)] object-cover"
        loading="lazy"
      />
    ) : (
      <div
        data-testid="catalog-thumbnail-placeholder"
        aria-hidden="true"
        className="mb-3 aspect-[3/4] w-full rounded-[var(--r-card-sm)] bg-gradient-to-br from-[var(--order-accent-soft)]/40 to-[var(--order-bg)]"
      />
    )}
    <div className="text-base font-semibold">{frame.label}</div>
    {frame.description && (
      <div className="mt-1 text-xs text-[var(--order-text-muted)]">
        {frame.description}
      </div>
    )}
    <div className="mt-2 text-sm font-semibold text-[var(--order-accent)]">
      {formatVnd(frame.priceVnd)}
    </div>
  </button>
);
```

Thêm import `Check`:

```tsx
import { Check } from "lucide-react";
```

- [ ] **Step 2: Run test FrameSizePicker**

Run: `npx vitest run src/features/order/components/FrameSizePicker.test.tsx`
Expected: pass. Nếu test có assert class cũ, mở file test và cập nhật assertion theo behavior (không snapshot dài).

- [ ] **Step 3: Commit**

```bash
rtk git add src/features/order/components/FrameSizePicker.tsx
rtk git commit -m "style(order): warm tone + selected tick for FrameSizePicker" --no-gpg-sign
```

---

## Task 6: Restyle ThemePicker

**Files:**
- Modify: `src/features/order/components/ThemePicker.tsx`

- [ ] **Step 1: Restyle search input và card**

Đọc `src/features/order/components/ThemePicker.tsx`. Thay return body:

```tsx
return (
  <div className="space-y-3">
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--order-text-muted)]" />
      <Input
        placeholder="Tìm chủ đề..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="pl-9"
      />
    </div>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {filtered.map((theme) => {
        const isOn = selected.includes(theme.itemId);
        return (
          <button
            type="button"
            key={theme.itemId}
            onClick={() => toggle(theme.itemId)}
            aria-pressed={isOn}
            className={cn(
              "group relative rounded-[var(--r-card)] border bg-[var(--order-card)] p-3 text-left transition-all duration-150",
              isOn
                ? "border-[var(--order-accent)] ring-2 ring-[var(--order-accent-soft)]"
                : "border-[var(--order-border)] hover:-translate-y-[2px] hover:border-[var(--order-accent)]/60",
            )}
          >
            {isOn && (
              <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--order-accent)] text-white shadow-sm">
                <Check className="h-3 w-3" />
              </span>
            )}
            {theme.thumbnail ? (
              <img
                src={theme.thumbnail}
                alt={theme.label}
                className="mb-2 aspect-square w-full rounded-[var(--r-card-sm)] object-cover"
                loading="lazy"
              />
            ) : (
              <div
                data-testid="catalog-thumbnail-placeholder"
                aria-hidden="true"
                className="mb-2 aspect-square w-full rounded-[var(--r-card-sm)] bg-gradient-to-br from-[var(--order-accent-soft)]/40 to-[var(--order-bg)]"
              />
            )}
            <div className="text-sm font-medium">{theme.label}</div>
            <div className="mt-1 text-xs font-medium text-[var(--order-accent)]">
              {formatVnd(theme.priceVnd)}
            </div>
          </button>
        );
      })}
    </div>
    {selected.length > 0 && (
      <div className="inline-flex items-center gap-1 rounded-full bg-[var(--order-accent-soft)] px-3 py-1 text-xs font-medium text-[var(--order-eyebrow)]">
        Đã chọn {selected.length} set
      </div>
    )}
  </div>
);
```

Thêm imports:

```tsx
import { Check, Search } from "lucide-react";
```

- [ ] **Step 2: Run test ThemePicker**

Run: `npx vitest run src/features/order/components/ThemePicker.test.tsx`
Expected: pass. Cập nhật test nếu assert class cũ.

- [ ] **Step 3: Commit**

```bash
rtk git add src/features/order/components/ThemePicker.tsx
rtk git commit -m "style(order): warm tone + selected tick for ThemePicker" --no-gpg-sign
```

---

## Task 7: Restyle StickerAddon

**Files:**
- Modify: `src/features/order/components/StickerAddon.tsx`

- [ ] **Step 1: Cập nhật class container và placeholder**

Đọc file. Thay:

```tsx
<div className="rounded-[var(--r-card)] border border-[color:var(--border)] bg-card p-4">
```

Thành:

```tsx
<div className="rounded-[var(--r-card)] border border-[var(--order-border)] bg-[var(--order-card)] p-4">
```

Thay placeholder:

```tsx
className="h-14 w-14 shrink-0 rounded-[var(--r-card-sm)] bg-gradient-to-br from-app-accent/10 to-app-accent/5"
```

Thành:

```tsx
className="h-14 w-14 shrink-0 rounded-[var(--r-card-sm)] bg-gradient-to-br from-[var(--order-accent-soft)]/40 to-[var(--order-bg)]"
```

Thay text muted:

```tsx
<div className="text-xs text-muted-foreground">{formatVnd(sticker.priceVnd)} / tờ</div>
```

Thành:

```tsx
<div className="text-xs text-[var(--order-text-muted)]">{formatVnd(sticker.priceVnd)} / tờ</div>
```

Tương tự cập nhật label "Số lượng" và hint "Tối đa N" sang `text-[var(--order-text-muted)]`.

Thay border input number:

```tsx
className="w-20 rounded border border-[color:var(--border)] px-2 py-1 text-sm"
```

Thành:

```tsx
className="w-20 rounded border border-[var(--order-border)] px-2 py-1 text-sm"
```

- [ ] **Step 2: Run test StickerAddon**

Run: `npx vitest run src/features/order/components/StickerAddon.test.tsx`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
rtk git add src/features/order/components/StickerAddon.tsx
rtk git commit -m "style(order): warm tone for StickerAddon" --no-gpg-sign
```

---

## Task 8: Mở rộng OrderSummary với preview block

**Files:**
- Modify: `src/features/order/components/OrderSummary.tsx`
- Modify: `src/features/order/components/OrderSummary.test.tsx`

- [ ] **Step 1: Update test trước**

Mở `src/features/order/components/OrderSummary.test.tsx`. Thay nội dung bằng:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { OrderSummary } from "./OrderSummary";

describe("OrderSummary", () => {
  it("renders lines + total + included items", () => {
    render(
      <OrderSummary
        lines={[
          {
            itemId: "frame:30x40",
            label: "Khung 30×40",
            type: "frame",
            qty: 1,
            unitPriceVnd: 119000,
            lineTotalVnd: 119000,
          },
        ]}
        subtotalVnd={119000}
        shippingVnd={0}
        totalVnd={119000}
        isSubmittable
        onSubmit={() => {}}
        selectedFrame={null}
        selectedThemes={[]}
        selectedSticker={null}
      />,
    );
    expect(screen.getByText(/Khung 30×40/)).toBeInTheDocument();
    expect(screen.getByText(/Tổng tạm tính/)).toBeInTheDocument();
    expect(screen.getByText(/Tờ hướng dẫn SMART Goal/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Đặt đơn/ })).toBeEnabled();
  });

  it("shows missing fields warning when not submittable", () => {
    render(
      <OrderSummary
        lines={[]}
        subtotalVnd={0}
        shippingVnd={0}
        totalVnd={0}
        isSubmittable={false}
        missingFields={["kích thước khung", "địa chỉ"]}
        onSubmit={() => {}}
        selectedFrame={null}
        selectedThemes={[]}
        selectedSticker={null}
      />,
    );
    expect(screen.getByText(/Còn thiếu/)).toHaveTextContent("kích thước khung");
    expect(screen.getByText(/Còn thiếu/)).toHaveTextContent("địa chỉ");
  });

  it("shows preview empty state when no thumbnail-bearing item is selected", () => {
    render(
      <OrderSummary
        lines={[]}
        subtotalVnd={0}
        shippingVnd={0}
        totalVnd={0}
        isSubmittable={false}
        onSubmit={() => {}}
        selectedFrame={null}
        selectedThemes={[]}
        selectedSticker={null}
      />,
    );
    expect(
      screen.getByText(/Chọn khung và set ảnh để xem trước/),
    ).toBeInTheDocument();
  });

  it("renders preview thumbnails when selected items have thumbnails", () => {
    render(
      <OrderSummary
        lines={[]}
        subtotalVnd={0}
        shippingVnd={0}
        totalVnd={0}
        isSubmittable={false}
        onSubmit={() => {}}
        selectedFrame={{
          itemId: "frame:30x40",
          type: "frame",
          label: "Khung 30×40",
          priceVnd: 119000,
          sortOrder: 1,
          isActive: true,
          thumbnail: "/img/frame.png",
        }}
        selectedThemes={[
          {
            itemId: "theme:money",
            type: "theme",
            label: "MONEY",
            priceVnd: 50000,
            sortOrder: 1,
            isActive: true,
            thumbnail: "/img/money.png",
          },
        ]}
        selectedSticker={null}
      />,
    );
    expect(screen.getByAltText("Khung 30×40")).toBeInTheDocument();
    expect(screen.getByAltText("MONEY")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

Run: `npx vitest run src/features/order/components/OrderSummary.test.tsx`
Expected: 4 fail (props mới chưa có, preview block chưa có).

- [ ] **Step 3: Cập nhật OrderSummary**

Thay toàn bộ nội dung `src/features/order/components/OrderSummary.tsx`:

```tsx
import { Package } from "lucide-react";

import { Button } from "@/app/components/ui/button";
import { INCLUDED_DOCS } from "@/features/order/catalog/included";
import type { CatalogItem } from "@/features/order/catalog/types";
import { formatVnd } from "@/features/order/lib/pricing";
import type { OrderLine } from "@/features/order/storage/order";

export interface OrderSummaryProps {
  lines: OrderLine[];
  subtotalVnd: number;
  shippingVnd: number;
  totalVnd: number;
  isSubmittable: boolean;
  isSubmitting?: boolean;
  missingFields?: string[];
  onSubmit: () => void;
  selectedFrame: CatalogItem | null;
  selectedThemes: CatalogItem[];
  selectedSticker: CatalogItem | null;
}

export function OrderSummary({
  lines,
  subtotalVnd,
  shippingVnd,
  totalVnd,
  isSubmittable,
  isSubmitting,
  missingFields = [],
  onSubmit,
  selectedFrame,
  selectedThemes,
  selectedSticker,
}: OrderSummaryProps) {
  const previewFrame = selectedFrame?.thumbnail ? selectedFrame : null;
  const previewThemes = selectedThemes.filter((t) => t.thumbnail);
  const previewSticker = selectedSticker?.thumbnail ? selectedSticker : null;
  const hasPreview = Boolean(
    previewFrame || previewThemes.length > 0 || previewSticker,
  );

  return (
    <aside className="rounded-[var(--r-card)] border border-[var(--order-border)] bg-[var(--order-card)] p-5 shadow-sm">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--order-eyebrow)]">
        Kit của bạn
      </h3>
      <div className="mt-3">
        {!hasPreview ? (
          <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-[var(--r-card-sm)] bg-[var(--order-bg)] text-center">
            <Package className="h-8 w-8 text-[var(--order-accent)]" />
            <p className="px-4 text-xs text-[var(--order-text-muted)]">
              Chọn khung và set ảnh để xem trước
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {previewFrame && (
              <img
                src={previewFrame.thumbnail}
                alt={previewFrame.label}
                className="aspect-[3/4] w-full rounded-[var(--r-card-sm)] object-cover"
                loading="lazy"
              />
            )}
            {previewThemes.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {previewThemes.map((t) => (
                  <img
                    key={t.itemId}
                    src={t.thumbnail}
                    alt={t.label}
                    className="aspect-square w-full rounded-[var(--r-card-sm)] object-cover"
                    loading="lazy"
                  />
                ))}
              </div>
            )}
            {previewSticker && (
              <img
                src={previewSticker.thumbnail}
                alt={previewSticker.label}
                className="h-16 w-16 rounded-[var(--r-card-sm)] object-cover"
                loading="lazy"
              />
            )}
          </div>
        )}
      </div>

      <div className="mt-5 border-t border-[var(--order-border)] pt-4">
        <h3 className="text-base font-semibold">Đơn hàng của bạn</h3>
        <div className="mt-3 space-y-2 text-sm">
          {lines.length === 0 && (
            <p className="text-[var(--order-text-muted)]">Chưa chọn sản phẩm.</p>
          )}
          {lines.map((line) => (
            <div
              key={`${line.itemId}-${line.qty}`}
              className="flex items-start justify-between gap-2"
            >
              <div>
                <div>{line.label}</div>
                {line.qty > 1 && (
                  <div className="text-xs text-[var(--order-text-muted)]">
                    × {line.qty}
                  </div>
                )}
              </div>
              <div className="shrink-0 tabular-nums">
                {formatVnd(line.lineTotalVnd)}
              </div>
            </div>
          ))}
          {INCLUDED_DOCS.map((doc) => (
            <div
              key={doc.id}
              className="flex items-start justify-between gap-2 text-[var(--order-text-muted)]"
            >
              <div>{doc.label}</div>
              <div className="shrink-0">Tặng kèm — 0đ</div>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-1 border-t border-[var(--order-border)] pt-3 text-sm">
          <div className="flex justify-between">
            <span>Tạm tính</span>
            <span className="tabular-nums">{formatVnd(subtotalVnd)}</span>
          </div>
          <div className="flex justify-between text-[var(--order-text-muted)]">
            <span>
              Phí ship
              <span className="ml-1 text-xs">
                (báo sau khi xác nhận địa chỉ)
              </span>
            </span>
            <span className="tabular-nums">
              {shippingVnd === 0 ? "Tính sau" : formatVnd(shippingVnd)}
            </span>
          </div>
          <div className="mt-2 flex justify-between text-lg font-semibold">
            <span>Tổng tạm tính</span>
            <span className="tabular-nums text-[var(--order-accent)]">
              {formatVnd(totalVnd)}
            </span>
          </div>
          <p className="pt-1 text-[11px] text-[var(--order-text-muted)]">
            Tổng đơn cuối cùng = tạm tính + phí ship. Shop sẽ chốt phí ship qua
            email/điện thoại trước khi gửi kit.
          </p>
        </div>
        {!isSubmittable && missingFields.length > 0 && (
          <div className="mt-3 rounded border border-[var(--order-accent)]/30 bg-[var(--order-accent-soft)] px-3 py-2 text-xs text-[var(--order-eyebrow)]">
            Còn thiếu: {missingFields.join(", ")}.
          </div>
        )}
        <Button
          type="button"
          className="mt-4 w-full bg-[var(--order-accent)] text-white shadow-sm transition-all hover:-translate-y-[1px] hover:bg-[var(--order-accent)]/90 hover:shadow-md"
          disabled={isSubmitting}
          onClick={onSubmit}
        >
          {isSubmitting ? "Đang gửi..." : `Đặt đơn — ${formatVnd(totalVnd)}`}
        </Button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 4: Run test, expect PASS**

Run: `npx vitest run src/features/order/components/OrderSummary.test.tsx`
Expected: 4 pass.

- [ ] **Step 5: Commit**

```bash
rtk git add src/features/order/components/OrderSummary.tsx src/features/order/components/OrderSummary.test.tsx
rtk git commit -m "feat(order): add kit preview block to OrderSummary" --no-gpg-sign
```

---

## Task 9: Restructure OrderPage với hero + progress bar + step cards

**Files:**
- Modify: `src/features/order/pages/OrderPage.tsx`

- [ ] **Step 1: Đọc lại file hiện tại**

Đọc `src/features/order/pages/OrderPage.tsx` để lấy state + handler chính xác (giữ nguyên 100% logic).

- [ ] **Step 2: Thay nội dung file**

Giữ toàn bộ phần state, useMemo, handler, validate logic. Chỉ thay phần JSX `return (...)` từ dòng `return (` đến `);` cuối hàm `OrderPage` bằng:

```tsx
const completedSteps: number[] = [];
if (draft.frameItemId) completedSteps.push(1);
if (draft.themeItemIds.length > 0) completedSteps.push(2);
completedSteps.push(3); // sticker optional, luôn done
const shippingFieldsOk = !(["fullName","email","phone","shippingAddress"] as const).some(
  (k) => !validation.ok && validation.errors[k],
);
if (shippingFieldsOk && shipping.fullName && shipping.email && shipping.phone && shipping.shippingAddress) {
  completedSteps.push(4);
}
completedSteps.push(5); // notes optional

const currentStep =
  [1, 2, 3, 4, 5].find((s) => !completedSteps.includes(s)) ?? 5;

const selectedFrame = frames.find((f) => f.itemId === draft.frameItemId) ?? null;
const selectedThemes = themes.filter((t) => draft.themeItemIds.includes(t.itemId));
const selectedSticker = draft.stickerSelection
  ? sticker
  : null;

function scrollToStep(step: number) {
  const el = document.getElementById(`step-${step}`);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function statusFor(step: number): "pending" | "current" | "done" {
  if (completedSteps.includes(step) && step !== currentStep) return "done";
  if (step === currentStep) return "current";
  return "pending";
}

return (
  <div className="order-page bg-[var(--order-bg)]">
    <div className="mx-auto max-w-6xl px-4 py-6">
      <OrderHero />

      <OrderProgressBar
        currentStep={currentStep}
        completedSteps={completedSteps.filter((s) => s !== currentStep)}
        onStepClick={scrollToStep}
      />

      {isFromFallback && (
        <div className="mb-4 rounded border border-[var(--order-accent)]/40 bg-[var(--order-accent-soft)] px-3 py-2 text-xs text-[var(--order-eyebrow)]">
          Đang dùng giá đã lưu — vui lòng kiểm tra lại trước khi đặt.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5 pb-28 lg:pb-0">
          <StepCard
            step={1}
            id="step-1"
            title="Chọn kích thước khung"
            status={statusFor(1)}
            hint={selectedFrame ? selectedFrame.label : undefined}
            errorText={
              shouldShowError("frame") && !validation.ok
                ? validation.errors.frame
                : undefined
            }
          >
            {isLoading ? (
              <Skeleton />
            ) : (
              <FrameSizePicker
                frames={frames}
                selected={draft.frameItemId}
                onChange={(id) => {
                  setDraft((d) => ({ ...d, frameItemId: id }));
                  markTouched("frame");
                }}
              />
            )}
          </StepCard>

          <StepCard
            step={2}
            id="step-2"
            title="Chọn set ảnh chủ đề"
            status={statusFor(2)}
            hint={
              draft.themeItemIds.length > 0
                ? `đã chọn ${draft.themeItemIds.length} set`
                : undefined
            }
            errorText={
              shouldShowError("themes") && !validation.ok
                ? validation.errors.themes
                : undefined
            }
          >
            {isLoading ? (
              <Skeleton />
            ) : (
              <ThemePicker
                themes={themes}
                selected={draft.themeItemIds}
                onChange={(ids) => {
                  setDraft((d) => ({ ...d, themeItemIds: ids }));
                  markTouched("themes");
                }}
              />
            )}
          </StepCard>

          <StepCard
            step={3}
            id="step-3"
            title="Sticker (tuỳ chọn)"
            status={statusFor(3)}
            hint={draft.stickerSelection ? "đã thêm" : undefined}
          >
            <StickerAddon
              sticker={sticker}
              value={draft.stickerSelection}
              onChange={(v) => setDraft((d) => ({ ...d, stickerSelection: v }))}
            />
          </StepCard>

          <StepCard
            step={4}
            id="step-4"
            title="Thông tin giao hàng"
            status={statusFor(4)}
          >
            <ShippingForm
              value={shipping}
              onChange={(next) => {
                setShipping(next);
                if (next.fullName !== shipping.fullName) markTouched("fullName");
                if (next.email !== shipping.email) markTouched("email");
                if (next.phone !== shipping.phone) markTouched("phone");
                if (next.shippingAddress !== shipping.shippingAddress)
                  markTouched("shippingAddress");
              }}
              errors={visibleShippingErrors}
            />
          </StepCard>

          <StepCard
            step={5}
            id="step-5"
            title="Ghi chú"
            status={statusFor(5)}
          >
            <NotesField value={notes} onChange={setNotes} />
          </StepCard>
        </div>

        <div className="hidden lg:block lg:sticky lg:top-24 lg:self-start">
          <OrderSummary
            lines={lines}
            subtotalVnd={subtotal}
            shippingVnd={shippingCost}
            totalVnd={total}
            isSubmittable={validation.ok}
            isSubmitting={submitting}
            missingFields={missingFields}
            onSubmit={handleSubmit}
            selectedFrame={selectedFrame}
            selectedThemes={selectedThemes}
            selectedSticker={selectedSticker}
          />
          {submitError && (
            <p className="mt-2 text-xs text-destructive">{submitError}</p>
          )}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--order-border)] bg-[var(--order-bg)]/95 px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.04)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] uppercase tracking-wide text-[var(--order-text-muted)]">
              Tổng đơn
            </div>
            <div className="truncate text-base font-semibold tabular-nums text-[var(--order-accent)]">
              {formatVnd(total)}
            </div>
            {!validation.ok && missingFields.length > 0 && (
              <div className="truncate text-[11px] text-[var(--order-text-muted)]">
                Còn thiếu: {missingFields.slice(0, 2).join(", ")}
                {missingFields.length > 2
                  ? `, +${missingFields.length - 2}`
                  : ""}
              </div>
            )}
          </div>
          <Button
            type="button"
            className="shrink-0 bg-[var(--order-accent)] text-white hover:bg-[var(--order-accent)]/90"
            disabled={submitting}
            onClick={handleSubmit}
          >
            {submitting
              ? "Đang gửi..."
              : validation.ok
                ? "Đặt đơn"
                : "Kiểm tra lại"}
          </Button>
        </div>
        {submitError && (
          <p className="mx-auto mt-1 max-w-6xl text-xs text-destructive">
            {submitError}
          </p>
        )}
      </div>
    </div>
  </div>
);
```

Cập nhật imports phía trên file:

```tsx
import { OrderHero } from "../components/OrderHero";
import { OrderProgressBar } from "../components/OrderProgressBar";
import { StepCard } from "../components/StepCard";
```

Xoá import `IncludedItemsCard` (không còn dùng).

Cập nhật `Skeleton` để dùng tone mới:

```tsx
function Skeleton() {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="h-20 animate-pulse rounded bg-[var(--order-border)]" />
      <div className="h-20 animate-pulse rounded bg-[var(--order-border)]" />
      <div className="h-20 animate-pulse rounded bg-[var(--order-border)]" />
    </div>
  );
}
```

- [ ] **Step 3: Run test OrderPage**

Run: `npx vitest run src/features/order/pages/OrderPage.test.tsx`
Expected: pass. Test hiện tại không assert progress bar nên vẫn pass.

- [ ] **Step 4: Typecheck + lint**

Run: `npm run typecheck`
Expected: pass.

Run: `npm run lint`
Expected: pass, không warning mới.

Nếu có warning import unused (`IncludedItemsCard`), xoá import đó.

- [ ] **Step 5: Commit**

```bash
rtk git add src/features/order/pages/OrderPage.tsx
rtk git commit -m "feat(order): restructure page with hero + progress bar + step cards" --no-gpg-sign
```

---

## Task 10: Xoá IncludedItemsCard nếu không còn nơi dùng

**Files:**
- Delete: `src/features/order/components/IncludedItemsCard.tsx` (có điều kiện)

- [ ] **Step 1: Grep xác nhận chỉ OrderPage dùng**

Run: search `IncludedItemsCard` trong toàn bộ `src/`.

```bash
rtk grep "IncludedItemsCard" src/
```

Expected: chỉ xuất hiện trong `IncludedItemsCard.tsx` (file định nghĩa) — không còn import nào khác.

- [ ] **Step 2: Xoá file**

Nếu confirm không còn nơi dùng:

```bash
rm "src/features/order/components/IncludedItemsCard.tsx"
```

Nếu vẫn còn nơi dùng khác → bỏ qua task này, để file lại.

- [ ] **Step 3: Build check**

Run: `npm run build`
Expected: pass.

- [ ] **Step 4: Commit**

```bash
rtk git add -A src/features/order/components/IncludedItemsCard.tsx
rtk git commit -m "chore(order): remove unused IncludedItemsCard" --no-gpg-sign
```

---

## Task 11: Verification cuối + manual check

- [ ] **Step 1: Full check**

Run: `npm run check`
Expected: typecheck + lint + test:run + build đều pass.

- [ ] **Step 2: Dev server**

Run: `npm run dev` (background) và mở `/order` ở browser.

Verify thủ công:
- Header cream với "VISION BOARD KIT" eyebrow + h1 + box "Bao gồm sẵn" bên phải.
- Progress bar sticky 5 segment, click segment → smooth scroll tới step tương ứng.
- Mỗi step card có bubble số + status hint.
- Chọn frame → bubble step 1 đổi sang tick peach, status text đổi.
- Chọn theme → preview cột phải hiện thumbnail.
- Chưa chọn gì có thumbnail → preview hiện empty state với icon Package.
- Hover thẻ frame/theme → có lift -2px + border peach.
- Selected frame/theme → ring peach + tick peach góc trên phải.
- Submit invalid → "Còn thiếu" hiện trong summary box peach.
- Mobile (resize 375): progress bar thu thành "Bước X/5", sticky bottom bar peach.

- [ ] **Step 3: Snapshot artifacts (optional)**

Nếu có thời gian:
- Chụp ảnh `/order` ở 1280, 768, 375 lưu vào `qa-artifacts/order-redesign-*.png` để compare visually.

Nếu pipeline `npm run qa:visual-ux-ui` chạy được, run nó.

- [ ] **Step 4: Final commit nếu có thay đổi nhỏ**

Nếu lúc verify thủ công phát hiện bug nhỏ (vd ảnh sai aspect, padding lệch), fix ngay và commit:

```bash
rtk git add -A
rtk git commit -m "fix(order): tune <thing>" --no-gpg-sign
```

---

## Self-Review Checklist

- [x] Spec coverage:
  - §4 Tokens → Task 1
  - §5 Layout → Task 9
  - §6.1 OrderPage → Task 9
  - §6.2 OrderHero → Task 4
  - §6.3 OrderProgressBar → Task 2
  - §6.4 StepCard → Task 3
  - §6.5 FrameSizePicker → Task 5
  - §6.6 ThemePicker → Task 6
  - §6.7 StickerAddon → Task 7
  - §6.8 IncludedItemsCard remove → Task 10
  - §6.9 OrderSummary preview → Task 8
  - §6.10 Skeleton + banner → Task 9 (Skeleton inline + banner trong return)
  - §8 Behavior parity → giữ nguyên state/handler trong Task 9
  - §9 Testing → tests trong Task 2, 5, 6, 7, 8
  - §10 Verification → Task 11

- [x] No placeholder text — mọi step có code/command cụ thể.

- [x] Type consistency — props `OrderSummaryProps` mở rộng đúng tên (`selectedFrame`, `selectedThemes`, `selectedSticker`) match Task 8 và Task 9.

- [x] Animation theo spec (subtle): Task 5/6 có hover lift -2px + transition 150ms, không page-level.

- [x] Không thêm dependency — chỉ Lucide icons (`Check`, `Search`, `Package`, `BookOpen`, `Calendar`, `Sparkles`) đã có sẵn.
