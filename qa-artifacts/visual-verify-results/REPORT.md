# Báo Cáo Kiểm Tra Trực Quan – Vision Board Web Platform

**Ngày:** 2026-06-18 17:29 (UTC+7)  
**URL kiểm tra:** `http://localhost:5173`  
**Công cụ:** Playwright 1.59.1 (Chromium, headless)  
**Chế độ:** Chỉ đọc – không sửa code

---

## 1. Tổng Quan

| Chỉ số                      | Giá trị |
| --------------------------- | ------- |
| Tổng số trang kiểm tra      | 13      |
| Trang thành công (HTTP 200) | 13      |
| Trang thất bại              | 0       |
| Trang bị redirect           | 0       |
| Trang có console error      | 1       |
| Tổng vấn đề phát hiện       | 11      |
| P1 – Nghiêm trọng           | 0       |
| P2 – Trung bình             | 4       |
| P3 – Nhẹ                    | 7       |

---

## 2. Bản Đồ Routes – Yêu Cầu vs Thực Tế

| #   | Route yêu cầu        | Route thực tế                                     | Trạng thái | Ghi chú                                         |
| --- | -------------------- | ------------------------------------------------- | ---------- | ----------------------------------------------- |
| 1   | `/`                  | `/`                                               | ✅ 200     | Dashboard (Trang chủ)                           |
| 2   | `/life-balance`      | `/life-balance`                                   | ✅ 200     | Khớp                                            |
| 3   | `/life-insight`      | `/life-insight`                                   | ✅ 200     | Khớp                                            |
| 4   | `/smart-goal`        | `/smart-goal-setup`                               | ✅ 200     | Tên route khác                                  |
| 5   | `/feasibility-check` | `/feasibility`                                    | ✅ 200     | Tên route khác                                  |
| 6   | `/12-week-plan`      | `/12-week-system`                                 | ✅ 200     | Tên route khác                                  |
| 7   | `/today`             | `/today` → redirect → `/12-week-system?tab=today` | ✅ 200     | Redirect nội bộ                                 |
| 8   | `/weekly-review`     | `/journal`                                        | ✅ 200     | Route gần nhất; không có `/weekly-review` riêng |
| 9   | `/vision-board`      | `/vision-board`                                   | ✅ 200     | Khớp                                            |

**Các trang bổ sung đã kiểm tra:** `/onboarding`, `/12-week-setup`, `/goals`, `/achievements`

---

## 3. Ảnh Chụp Màn Hình

Tất cả ảnh chụp được lưu tại `qa-artifacts/visual-verify-results/screenshots/`:

| Trang          | Mobile (375px)                        | Tablet (768px)                        | Desktop (1280px)                       | Wide (1920px)                        |
| -------------- | ------------------------------------- | ------------------------------------- | -------------------------------------- | ------------------------------------ |
| Dashboard      | `dashboard-mobile.png` (290KB)        | `dashboard-tablet.png` (298KB)        | `dashboard-desktop.png` (485KB)        | `dashboard-wide.png` (460KB)         |
| Onboarding     | `onboarding-mobile.png` (194KB)       | `onboarding-tablet.png` (354KB)       | `onboarding-desktop.png` (479KB)       | `onboarding-wide.png` (1118KB)       |
| Life Balance   | `life-balance-mobile.png` (337KB)     | `life-balance-tablet.png` (447KB)     | `life-balance-desktop.png` (619KB)     | `life-balance-wide.png` (1154KB)     |
| Life Insight   | `life-insight-mobile.png` (344KB)     | `life-insight-tablet.png` (452KB)     | `life-insight-desktop.png` (671KB)     | `life-insight-wide.png` (1204KB)     |
| SMART Goal     | `smart-goal-setup-mobile.png` (147KB) | `smart-goal-setup-tablet.png` (441KB) | `smart-goal-setup-desktop.png` (623KB) | `smart-goal-setup-wide.png` (1236KB) |
| Feasibility    | `feasibility-mobile.png` (156KB)      | `feasibility-tablet.png` (440KB)      | `feasibility-desktop.png` (628KB)      | `feasibility-wide.png` (1240KB)      |
| 12-Week Setup  | `12-week-setup-mobile.png` (124KB)    | `12-week-setup-tablet.png` (441KB)    | `12-week-setup-desktop.png` (629KB)    | `12-week-setup-wide.png` (1245KB)    |
| 12-Week System | `12-week-system-mobile.png` (407KB)   | `12-week-system-tablet.png` (577KB)   | `12-week-system-desktop.png` (775KB)   | `12-week-system-wide.png` (1291KB)   |
| Today          | `today-mobile.png` (407KB)            | `today-tablet.png` (577KB)            | `today-desktop.png` (775KB)            | `today-wide.png` (1291KB)            |
| Journal        | `journal-mobile.png` (220KB)          | `journal-tablet.png` (465KB)          | `journal-desktop.png` (590KB)          | `journal-wide.png` (1119KB)          |
| Vision Board   | `vision-board-mobile.png` (300KB)     | `vision-board-tablet.png` (395KB)     | `vision-board-desktop.png` (472KB)     | `vision-board-wide.png` (447KB)      |
| Goal Tracker   | `goals-mobile.png` (341KB)            | `goals-tablet.png` (591KB)            | `goals-desktop.png` (825KB)            | `goals-wide.png` (1419KB)            |
| Achievements   | `achievements-mobile.png` (236KB)     | `achievements-tablet.png` (474KB)     | `achievements-desktop.png` (652KB)     | `achievements-wide.png` (1249KB)     |

