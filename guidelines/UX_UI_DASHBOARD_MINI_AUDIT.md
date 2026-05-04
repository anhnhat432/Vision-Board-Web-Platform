# UX/UI Dashboard Mini Audit (Signed-In)

Last updated: 2026-05-04
Source: `src/app/pages/Dashboard.tsx` (1665 lines, 85+ imports)

---

## 1. Điều cần hiểu trước khi đọc

Dashboard signed-in có **3 trạng thái** render khác nhau:

| Trạng thái | Điều kiện | Nội dung chính |
|---|---|---|
| Public visitor | Chưa đăng nhập | `PublicVisitorHero` — CTA demo |
| Signed-in, chưa có system | Đã login, chưa tạo 12-week | Hero + CTA "Tạo kế hoạch 12 tuần" |
| Signed-in, có system active | Đã login + `currentCycle` exists | Hero + task preview + stats + sidebar + execution board + workspace grid |

Trạng thái **thứ 3** (active system) là phức tạp nhất và là đối tượng chính của audit này. Khi active:

- **Hero card**: badge row (5 badges, 3 ẩn trên mobile), h1 title, description, task preview cards (up to 3), 3 stat mini-cards (today completion / week lead / review status)
- **Sidebar**: plan card (Free/Plus) + attention panels ("Đi tiếp ngay" — feasibility, setup, system links)
- **Rescue trigger banner**: hiện khi rescue conditions met (top of page)
- **Review due banner**: amber, hiện khi hôm nay là review day
- **Execution board**: GoalProgressCard + ExecutionScoreCard + StreakCard + expandable analytics
- **Workspace grid**: goals table + DashboardLifeAreaRadar (lazy-loaded)
- **Journal section**: reflection journal preview
- **Data backup section**: cloud sync status

---

## 2. Top 5 UX Risks

### R1. Quá nhiều card cạnh tranh attention (Critical)

**Vấn đề:** Khi active system, user thấy 8-12 cards cùng lúc trên desktop: hero, rescue banner, review banner, plan card, 2-3 attention panels, 3 execution cards, goals table, radar chart, journal, backup. Không có visual hierarchy rõ ràng giữa "việc cần làm ngay" vs "thông tin tham khảo".

**Impact:** User không biết nhìn đâu trước. First-time signed-in user bị overwhelm.

**Evidence:** Quality Audit §2 đã flag. Evidence Summary verdict: "Too many cards competing with what do today".

### R2. Scroll fatigue trên mobile (High)

**Vấn đề:** Toàn bộ nội dung render dạng single-column trên mobile. Hero card + stat cards + execution board + goals table + radar chart + journal + backup = ước tính 6-8 viewport heights. Không có collapse/accordion hay progressive disclosure.

**Impact:** Mobile user không bao giờ scroll đến execution board hoặc journal. Thông tin quan trọng bị chôn.

**Evidence:** Quality Audit §4.2 flag scroll fatigue. Performance Notes confirm radar chart load eagerly.

### R3. Badge row thiếu context (Medium)

**Vấn đề:** Hero card có 5 badges (cycle week, completion %, streak, plan tier, system status). Trên mobile chỉ hiện 2/5. Badges không có tooltip hay explanation — user mới không hiểu "Tuần 3/12" hay "Lead 60%" nghĩa là gì.

**Impact:** Badges chiếm space nhưng không truyền tải ý nghĩa cho user chưa quen hệ thống.

### R4. Attention panels ("Đi tiếp ngay") luôn hiện (Medium)

**Vấn đề:** Sidebar attention panels (links đến feasibility, setup, system) hiện ngay cả khi user đã hoàn thành các bước đó. Logic conditional check tồn tại nhưng dựa trên data presence, không phải completion status — nếu data tồn tại nhưng incomplete, panel vẫn hiện.

**Impact:** Noise. User đã setup xong vẫn thấy "Đi tiếp ngay" — giảm trust vào hệ thống.

### R5. DashboardLifeAreaRadar load charts chunk eagerly (Medium)

**Vấn đề:** `DashboardLifeAreaRadar` dùng `React.lazy()` nhưng Dashboard là eager route → charts chunk (~312 kB raw) vẫn load trên first paint nếu user có data. Radar chart ở below-the-fold, user có thể không bao giờ scroll đến.

**Impact:** ~80 kB gzip thêm vào first paint. Performance Notes §8 confirm đây là optimization opportunity lớn nhất còn lại.

---

## 3. Top 5 Quick Wins

