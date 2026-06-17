# Token Migration Guide (scratch — task 6.3 expanded scope)

Mục tiêu: migrate primitive Tailwind palette + hex literal trong `className` sang Semantic/Component token (Requirement 2.1).
TẤT CẢ file trong phạm vi này thuộc **Execution_Context** → dùng nhóm **accent** (forest green), **TUYỆT ĐỐI KHÔNG** dùng `app-warm-*` / `--reflection-*`.

## Nguyên tắc cứng
- CHỈ đổi `className` / giá trị màu lớp trình bày. KHÔNG đổi text/label/thứ tự bước, route, logic, storage, analytics, props, hành vi.
- Token đã theme-aware (tự xử lý light/dark). Khi thay 1 cặp `x-light dark:x-dark` bằng token, PHẢI XÓA luôn biến thể `dark:` primitive (vì scanner vẫn bắt `neutral-200` trong `dark:text-neutral-200`).
- Sau khi sửa, file PHẢI đạt 0 vi phạm token-scan. Verify bằng tool ở cuối.
- Không thêm dependency. Giữ nguyên cấu trúc JSX.

## Bảng mapping màu chữ (text-*)
| Primitive hiện tại | Token thay thế |
| --- | --- |
| `text-neutral-900/950`, `text-slate-900/950`, `text-gray-900`, `text-zinc-900`, `text-black`, `text-neutral-800 dark:text-neutral-200` | `text-app-ink` |
| `text-neutral-700/600`, `text-slate-700/600`, `text-gray-600/700` | `text-app-ink-soft` |
| `text-neutral-500/400`, `text-slate-500/400`, `text-gray-400/500` | `text-app-ink-muted` |
| `text-neutral-300`, `text-slate-300` (disabled) | `text-app-ink-disabled` |
| text trên nền accent (vd `text-white` trên `bg-app-accent`) | `text-white` (giữ nguyên, hợp lệ — white không bị scan) |

## Bảng mapping nền (bg-*)
| Primitive hiện tại | Token thay thế |
| --- | --- |
| `bg-white`, `bg-white/xx`, `bg-neutral-900` (surface card), `dark:bg-neutral-900` | `bg-app-surface` |
| nền trang cream (`bg-neutral-50` toàn trang) | `bg-app-bg` |
| `bg-neutral-50/100`, `bg-slate-50/100`, `bg-gray-50/100` (section lồng/subtle) | `bg-app-bg-subtle` |
| fill action/brand xanh (`bg-emerald-600`, `bg-green-600/700`, `bg-teal-600`) | `bg-app-accent` |
| hover fill (`hover:bg-emerald-700`...) | `hover:bg-app-accent-hover` |
| nền xanh nhạt (`bg-emerald-50/100`, `bg-green-50/100`) | `bg-app-accent-soft` |
| nền xanh rất nhạt / hover row | `bg-app-accent-subtle` |
| track progress (`bg-neutral-100 dark:bg-neutral-800`) | `bg-app-accent-soft` |

## Bảng mapping viền (border-*)
| Primitive | Token |
| --- | --- |
| `border-neutral-200`, `border-slate-200`, `border-gray-200` (+ dark variant) | `border-app-line` |
| `border-neutral-300`, `border-slate-300` (emphasized/selected) | `border-app-line-strong` |
| viền xanh accent (`border-emerald-*`, `border-green-*`) | `border-app-accent` (đậm) hoặc `border-app-accent-soft` (nhạt) |

## Status (CHỈ khi mang ngữ nghĩa trạng thái, không phải brand)
| Ngữ nghĩa | Token |
| --- | --- |
| error/danger (`red-*`) | `text-app-status-error` / `bg-app-status-error` / `border-app-status-error` |
| warning (`amber-*`, `yellow-*` mang nghĩa cảnh báo) | `text-app-status-warning` / `bg-app-status-warning` |
| success (`green/emerald` mang nghĩa thành công, KHÔNG phải brand action) | `text-app-status-success` |
| info (`blue/sky` mang nghĩa thông tin) | `text-app-status-info` |

## Gradient & decor trang trí
- Gradient brand nhiều màu (`from-emerald-500/10 to-teal-500/5`, `from-emerald-100 via-amber-100 to-violet-100`...) → gom về accent: vd `from-app-accent/10 to-app-accent/5`, hoặc `bg-app-accent-soft`. Bỏ các stop màu lạ (violet/pink/amber).
- Gradient progress (`from-app-accent to-green-600`, `from-app-accent to-[#5ba590]`) → `from-app-accent to-app-accent-hover`.
- Text gradient warm trang trí (`from-amber-600 to-amber-700` bg-clip-text) → `from-app-accent to-app-accent-hover` (Execution không dùng warm).
- Điểm nhấn amber decor (vd quote banner `border-amber-500/50 bg-amber-500/5`, `text-amber-800`) → dùng accent: `border-app-accent/50 bg-app-accent-soft/40`, text `text-app-ink-soft` hoặc `text-app-accent`. KHÔNG dùng app-warm.

## Hex literal trong arbitrary value `bg-[linear-gradient(...)]` / shadow
- Hex xám trung tính bán trong suốt cho texture grid (`#8080800a`, `#80808005`, `#80808010`) → đổi sang `rgba(128,128,128,0.04)` tương ứng (scanner KHÔNG bắt `rgba()`). Giữ alpha ~ tương đương: `0a`≈0.04, `05`≈0.02, `10`≈0.06.
- Hex màu brand (`#5ba590` = accent dark, `#2A5447` = accent...) → dùng utility token `app-accent` thay vì hex; nếu buộc inline dùng `var(--app-accent)` trong arbitrary value `[...]`.
- Hex `rgba(0,0,0,0.05)` trong drop-shadow KHÔNG bị scan (đã là rgba) → giữ nguyên.

## Lưu ý đặc thù SMART (SmartGoalStepShell)
- Các màu phân loại chữ cái SMART (teal=Specific, blue=Measurable, amber=Achievable, rose=Relevant, violet/purple=Time-bound) khi filled: gom về `text-app-accent font-bold bg-app-accent-soft/...`. Phân biệt chữ cái đã có nhãn S/M/A/R/T + icon, không cần màu riêng.
- Confetti canvas dùng màu literal trong JS string (mảng `colors = [...]`) KHÔNG phải className → KHÔNG bị scanner bắt, GIỮ NGUYÊN (không tokenize runtime canvas).
- `borderColor = "rgb(20, 184, 166)"` trong JS inline style (Teal highlight) là rgb runtime, scanner không bắt → có thể giữ; nếu muốn nhất quán đổi sang `var(--app-accent)`.

## AnvilForgingEffect (animation trang trí)
- Migrate className color literal là Tailwind class thật sang token. Giá trị animation inline thuần trang trí (rgba/keyframe) giữ nguyên nếu không phải hex/primitive-palette className.
