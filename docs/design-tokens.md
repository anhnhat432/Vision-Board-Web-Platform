# Design tokens

Vision Board dùng token nền cho cảm giác tĩnh tại, có chỗ thở. Token này là lớp nền cho UI mới; không bắt buộc đổi các màn hình hiện tại ngay lập tức.

## Màu

| Token | Hex | Ý nghĩa | Khi dùng |
| --- | --- | --- | --- |
| `app-bg` | `#FAF8F5` | Nền chính ấm, không chói | Page background, shell nền lớn |
| `app-surface` | `#FFFFFF` | Bề mặt nội dung | Card, panel, sheet |
| `app-ink` | `#1A1A1A` | Chữ chính | Heading, body quan trọng |
| `app-ink-soft` | `#4A4A4A` | Chữ phụ | Mô tả, subheading, metadata quan trọng |
| `app-ink-muted` | `#8A8A8A` | Chữ nhẹ | Caption, helper text, placeholder |
| `app-line` | `#ECE8E1` | Đường chia mềm | Border, divider, input outline |
| `app-accent` | `#2F5D50` | Hành động chính | Primary button, focus, progress, trạng thái đang làm |
| `app-accent-soft` | `#E8F0EC` | Nền xanh nhẹ | Pill, hover, selected background liên quan action/progress |
| `app-warm` | `#D97757` | Sắc ấm phản tư | Reflection, prompt cuối ngày/tuần |
| `app-warm-soft` | `#FCEDE5` | Nền ấm nhẹ | Reflection card, prompt background |

## Accent vs warm

- Dùng `app-accent` cho hành động, tiến độ, focus ring, trạng thái đang làm.
- Dùng `app-warm` chỉ trong Reflection và các prompt phản tư cuối ngày/tuần.
- Không trộn `app-accent` và `app-warm` trong cùng một component.
- Nếu component vừa có action vừa có reflection, tách thành hai vùng/component riêng.

## Font

- UI mặc định: `font-sans` -> Inter 400/500/600.
- Câu hỏi phản tư và heading lớn có tính reflective: `font-serif` -> Source Serif 4 Variable weight 500.
- Body text, form, nav, button, metadata: dùng `font-sans`.
- Serif chỉ nên dùng có chủ đích, không dùng cho toàn app.

## Radius và spacing

- Card: `rounded-card`, border `1px solid var(--app-line)`.
- Pill/tag: `rounded-full`.
- Khoảng cách section lớn: `20px` trên mobile, `24px` trên desktop.
- Padding card: `20px` trên mobile, `24px` trên desktop.

## Ví dụ

Button chính:

```tsx
<button className="rounded-full bg-app-accent px-4 py-2 font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30">
  Tiếp tục
</button>
```

Card:

```tsx
<section className="rounded-card border border-app-line bg-app-surface p-5 text-app-ink md:p-6">
  <h2 className="font-semibold">Kế hoạch 12 tuần</h2>
  <p className="mt-2 text-sm text-app-ink-soft">Chọn việc quan trọng nhất cho tuần này.</p>
</section>
```

Pill:

```tsx
<span className="rounded-full bg-app-accent-soft px-3 py-1 text-sm font-medium text-app-accent">
  Đang làm
</span>
```

Reflection prompt:

```tsx
<aside className="rounded-card border border-app-line bg-app-warm-soft p-5 text-app-ink md:p-6">
  <p className="font-serif text-xl font-medium text-app-warm">Hôm nay điều gì làm bạn thấy nhẹ hơn?</p>
</aside>
```