---

## 4. Vấn Đề Phát Hiện

### 4.1 P2 – Trung Bình (4 vấn đề)

#### [P2-01] Focusable elements trong `aria-hidden="true"` – Dashboard

- **Trang:** `/` (Dashboard)
- **Mức độ:** P2 – Accessibility
- **Mô tả:** 21 phần tử focusable (button, link, input) nằm bên trong phần tử có `aria-hidden="true"`. Người dùng screen reader không thể truy cập, nhưng bàn phím vẫn focus được → gây mất định hướng.
- **Ảnh minh họa:** `screenshots/dashboard-desktop.png`

#### [P2-02] Focusable elements trong `aria-hidden="true"` + Empty buttons – Vision Board

- **Trang:** `/vision-board` (VisionBoardEditor)
- **Mức độ:** P2 – Accessibility
- **Mô tả:**
  - 39 phần tử focusable nằm trong `aria-hidden="true"`
  - 8 button/link rỗng (không có text content hoặc `aria-label`)
- **Nguồn:** `src/app/components/visionBoard/VisionBoardSidebar.tsx`, `VisionBoardItemRenderer.tsx`, `ItemControlsPopover.tsx`
- **Ảnh minh họa:** `screenshots/vision-board-desktop.png`

#### [P2-03] Focusable elements trong `aria-hidden="true"` – Goal Tracker

- **Trang:** `/goals` (GoalTracker)
- **Mức độ:** P2 – Accessibility
- **Mô tả:** 4 phần tử focusable nằm trong `aria-hidden="true"` (liên quan đến flip card animation)
- **Nguồn:** `src/app/pages/GoalTracker.tsx:1463`
- **Ảnh minh họa:** `screenshots/goals-desktop.png`

#### [P2-04] `inert` attribute truyền boolean thay vì string – Goal Tracker

- **Trang:** `/goals` (GoalTracker)
- **Mức độ:** P2 – Console Error / React Warning
- **Mô tả:** Console in ra warning: `Received 'true' for a non-boolean attribute 'inert'`. Thuộc tính HTML `inert` yêu cầu giá trị string (`""` hoặc `"inert"`), không phải boolean (`true`/`false`).
- **Vị trí:**
  - `src/app/pages/GoalTracker.tsx:1463`: `inert={isFlipped ? true : undefined}`
  - `src/app/pages/GoalTracker.tsx:1676`: `inert={!isFlipped ? true : undefined}`
- **Cách sửa gợi ý:** Đổi thành `inert={isFlipped ? "" : undefined}` hoặc dùng `{...(isFlipped && { inert: "" })}`

### 4.2 P3 – Nhẹ (7 vấn đề)

Tất cả đều thuộc category **Typography**: các phần tử có `font-size < 10px`, có thể quá nhỏ để đọc trên một số thiết bị.

