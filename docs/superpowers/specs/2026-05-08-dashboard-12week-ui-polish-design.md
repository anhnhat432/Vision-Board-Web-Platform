# Dashboard & 12-Week System UI Polish

**Date:** 2026-05-08
**Approach:** Polish & Harmonize (Hướng A)
**Scope:** Dashboard page + 12-Week System page (light mode only)
**Goal:** Chuẩn hóa spacing, radius, padding, shadow, visual hierarchy cho nhất quán và chuyên nghiệp hơn, giữ nguyên logic và design language hiện tại.

---

## 1. Design Token Standardization

Chuẩn hóa các giá trị đang dùng không nhất quán thành hệ thống rõ ràng. Không thay đổi CSS variables hay theme.css — chỉ chuẩn hóa Tailwind classes trong JSX.

### Border Radius

| Cấp | Class | Dùng cho |
|-----|-------|----------|
| Container | `rounded-2xl` (16px) | Card, panel, section wrapper |
| Element | `rounded-xl` (12px) | Badge group, button group, input, nested box, icon container |

Thay thế tất cả `rounded-[18px]`, `rounded-[22px]`, `rounded-[24px]`, `rounded-[26px]`, `rounded-[28px]` thành `rounded-2xl` hoặc `rounded-xl` tùy ngữ cảnh.

### Section Spacing

| Cấp | Class | Dùng cho |
|-----|-------|----------|
| Section gap | `gap-8` / `space-y-8` (32px) | Giữa các section lớn trên page |
| Card gap | `gap-5` / `space-y-5` (20px) | Giữa card trong cùng section |
| Inner gap | `gap-3` / `space-y-3` (12px) | Giữa elements bên trong card |

Thay thế `gap-4`, `gap-6`, `space-y-4`, `space-y-6` ở cấp section/card thành giá trị chuẩn tương ứng.

### Card Padding

| Loại | Class |
|------|-------|
| Card chính | `p-5 sm:p-6` |
| Nested box/panel | `p-4` |

Thay thế `p-4 sm:p-5`, `p-4 sm:p-5 lg:p-6`, `p-5` không nhất quán.

### Card Shadow

| Cấp | Class | Dùng cho |
|-----|-------|----------|
| Standard | `shadow-sm` | Card thường, info card, form card |
| Hero/highlight | Giữ custom shadow hiện tại | Primary action card, gradient stat card |

Thay thế `shadow-[0_18px_44px_-36px_rgba(15,23,42,0.3)]` và tương tự trên card thường thành `shadow-sm`.

---

## 2. Dashboard Improvements

### 2.1 Hero Section

**File:** `src/app/pages/Dashboard.tsx`

- Primary action card: `border-2` → `border`, padding chuẩn `p-5 sm:p-6`, radius `rounded-2xl`
- Attention panels: shadow nặng → `shadow-sm`, giới hạn hiển thị tối đa 2 panel
- Setup guide card: chuẩn hóa padding/radius theo token

### 2.2 Stats Overview (4 KPI cards)

- Typography: tất cả metric number → `text-2xl font-bold` (loại bỏ mix text-base/text-3xl)
- Icon container: chuẩn `size-9 rounded-xl` cho tất cả
- Card: `rounded-2xl p-5 sm:p-6 shadow-sm`
- Grid: giữ `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`

### 2.3 Quick Actions (3 button)

- Bỏ numbered badge (số 1, 2, 3), giữ icon + text + arrow
- Hover: `hover:border-slate-300 hover:shadow-sm` (bỏ shadow phức tạp `shadow-[0_14px_28px_-20px_...]`)
- Radius: `rounded-2xl`

### 2.4 Performance Dashboard (3 gradient cards)

- Giữ gradient colors đặc trưng, giảm gradient opacity (thêm `/50` hoặc `/40` cho `to-` color)
- Padding chuẩn `p-5 sm:p-6`
- Grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3` (thêm `lg:` breakpoint)

### 2.5 Analytics Section

- Thay `<details>` bằng `<SectionBlock>` collapsible cho nhất quán với phần còn lại
- Grid giữ nguyên `xl:grid-cols-[1.25fr_0.75fr]`
- Card padding/radius chuẩn hóa

---

## 3. 12-Week System Improvements

### 3.1 Header (TwelveWeekDashboardHeader)

**File:** `src/features/plan12week/pages/12WeekSystem.tsx`

- Badge density: giữ tối đa 2 badge chính (week number + sync status) trên mobile, badge còn lại ẩn `hidden sm:inline-flex`
- KPI cards bên phải: padding/radius theo token
- Title: thêm `line-clamp-2` cho goal name dài

### 3.2 Today Tab

**File:** `src/app/components/twelve-week/TwelveWeekTodayTab.tsx` (hoặc tương đương)

- Primary task hero: `border-2` → `border`, giữ violet glow nhưng giảm spread value
- Task row: chuẩn `rounded-xl p-4 gap-3`
- Overdue indicator: thay full amber background thành `border-l-3 border-amber-400 bg-amber-50/40` (subtle hơn)
- DailyCheckIn panel: padding chuẩn, mood button cùng size
- Grid: `lg:grid-cols-[1.12fr_380px] gap-6`

### 3.3 Week Tab

**File:** `src/app/components/twelve-week/TwelveWeekWeekTab.tsx` (hoặc tương đương)

- 3 summary cards: thêm `min-h-[120px]` cho đều height, typography nhất quán
- Tactics inner cards: radius `rounded-xl`
- Review form: `space-y-4` thống nhất, textarea `min-h-[80px]`
- Grid: giữ `lg:grid-cols-[1fr_420px] gap-6`

### 3.4 Progress Tab

**File:** `src/app/components/twelve-week/TwelveWeekProgressTab.tsx` (hoặc tương đương)

- Trend hero: padding/radius chuẩn
- Scoreboard grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` (thêm `lg:`)
- Week cards: `rounded-xl p-4`, progress bar height nhất quán
- Milestones: `space-y-3` giữa items

---

## 4. Out of Scope

- Business logic, routing, state management
- Base `ui/` component API (Button, Card, Dialog variants)
- Dark mode
- Trang khác (Onboarding, Settings, Billing, Vision Board, etc.)
- Animation/motion mới
- Font family, color palette gốc trong theme.css
- Component structure refactor (tách file, rename export)

---

## 5. Verification Plan

1. `npm run typecheck` — Không có type error (chỉ sửa className strings)
2. `npm run lint` — Pass lint
3. `npm run build` — Build thành công
4. Manual check: Dashboard layout trên desktop (1280px+) và mobile (375px)
5. Manual check: 12-Week System 4 tab trên desktop và mobile

---

## 6. Risk Assessment

**Rủi ro thấp:**
- Chỉ thay đổi Tailwind class strings trong JSX
- Không sửa logic, state, API calls
- Design system gốc (CSS variables, CVA) giữ nguyên
- Typecheck sẽ catch nếu có breaking change

**Rủi ro tiềm ẩn:**
- Một số custom shadow/radius có thể là intentional cho specific card → review từng case trước khi thay
- Gradient card opacity thay đổi có thể khác expectation → kiểm tra visual sau khi sửa