### Q1. Thêm "Việc quan trọng nhất" card nổi bật (effort: S)

Tách `primaryHeroTask` ra thành card riêng ở top, trước hero card. Dùng `border-2 border-primary` + size-lg CTA "Đánh dấu xong". Pattern đã có ở 12WeekSystem Today tab.

**Why:** Trả lời câu hỏi "Hôm nay làm gì?" ngay lập tức. Giảm attention competition.

### Q2. Collapse execution board mặc định trên mobile (effort: S)

Wrap GoalProgressCard + ExecutionScoreCard + StreakCard trong `<details>` hoặc accordion. Mặc định đóng trên `<md`. Chỉ hiện summary line: "Tuần 3: 4/5 việc — 80% lead completion".

**Why:** Giảm 2-3 viewport heights scroll trên mobile. Thông tin vẫn accessible khi cần.

### Q3. Conditional render attention panels (effort: S)

Chỉ hiện "Đi tiếp ngay" panels khi step thực sự chưa complete. Check: `!feasibilityResult` → hiện feasibility panel. `!currentCycle` → hiện setup panel. Nếu cả hai đã có → ẩn sidebar attention section.

**Why:** Giảm noise cho user đã setup xong. Sidebar space freed cho plan card only.

### Q4. Badge tooltips (effort: XS)

Thêm `title` attribute hoặc Radix Tooltip cho mỗi badge. Ví dụ: hover "Tuần 3/12" → "Bạn đang ở tuần thứ 3 trong chu kỳ 12 tuần".

**Why:** Badges trở nên useful thay vì decorative. Không thay đổi layout.

### Q5. Lazy-load DashboardLifeAreaRadar với IntersectionObserver (effort: M)

Thay `React.lazy()` đơn thuần bằng lazy + IntersectionObserver trigger. Radar chart chỉ load khi user scroll đến section đó. Hoặc đơn giản hơn: move radar chart vào một route riêng / tab.

**Why:** Tiết kiệm ~80 kB gzip first paint. Đã được flag ở Performance Notes §8 là P1.

---

## 4. GO / NO-GO cho Friendly-Beta

### Verdict: **GO with awareness**

Dashboard signed-in **đủ dùng** cho friendly-beta 5-15 người, với điều kiện:

**Đủ:**
- Core information hiển thị đúng (hero, tasks, stats, execution board)
- Mobile responsive có (sticky CTA, touch targets, badge hiding)
- Rescue + review banners hoạt động
- Data backup section hiện

**Chưa đủ nhưng chấp nhận được cho beta:**
- Card competition chưa giải quyết → beta testers sẽ cho feedback
- Scroll fatigue trên mobile → acceptable cho 5-15 testers biết context
- Badge tooltips thiếu → minor, không block

**Block nếu public:**
- Attention panels hiện sai context → confuse new users
- Charts eager load → slow first paint cho 3G/4G users

---

## 5. Prompt sửa Risk #1 (Card Competition)

Copy-paste prompt dưới đây để fix:

```
QUOTA-SAFE MODE. Fix Dashboard card competition (Risk #1 từ UX_UI_DASHBOARD_MINI_AUDIT.md).

File: src/app/pages/Dashboard.tsx

Thay đổi:
1. Tạo component `DashboardPrimaryAction` — extract primaryHeroTask logic thành card riêng.
   - Render ở top (trước hero card), chỉ khi có activeSystem + có task hôm nay
   - Style: border-2 border-primary, bg-primary/5, rounded-xl, p-6
   - Nội dung: task name + "Chỉ cần xong việc này là hôm nay đã đủ." + CTA "Đánh dấu xong" size-lg
   - Copy convention theo UX_COPY_STYLE_GUIDE.md §8 Today tab

2. Wrap execution board (GoalProgressCard + ExecutionScoreCard + StreakCard) trong collapsible section.
   - Mặc định mở trên md+, đóng trên <md
   - Summary khi đóng: "Tuần {week}: {completed}/{total} việc — {leadPercent}% lead completion"
   - Dùng <details> native hoặc Radix Collapsible

3. KHÔNG thay đổi sidebar, journal, backup sections.
4. KHÔNG thêm dependency mới.
5. Chạy tsc check sau khi xong.
```

---

## Cross-reference

- Quality Audit §2: card competition identified
- Evidence Summary §2 Dashboard Clarity: "Too many cards competing"
- Performance Notes §8: DashboardLifeAreaRadar lazy optimization
- Copy Style Guide §8: Today tab copy conventions
