# P1-10 — App Navigation Polish (Header, Sidebar, Bottom Nav, Breadcrumbs)

## Mục tiêu

Tinh chỉnh navigation toàn app: header public, sidebar app sau login, bottom nav mobile, breadcrumb. Mục tiêu: nhịp nhất quán, active state rõ, mobile reachable, calm.

## Context dự án

- Có `src/app/components/RootLayout.tsx` (đã đọc, chứa header/footer wrapper).
- Có `src/app/components/layout/AppPublicFooter.tsx`.
- Có thể có sidebar / bottom-nav riêng — kiểm tra trong `src/app/components/layout/`.
- React-router v6 — dùng `<NavLink>` cho active state.

## Scope file

- `src/app/components/layout/AppHeader.tsx` hoặc tương đương — public + auth header.
- `src/app/components/layout/AppSidebar.tsx` hoặc `Sidebar.tsx` (nếu có).
- `src/app/components/layout/BottomNavigation.tsx` (nếu có).
- `src/app/components/RootLayout.tsx`.
- `src/app/components/ui/breadcrumb.tsx` (chỉ verify pattern).

KHÔNG sửa: route definition, auth guard.

## Yêu cầu kỹ thuật

### 1. Public header

- Sticky top: `sticky top-0 z-sticky bg-app-bg/80 backdrop-blur-sm border-b border-app-line/60`.
- Height 64px.
- Container `max-w-6xl mx-auto px-4 sm:px-6 lg:px-8`.
- Trái: logo + brand name.
- Phải desktop: nav link (Tính năng, Gói, FAQ) + 2 CTA (Đăng nhập outline / Bắt đầu primary).
- Phải mobile: hamburger menu → sheet sidebar.

Nav link state:
- Idle: `text-app-ink-soft`.
- Hover: `text-app-ink`.
- Active (`NavLink` matched): `text-app-accent font-medium`.
- Focus-visible: ring.

### 2. App header (sau login)

- Sticky top giống public.
- Trái: logo nhỏ + page title (dynamic per route).
- Phải: search button (icon) + notification (nếu có) + avatar dropdown.
- Avatar dropdown: Settings / Đăng xuất.

### 3. Sidebar (desktop ≥ 1024px)

- Width 240px, fixed-left.
- Background `bg-app-surface border-r border-app-line`.
- Section: Hôm nay / Tuần / Kế hoạch / Mục tiêu / Vision Board / Nhật ký / Tiến độ / Thành tựu / Cài đặt.
- Mỗi item: icon (lucide) 18px + label `text-sm`.
- Active: `bg-app-accent-soft text-app-accent`, có left-border `border-l-2 border-app-accent`.
- Hover: `bg-app-ink/5`.
- Padding item: `px-3 py-2`, gap-2.

### 4. Bottom navigation (mobile < 768px)

- Fixed bottom: `fixed bottom-0 left-0 right-0 z-bottom-nav`.
- Background `bg-app-surface border-t border-app-line` + safe-area inset.
- 5 item: Today / Plan / Progress / Journal / More.
- Mỗi item: icon 22px + label `text-xs`.
- Active: icon + label color `text-app-accent`.
- Idle: `text-app-ink-muted`.
- Tap target ≥ 48px tall.
- Content phải `pb-20` (80px) khi có bottom nav.

### 5. Breadcrumb

Chỉ dùng khi route depth ≥ 3 (ví dụ `/billing/plan/checkout`):

- Separator: `<ChevronRight className="size-3.5 text-app-ink-muted" />`.
- Link: `text-sm text-app-ink-soft hover:text-app-ink`.
- Current page: `text-app-ink font-medium` không-link.

### 6. Mobile sheet (hamburger menu)

- Slide từ trái, width 280px.
- Header sheet: logo + close button.
- Nav items đồng bộ sidebar desktop.
- Footer sheet: theme toggle + logout (nếu auth).
- Overlay: `bg-app-ink/40 backdrop-blur-sm`.

### 7. Page title dynamic

- Header app hiển thị title theo route.
- Dùng `document.title` + visual title trong header.
- Format: `<Page Title> · Dear Our Future`.

## Acceptance Criteria

- [ ] Header public sticky, blur background, đúng height 64px.
- [ ] Sidebar desktop có active state rõ với left-border accent.
- [ ] Bottom nav mobile 5 item, touch target ≥ 48px, content padding-bottom đủ.
- [ ] Breadcrumb chỉ hiện ở depth ≥ 3.
- [ ] Mobile hamburger → sheet trượt mượt (≤ 360ms ease standard).
- [ ] NavLink active đúng cho mọi route trong scope.
- [ ] Light + dark mode đều ổn.
- [ ] Lighthouse a11y `/dashboard` ≥ 95 (sidebar không break).
- [ ] Keyboard tab xuyên nav không kẹt.

## Verification

```bash
npm run typecheck
npm run lint
npm run test:run
npm run build
```

Manual:

1. `/` desktop 1440px → header có sticky, blur, nav link đúng active.
2. `/billing/plan` → Active "Gói" trong header.
3. Login → `/dashboard` → sidebar bên trái, active "Hôm nay" nếu đúng route.
4. Resize 768px → sidebar ẩn, bottom nav hiện.
5. Hamburger menu → sheet trượt, focus trap đúng.
6. Tab keyboard → đi qua nav theo thứ tự.
7. Dark mode → tất cả nav state rõ.
8. iPhone safe-area (DevTools device) → bottom nav không bị che.

## Không làm

- KHÔNG đổi route path.
- KHÔNG thêm nav item mới (giữ flat structure hiện có).
- KHÔNG dùng mega-menu.
- KHÔNG dropdown trong bottom nav (mobile chỉ tap).
- KHÔNG animation lớn (parallax / blur transition).
- KHÔNG hide-on-scroll header (giữ sticky luôn).

## Ghi chú khi trả kết quả

- File đã sửa.
- Screenshot header / sidebar / bottom nav (light + dark, desktop + mobile).
- Active state demo.
- Risk còn lại.