| #     | Trang          | Số phần tử | Ảnh minh họa                 |
| ----- | -------------- | ---------- | ---------------------------- |
| P3-01 | Dashboard      | 31         | `dashboard-desktop.png`      |
| P3-02 | Life Balance   | 1          | `life-balance-desktop.png`   |
| P3-03 | Life Insight   | 1          | `life-insight-desktop.png`   |
| P3-04 | 12-Week System | 8          | `12-week-system-desktop.png` |
| P3-05 | Today          | 8          | `today-desktop.png`          |
| P3-06 | Goal Tracker   | 5          | `goals-desktop.png`          |
| P3-07 | Achievements   | 3          | `achievements-desktop.png`   |

**Ghi chú:** Các font-size < 10px có thể là intentional cho decorative text, screen-reader-only text (`.sr-only`), hoặc icon labels. Cần kiểm tra thủ công từng trường hợp.

---

## 5. Các Trang Không Có Vấn Đề

Các trang sau **không phát hiện vấn đề tự động** nào (sạch):

| Trang              | Route               |
| ------------------ | ------------------- |
| Onboarding         | `/onboarding`       |
| SMART Goal Setup   | `/smart-goal-setup` |
| Feasibility Check  | `/feasibility`      |
| 12-Week Setup      | `/12-week-setup`    |
| Reflection Journal | `/journal`          |

---

## 6. Kiểm Tra Nhanh Các Tiêu Chí Khác

| Tiêu chí                                 | Kết quả                                                     |
| ---------------------------------------- | ----------------------------------------------------------- |
| `<meta name="viewport">`                 | ✅ Có trên tất cả các trang                                 |
| `lang` attribute trên `<html>`           | ✅ `vi` trên tất cả các trang                               |
| `<title>` trang                          | ✅ Tất cả có title format `"{Tên trang} – Dear Our Future"` |
| Horizontal overflow (desktop)            | ✅ Không phát hiện tràn ngang                               |
| Empty buttons/links (ngoài Vision Board) | ✅ Không có                                                 |
| Redirect không mong muốn                 | ✅ Không có                                                 |
| HTTP 4xx/5xx                             | ✅ Không có                                                 |

---

## 7. Tệp Đầu Ra

| Tệp                                                    | Mô tả                                          |
| ------------------------------------------------------ | ---------------------------------------------- |
| `qa-artifacts/visual-verify-results/report.json`       | Báo cáo chi tiết dạng JSON (machine-readable)  |
| `qa-artifacts/visual-verify-results/visual-verify.mjs` | Script Playwright dùng để chụp và kiểm tra     |
| `qa-artifacts/visual-verify-results/screenshots/*.png` | 52 ảnh chụp màn hình (13 trang × 4 kích thước) |

---

## 8. Kết Luận & Khuyến Nghị

### Tổng thể

Nền tảng ở trạng thái **tốt** – không có vấn đề P1 (nghiêm trọng) nào. Tất cả 13 trang đều trả về HTTP 200, không có trang nào bị vỡ layout hoặc crash.

### Ưu tiên sửa (nếu được phép)

1. **GoalTracker `inert` warning** – Sửa 2 dòng trong [`GoalTracker.tsx`](src/app/pages/GoalTracker.tsx:1463) để tránh console warning trong production
2. **Vision Board accessibility** – Thêm `aria-label` cho 8 button/link rỗng, kiểm tra lại `aria-hidden` nesting
3. **Dashboard/GoalTracker aria-hidden focusable** – Kiểm tra xem các phần tử focusable có thực sự bị ẩn với người dùng không; nếu có thì thêm `tabindex="-1"` hoặc di chuyển chúng ra ngoài `aria-hidden` container

### Hạn chế của đợt kiểm tra này

- **Không kiểm tra trực quan thủ công** – Các vấn đề như màu sắc, độ tương phản, chồng lấn phần tử, khoảng cách không đồng nhất chỉ được phát hiện qua phân tích tự động. Cần người kiểm tra trực tiếp các ảnh chụp.
- **Không kiểm tra tương tác** – Form submit, navigation, animation, loading states chưa được kiểm tra.
- **Không kiểm tra dark mode** – Chỉ kiểm tra ở theme mặc định.
- **Firebase/demo mode** – App chạy ở chế độ demo/local, không kiểm tra auth flow hoặc sync behavior.
