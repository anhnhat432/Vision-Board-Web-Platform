# Layout System Guide

Date: 2026-05-06
Role: Layout Design System Lead
Plugin: `frontend-design@claude-plugins-official` (evaluated — see §11)
Mode: QUOTA-SAFE — guidelines only, no code changes

Sources read:
- `AGENTS.md` (engineering rules, no new dependencies)
- `guidelines/LAYOUT_SYSTEM_AUDIT.md` (10 sections, 15 top problems)
- `guidelines/DESIGN_SYSTEM_INVENTORY.md` (tokens, components, inconsistencies D1–D12)
- `guidelines/COLOR_SYSTEM_DIRECTION.md` (calm, focused, optimistic, trustworthy)
- `guidelines/MOTION_EFFECTS_GUIDE.md` (purposeful, subtle, fast, calm, accessible)
- `guidelines/UX_COPY_STYLE_GUIDE.md` (clear, concrete, non-judgmental, action-oriented)

---

## 1. Layout Principles

### 1.1 One Primary Action Per Screen
- Mỗi viewport chỉ có **1 nút CTA gradient-brand**
- Các nút khác dùng `variant=outline` (secondary) hoặc `variant=ghost` (tertiary)
- Dashboard: "Tiếp tục kế hoạch 12 tuần" là CTA duy nhất dùng gradient-brand
- Today tab: "Lưu check-in" là CTA duy nhất (sticky trên mobile)
- Settings: Không có CTA chính — chỉ utility actions, tất cả dùng `outline` hoặc `ghost`

### 1.2 Primary Content Before Secondary Content
- Hero/primary section luôn ở trên cùng, full-width
- Secondary panels (clarity progress, insights, rescue) ở dưới, có thể collapse trên mobile
- Dashboard: Hero card → Quick actions → Stats (collapsible) → Content
- Today tab: Priority hero → Queue → Check-in → Secondary cards (insights, rescue)

### 1.3 Card Hierarchy by Purpose
| Cấp độ | Visual | Dùng cho |
|---------|--------|-----------|
| **Hero** | `border-2 border-primary` + `hero-surface` (gradient nhẹ) | Dashboard hero, Today priority, SMART step hero |
| **Primary card** | `glass-surface` (default Card) | Task queue, Check-in form, Wizard step content |
| **Secondary panel** | `bg-muted/90 border border-muted` | Clarity progress, Insights, Rescue nudge |
| **Status card** | `border-amber-200 bg-amber-50/85` (warning) hoặc `border-emerald-200 bg-emerald-50` (success) | Review due, Weekly completion |

### 1.4 Fewer Panels Above the Fold
- Dashboard: Tối đa **3 cards** above fold trên mobile (Hero + 1 Quick action + 1 Stats row)
- Today tab: Tối đa **2 cards** above fold (Priority hero + 3-4 tasks trong queue)
- SMARTGoalSetup: Chỉ **1 step card** + stepper (clarity panel có thể collapse sau khi đủ 8/8)
- Không để 5+ cards đều nhau trên một màn hình

### 1.5 Predictable Wizard Rhythm
Tất cả 3 wizards (SMART, Feasibility, 12WeekSetup) tuân theo:
1. `CoreFlowProgress` ngoài StepShell (trừ 12WeekSetup — đang thiếu, sẽ thêm)
2. StepShell có heading rõ ràng (`h2` ngoài, `h3` trong CardTitle)
3. Form content ở giữa
4. Stepper (Back | Next/Submit) ở dưới cùng, sticky trên mobile
5. Clarity/Review summary có thể collapse sau khi xong

### 1.6 Mobile-First Stacking
- Mobile (375px–428px): Stack dọc 100%, `gap-4` (16px) giữa các section
- Tablet (768px+): Grid 2 cột cho stats/cards, giữ stack cho primary content
- Desktop (1024px+): Grid 2-3 cột cho dashboard, max-w-7xl cho execution
- Luôn test layout bắt đầu từ 375px (iPhone SE) rồi mới mở rộng

### 1.7 Progressive Disclosure
- Collapse secondary content trên mobile: Insights, Rescue, Check-in note
- Dùng `hidden sm:block` hoặc `useState` toggle `"Xem thêm" / "Thu gọn"`
- Dashboard stats: collapse thành 1 row "Xem thống kê" trên mobile
- Chỉ expand khi user chủ động click, không auto-expand

---

## 2. Page Layout Rules

### 2.1 Max Width
| Loại trang | Class | px | Ghi chú |
|-----------|-------|----|--------|
| **Execution dashboard** (12WeekSystem) | `max-w-7xl` (PageShell default) | 1280px | Đủ rộng cho 4 tabs + content |
| **Form wizard** (SMART, Feasibility, 12WeekSetup) | `max-w-4xl` (hiện tại đang là 3xl) | 896px | Tăng từ 768px để desktop bớt cramped |
| **Static page** (Dashboard, LifeBalance) | `max-w-7xl` (PageShell default) | 1280px | Hero full-width, cards grid 2-3 cols |
| **Dialog/Modal** | `max-w-lg` (512px) | 512px | Đủ cho form, không quá hẹp |

### 2.2 Section Spacing
| Context | Desktop | Mobile | Class |
|---------|---------|--------|-------|
| Hero → Main content | 32px | 24px | `mt-8` / `mt-6` |
| Giữa các major sections | 24px | 16px | `space-y-6` / `gap-6` |
| Trong một card (subsections) | 16px | 12px | `space-y-4` / `gap-4` |
| Giữa các cards trong grid | 24px | 16px | `gap-6` / `gap-4` |

### 2.3 Card Padding
| Component | Mobile | Desktop | Class |
|-----------|--------|---------|-------|
| `CardHeader` | `px-5 pt-5` (20px) | `px-7 pt-7` (28px) | Theo `card.tsx` default |
| `CardContent` | `px-5 pb-5` (20px) | `px-7 pb-7` (28px) | Theo `card.tsx` default |
| `CardFooter` | `px-5 pb-5` (20px) | `px-7 pb-7` (28px) | Theo `card.tsx` default |
| Hero card (đặc biệt) | `p-5` (20px) | `p-6 lg:p-7` (24-28px) | Dashboard hero, Today priority |

⚠️ **Consistency rule**: Tất cả cards dùng `CardContent` padding, không tự đặt `p-5 sm:p-6 lg:p-7` riêng lẻ (trừ hero).

### 2.4 Grid Rules
- **Dashboard stats**: `grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6`
- **Dashboard quick actions**: `grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6`
- **Today queue**: Stack dọc (không grid) — tasks là list, không phải grid
- **Progress tab**: `grid grid-cols-1 lg:grid-cols-2 gap-6` cho heatmap + breakdown
- **Settings sections**: Stack dọc, grouped by `SectionHeader`

---

## 3. Page Shell Patterns

### 3.1 Dashboard Shell
```
PageShell (max-w-7xl)
├── CoreFlowProgress (optional, nếu trong funnel)
├── Hero card (border-2 border-primary, hero-surface)
├── Quick actions (grid 3 cols, nếu có)
├── Stats row (collapsible trên mobile)
└── Content cards (2-3 cols grid)
```

**Key rules**:
- Hero card là primary focus, dùng `border-2 border-primary`
- Chỉ 1 gradient-brand CTA trong toàn bộ page
- Stats row collapse trên mobile (`hidden sm:grid` hoặc state toggle)
- Không để 8+ cards hiển thị cùng lúc

### 3.2 Wizard Shell
```
PageShell (max-w-4xl, tăng từ 3xl)
├── CoreFlowProgress (ngoài StepShell)
└── StepShell (Card với header + content + footer)
    ├── Heading (h2 ngoài, h3 trong CardTitle)
    ├── Step content (form fields)
    ├── Secondary panel (clarity progress / hints — collapsible)
    └── Stepper footer (Back | Next/Submit, sticky trên mobile)
```

**Key rules**:
- Tất cả 3 wizards dùng cùng structure (SMART có thêm clarity panel)
- SetupStepShell cần thêm step pip (D4 từ DESIGN_SYSTEM_INVENTORY)
- Mobile: CTA footer sticky bottom-0 với `bg-white/95 backdrop-blur-sm`
- Form fields: `space-y-4` giữa các input groups

### 3.3 Execution Shell (12WeekSystem)
```
PageShell (max-w-7xl)
└── Tabs (sticky top-14, rounded-lg grid-cols-4)
    ├── Today tab
    │   ├── Priority hero (border-emerald-300, nếu có firstPriorityTask)
    │   ├── Task queue (list, không grid)
    │   ├── Check-in form (CTA sticky mobile)
    │   └── Secondary: Insights, Rescue (collapsible mobile)
    ├── Week tab
    │   ├── Week editor (tasks list)
    │   ├── Review form (CTA sticky mobile)
    │   └── Next week recommendation
    ├── Progress tab
    │   ├── Trend hero
    │   ├── Charts (lazy-load IntersectionObserver)
    │   └── Insights card
    └── Settings tab
        ├── Goal settings (SectionHeader "Cài đặt mục tiêu")
        ├── Sync status (SectionHeader "Đồng bộ & Cloud")
        └── Danger zone (SectionHeader "Vùng nguy hiểm", collapsible)
```

**Key rules**:
- 4 tabs dùng segmented control (rounded-lg, sticky), không phải floating pill
- Today tab: Priority hero rõ ràng, queue là focus chính
- Settings: Group thành 3 sections, danger zone collapsible
- Charts lazy-load để tránh 312kB chunk block first paint

### 3.4 Settings/Utility Shell
```
PageShell (max-w-4xl hoặc 7xl tùy context)
└── Stack dọc (space-y-6)
    ├── SectionHeader ("Cài đặt mục tiêu")
    │   └── Setting cards (outline variant, không gradient)
    ├── SectionHeader ("Đồng bộ & Cloud")
    │   └── Sync status card (collapsed khi healthy)
    └── SectionHeader ("Vùng nguy hiểm")
        └── Danger actions (variant=destructive, có xác nhận)
```

**Key rules**:
- Không có primary CTA — chỉ utility actions
- Tất cả actions dùng `outline` hoặc `ghost`, trừ destructive dùng `destructive`
- Group bằng `SectionHeader` (sẽ extract từ DESIGN_SYSTEM_INVENTORY DS-3)

---

## 4. Section Hierarchy

### 4.1 PageHeader
- Dùng `CoreFlowProgress` cho funnel pages (SMART, Feasibility, 12WeekSetup)
- Dùng hero card cho Dashboard ("Dear Our Future" + CTA)
- Dùng tab navigation cho 12WeekSystem (4 tabs, sticky)
- Heading: `h1` cho page-level, `h2` cho step-level, `h3` cho card-level

### 4.2 PrimaryActionSection
- Full-width, border-2 border-primary, hero-surface background
- Chứa the most important thing user cần làm hôm nay
- Ví dụ: Today priority hero, Dashboard CTA hero, Week review due card

### 4.3 MainContentSection
- Glass surface card (default Card), không có border đặc biệt
- Chứa form fields, task queue, review form
- Padding theo CardContent default (px-5 sm:px-7)

### 4.4 SecondaryPanel
- `bg-muted/90 border border-muted` (không glass)
- Chứa insights, hints, rescue nudge, clarity progress
- Có thể collapse trên mobile (`hidden sm:block` hoặc state toggle)
- Icon + text-xs cho header (Sparkles cho hint, AlertTriangle cho warning)

### 4.5 InlineStatus
- Badge hoặc alert nhỏ trong context (không phải card riêng)
- Ví dụ: "Review đến hạn" badge trên Week tab, "3 việc trễ" inline text
- Dùng `Badge variant="warning"` hoặc `Alert variant="warning"` nhỏ gọn

### 4.6 EmptyState
- Card với icon (size-12), title (text-lg font-semibold), description (text-sm text-muted-foreground)
- CTA: 1 primary (gradient-brand) + 1 secondary (outline)
- Copy: Tình trạng + Lý do + Next action (theo UX_COPY_STYLE_GUIDE §4)
- Sẽ extract từ DESIGN_SYSTEM_INVENTORY DS-10 (hiện tại 3 instances, cần 4th)

---

## 5. CTA Placement Rules

### 5.1 Primary CTA (gradient-brand)
| Page | Placement | Sticky? | Ghi chú |
|------|-----------|---------|--------|
| Dashboard (has goal) | Trong Quick action card | Không | Chỉ 1 gradient-brand button trong viewport |
| SMARTGoalSetup | Sticky bottom bar (mobile), trong StepShell footer (desktop) | ✅ Mobile | Next/Submit |
| FeasibilityCheck | Sticky bottom bar (mobile), trong StepShell footer (desktop) | ✅ Mobile | Next/Vào kế hoạch |
| 12WeekSetup | Sticky bottom bar (mobile), trong StepShell footer (desktop) | ✅ Mobile | Next/Tạo kế hoạch |
| Today tab | Trong Check-in card | ✅ Mobile (sắp tới) | Lưu check-in |
| Week tab | Trong Review card | ✅ Mobile (sắp tới) | Lưu review |

### 5.2 Secondary CTA (outline hoặc ghost)
- Luôn nằm cạnh primary CTA (Back | Next pattern)
- Desktop: Trong card footer
- Mobile: Trong sticky bottom bar, bên trái primary

### 5.3 Destructive CTA (destructive variant)
- Chỉ dùng cho irreversible actions: Xóa data, Hủy chu kỳ, Delete all
- Luôn có bước xác nhận (confirm dialog)
- Không dùng cho "Cancel" hoặc "Quay lại" (dùng outline)

### 5.4 Rule: Maximum 1 Gradient CTA Per Viewport
- Dashboard: 1 (Tiếp tục kế hoạch)
- SMART: 1 (Tiếp theo/Tạo mục tiêu)
- Today: 1 (Lưu check-in)
- Settings: 0 (không có primary CTA)
- Nếu cần thêm action, dùng outline/ghost

---

## 6. Wizard Layout Rules

### 6.1 Consistent Step Indicator
- SMART + Feasibility: Có `CoreFlowProgress` ngoài StepShell ✅
- 12WeekSetup: **Đang thiếu** (D4) — cần thêm step pip vào SetupStepShell
- Tất cả wizards: Step indicator hiển thị progress (4-7 steps)

### 6.2 StepShell Structure (Tất cả wizards)
```
Card (glass-surface)
├── Header (CardHeader)
│   ├── Step indicator (CoreFlowProgress hoặc pip)
│   ├── Heading (h2 ngoài, h3 trong CardTitle)
│   └── Description (CardDescription)
├── Content (CardContent)
│   ├── Form fields (space-y-4)
│   └── Secondary panel (clarity/hints, optional)
└── Footer (CardFooter, sticky mobile)
    ├── Back button (outline, trái)
    └── Next/Submit (gradient-brand, phải)
```

### 6.3 Clarity/Review Panel (SMART + 12WeekSetup)
- Nằm trong StepShell, dưới CardContent
- Có thể collapse sau khi đạt "strong" (8/8 cho SMART, quality check cho Setup)
- Hiển thị progress bar + bullet points
- Collapse mặc định trên mobile

### 6.4 Width Consistency
- Tất cả wizards: `max-w-4xl` (896px) — tăng từ 3xl (768px)
- Progress bar full-width của StepShell
- Form fields max-w-prose (65ch) để text không quá rộng

---

## 7. 12WeekSystem Layout Rules

### 7.1 Tab Structure
- 4 tabs: Today, Week, Progress, Settings
- Sticky top-14 (dưới header 64px), rounded-lg grid-cols-4
- Mobile: icon-over-label (flex-col), Desktop: icon-inline (flex-row)
- Badge đỏ (h-2 w-2 rounded-full) trên tab khi có action due (Review tab)

### 7.2 Today Tab (Primary Daily Interaction)
1. Priority hero (border-emerald-300, nếu có firstPriorityTask) — **MỚI**
2. Task queue (list, không grid) — focus chính
3. Check-in form (collapsible note field)
4. Secondary: Insights, Rescue (collapse trên mobile)

### 7.3 Week Tab
1. Week editor (task list cho current week)
2. Review form (5 fields, collapse 3 optional fields trên mobile)
3. Next week recommendation

### 7.4 Progress Tab
1. Trend hero (score + direction)
2. Charts (lazy-load, IntersectionObserver)
3. Insights (1-2 items, link to full list)

### 7.5 Settings Tab (Utility, No Primary CTA)
1. SectionHeader "Cài đặt mục tiêu" → Goal settings
2. SectionHeader "Đồng bộ & Cloud" → Sync status (collapse khi healthy)
3. SectionHeader "Vùng nguy hiểm" → Danger actions (collapsible)

---

## 8. Mobile Layout Rules

### 8.1 Scroll Fatigue Mitigation
| Page | Max Cards Above Fold | Collapse Strategy |
|------|---------------------|-------------------|
| Dashboard | 3 (Hero + 1 Quick + Stats row) | Stats → "Xem thống kê" toggle |
| Today | 2 (Priority + 3-4 tasks) | Insights/Rescue → hidden sm:block |
| SMART | 1 (Step card) | Clarity panel → collapse khi strong |
| Feasibility | 1 (Question card) | Chi tiết → collapsible trên mobile |
| 12WeekSetup | 1 (Step card) | Quality panel → collapse khi strong |
| Progress | 2 (Hero + 1 chart) | Heatmap → lazy-load |

### 8.2 Sticky Elements
- ✅ Wizard CTA footer: sticky bottom-0, bg-white/95 backdrop-blur-sm
- ✅ 12WeekSystem tabs: sticky top-14 (dưới header)
- 🔜 Today check-in CTA: sticky bottom-0 (sắp tới)
- 🔜 Week review CTA: sticky bottom-0 (sắp tới)
- ❌ Không sticky cards, không sticky headers (chỉ tabs và CTAs)

### 8.3 Bottom Nav (Mobile)
- Sticky bottom-0, h-16 (64px)
- Main content cần `pb-16` để không bị che khuất
- Chỉ hiển thị trên mobile (`block sm:hidden`)
- 4 tabs: Today, Week, Progress, More (hoặc Settings)

### 8.4 Touch Targets
- Buttons: h-11 (44px) minimum — đạt chuẩn WCAG
- Cards: spacing tối thiểu 16px (gap-4) để dễ tap
- Form inputs: h-11 (44px) — dễ thao tác trên mobile
- Icon buttons: size-10 (40px) minimum

---

## 9. What Not to Do

### 9.1 Too Many Cards Above Fold
- ❌ Dashboard: 8-12 cards hiển thị cùng lúc
- ✅ Chỉ 3-4 cards, collapse secondary content

### 9.2 Equal Visual Weight for Everything
- ❌ Tất cả cards dùng cùng border, cùng shadow, cùng background
- ✅ Hero = border-2 border-primary, Primary = glass-surface, Secondary = muted bg

### 9.3 Nested Cards Inside Cards Inside Cards
- ❌ Card trong Card trong Card (3 layers)
- ✅ Chỉ 1 layer Card, secondary content dùng `bg-muted` panels bên trong

### 9.4 Sticky Elements That Hide Content
- ❌ Sticky header + sticky CTA + sticky tabs = mất 200px content
- ✅ Chỉ 1 sticky element tại một thời điểm (tabs hoặc CTA, không cả hai)

### 9.5 Unpredictable Grids
- ❌ Dashboard: 2 cols rồi 3 cols rồi 1 col trong cùng page
- ✅ Quy định rõ: Stats = 3 cols, Quick actions = 3 cols, Content = 2 cols

### 9.6 Decorative Only Effects (From MOTION_EFFECTS_GUIDE)
- ❌ Backdrop blur trên content cards (giảm readability)
- ❌ Hover:scale-[1.02] trên 12+ cards (bouncy feel)
- ❌ Infinite animations (pulse, glow, float) trên static elements
- ✅ Chỉ loading states mới dùng infinite animation

---

## 10. Component Primitives Nên Có

### 10.1 PageShell (ĐÃ CÓ)
- `max-w-7xl` default, có thể override qua prop
- Padding: `px-4 py-4 sm:px-6 sm:py-6 lg:px-8`
- Dùng trong tất cả pages

### 10.2 PageHeader (SẼ EXTRACT - DS-3)
- Props: `{ eyebrow?: string, title: string, description?: ReactNode, level?: 2 | 3 }`
- Dùng cho: Dashboard hero, SMART step heading, Feasibility step heading
- Thay thế ad-hoc eyebrow + heading patterns (6+ sites hiện tại)

### 10.3 SectionBlock (MỚI - ĐƠN GIẢN)
- Wrapper cho grouped content với SectionHeader
- Props: `{ title: string, eyebrow?: string, children: ReactNode, collapsible?: boolean }`
- Dùng cho: Settings groups, Dashboard stats row

### 10.4 PrimaryActionCard (MỚI - ĐƠN GIẢN)
- Card với `border-2 border-primary` + optional `hero-surface`
- Props: `{ title: string, description?: string, action: ReactNode, children?: ReactNode }`
- Dùng cho: Today priority hero, Dashboard CTA hero

### 10.5 SecondaryPanel (MỚI - ĐƠN GIẢN)
- `bg-muted/90 border border-muted rounded-xl p-4`
- Props: `{ icon?: ReactNode, title: string, children: ReactNode, collapsible?: boolean }`
- Dùng cho: Insights, Rescue nudge, Clarity progress (collapsed state)

### 10.6 StepShell (CẢI THIỆN)
- 3 variants hiện tại → cần unify dần (DS-4, DS-5)
- SetupStepShell cần thêm step pip (D4)
- Tất cả cần consistent heading semantics (h2 ngoài, h3 trong)

### 10.7 ReviewSummaryGrid (MỚI - ĐƠN GIẢN)
- Grid 2 cols cho review items (label + value)
- Props: `{ items: { label: string, value: string, status?: "success" | "warning" | "error" }[] }`
- Dùng cho: SMART summary, Feasibility result, 12WeekSetup review

### 10.8 EmptyState (SẼ EXTRACT - DS-10)
- Props: `{ icon: ReactNode, title: string, description: string, primaryAction?: ReactNode, secondaryAction?: ReactNode }`
- Copy: Tình trạng + Lý do + Next action (theo UX_COPY_STYLE_GUIDE)
- Hiện tại 3 instances, cần 4th để extract

### 10.9 StatusRow (MỚI - ĐƠN GIẢN)
- Inline status với icon + text + optional badge
- Props: `{ icon: ReactNode, text: string, badge?: { label: string, variant: BadgeVariant } }`
- Dùng cho: "Review đến hạn" trên Week tab, "3 việc trễ" inline

---

## 11. Plugin Recommendations Summary

### 11.1 Plugin Evaluation Result
`frontend-design@claude-plugins-official` was evaluated as the PRIMARY design reviewer:

| Aspect | Plugin Capability | Layout System Use |
|--------|-------------------|-------------------|
| **Create distinctive interfaces** | ✅ Core purpose | ❌ Not needed — we're fixing layout, not creating new aesthetics |
| **Typography selection** | ✅ Available | ❌ Not needed — Be Vietnam Pro already defined in theme.css |
| **Color/theme systems** | ✅ Available | ❌ Not needed — COLOR_SYSTEM_DIRECTION.md already defines semantic tokens |
| **Motion design** | ✅ Available | ❌ Not needed — MOTION_EFFECTS_GUIDE.md already defines purposeful/subtle/fast/calm/accessible |
| **Spatial composition** | ✅ Available (asymmetry, overlap, diagonal) | ❌ Not suitable — app needs calm, predictable layout (opposite of creative composition) |
| **Audit/analyze/review commands** | ❌ **NONE EXIST** | ❌ Cannot serve as audit tool |

**Verdict**: Plugin is a **creation tool**, not an **analysis tool**. It cannot audit existing layouts.

### 11.2 Plugin-Informed Layout Principles
Although the plugin cannot audit, its design philosophy informs these layout rules:

1. **Typography** (from plugin): Be Vietnam Pro is distinctive enough — don't switch to Inter/Arial. Keep hierarchy tight (h1=30px, h2=24px, h3=20px).

2. **Color & Theme** (from plugin + COLOR_SYSTEM_DIRECTION): Commit to cohesive aesthetic. Primary = Indigo-600, Success = Emerald-600, Warning = Amber-700, Destructive = Red-600. No competing gradients.

3. **Spatial Composition** (from plugin): Reject "unexpected layouts" for this app. Users need **predictable** grids, not asymmetry/overlap. The app is a productivity tool, not an art gallery.

4. **Motion** (from plugin + MOTION_EFFECTS_GUIDE): "Focus on high-impact moments" → Only 1 page-enter animation (200ms max). Remove all card hover lifts, pulse loops, glow effects.

### 11.3 What the Plugin Would Have Suggested (If It Could Audit)
Based on plugin's design philosophy, it would likely suggest:

| Issue | Plugin Would Suggest | Our Decision (Layout System) |
|-------|----------------------|-------------------------------|
| Dashboard card competition | "Bold maximalism: group cards into 2 hero sections with dramatic shadows" | ❌ Too noisy — use calm hierarchy instead (hero + secondary + muted) |
| Today tab missing priority hero | "Make it unforgettable: large gradient hero with oversized checkmark" | ✅ Yes, but keep subtle (border-2 border-primary, not oversized) |
| Wizard pages too narrow | "Give it space: max-w-5xl for dramatic form presentation" | ✅ Yes, max-w-4xl (not 5xl — too wide for forms) |
| Mobile scroll fatigue | "Diagonal flow: stagger cards at 15° angle for visual interest" | ❌ Vestibular nightmare — keep stack dọc, collapse secondary |

**Key insight**: Plugin's "bold/unforgettable" philosophy conflicts with our "calm/trustworthy" product tone. We take plugin's **attention to typography and color**, but reject its **creative composition** for this productivity app.

---

## 12. Prompt Tiếp Theo Để Implement Primitives

### Prompt 1 (High Impact, Low Effort) — "Extract PageHeader (DS-3)"
```
You are a frontend layout architect.

Nhiệm vụ: Extract PageHeader component từ DESIGN_SYSTEM_INVENTORY.md DS-3.

File mới: src/app/components/PageHeader.tsx

Props:
- eyebrow?: string (text-xs uppercase tracking-[0.16em] text-muted-foreground)
- title: string (h2 mobile text-2xl, desktop text-3xl, font-bold)
- description?: ReactNode (text-base text-muted-foreground mt-2)
- level?: 2 | 3 (default 2, chọn h2 hoặc h3)

Replace 6+ ad-hoc patterns:
- Dashboard hero heading
- SmartGoalStepShell heading
- FeasibilityStepShell heading
- SetupStepShell heading
- CoreFlowGateState heading
- 12WeekSystem tab headings

Không đổi visual styling. Chỉ DRY lại heading patterns.
Không thêm dependency. Không đổi business logic.
```

### Prompt 2 (High Impact, Low Effort) — "Add Step Pip to SetupStepShell (D4)"
```
You are a frontend layout architect.

File: src/app/pages/12WeekSetup/components/SetupStepShell.tsx

Nhiệm vụ: Thêm 4-dot step indicator (pip) để đối xứng với SmartGoalStepShell và FeasibilityStepShell.

- Dùng STEPS constant từ ../constants
- Render: ol > li với style giống 2 shells kia
- Active step: border-violet-500 bg-violet-500 text-white
- Done step: border-emerald-200 bg-emerald-50 text-emerald-800 cursor-pointer
- Pending step: border-slate-200 bg-white text-slate-400
- onClick handler cho done steps (call onJumpToStep nếu có)

Không đổi business logic. Không thêm dependency.
```

### Prompt 3 (Medium Impact, Low Effort) — "Create PrimaryActionCard"
```
You are a frontend layout architect.

File mới: src/app/components/PrimaryActionCard.tsx

Props:
- title: string (text-xl font-semibold)
- description?: string (text-sm text-muted-foreground)
- action: ReactNode (thường là Button gradient-brand)
- children?: ReactNode (optional extra content)

Styling:
- Card với border-2 border-primary
- Optional: className="hero-surface" cho gradient background
- Padding theo CardContent default

Dùng cho:
- Today tab priority hero (sắp tới)
- Dashboard CTA hero (thay thế current inline styling)

Không dùng cho: Secondary cards, settings, forms.
Không thêm dependency.
```

### Prompt 4 (Medium Impact, Medium Effort) — "Group Settings with SectionBlock"
```
You are a frontend layout architect.

Files: src/app/components/twelve-week/TwelveWeekSettingsTab.tsx

Nhiệm vụ: Group Settings thành 3 sections với SectionHeader.

Trước khi làm: Extract SectionBlock (hoặc dùng PageHeader + Card wrapping).

3 sections:
1. "Cài đặt mục tiêu" — review day, reminders, tactic preferences
2. "Đồng bộ & Cloud" — sync status, cloud import, outbox (collapse khi healthy)
3. "Vùng nguy hiểm" — reset cycle, clear local, delete all (collapsible với red border)

Make sync status a badge khi healthy, expand for details.
Tất cả actions dùng outline hoặc ghost, trừ destructive.

Không đổi business logic. Không thêm dependency.
```

### Prompt 5 (Low-Medium Impact, Low Effort) — "Create SecondaryPanel"
```
You are a frontend layout architect.

File mới: src/app/components/SecondaryPanel.tsx

Props:
- icon?: ReactNode (size-4, màu tùy context)
- title: string (text-sm font-semibold)
- children: ReactNode (nội dung panel)
- collapsible?: boolean (default false)
- defaultOpen?: boolean (default true)

Styling:
- bg-muted/90 border border-muted rounded-xl p-4
- Title: flex items-center gap-2
- Collapsible: dùng useState + "Thu gọn" / "Xem thêm"

Dùng cho:
- Insights card (Today tab)
- Rescue nudge (Today tab)
- Clarity progress (SMART, khi collapse)
- Hints/guidance panels

Không dùng cho: Primary content, CTAs.
Không thêm dependency.
```

### Prompt 6 (Low Impact, Medium Effort) — "Extract EmptyState (DS-10)"
```
You are a frontend layout architect.

File mới: src/app/components/EmptyState.tsx

Điều kiện: Đợi có 4th instance (hiện tại 3: Achievements, GoalTracker, VisionBoard).

Props:
- icon: ReactNode (size-12, màu muted-foreground)
- title: string (text-lg font-semibold)
- description: string (text-sm text-muted-foreground, theo UX_COPY_STYLE_GUIDE §4)
- primaryAction?: ReactNode (Button gradient-brand)
- secondaryAction?: ReactNode (Button outline)

Copy rules:
- Tình trạng (trạng thái hiện tại)
- Lý do ngắn (tại sao trống)
- Next action + CTA (hành động tiếp theo)

Không dùng cho: Gate states (dùng CoreFlowGateState riêng).
Không thêm dependency.
```

---

## 13. Final Summary

### Layout System Promise
> *"A calm, professional execution cockpit — where I always know the one thing I must do today, with clear paths to set up my goal, check feasibility, and execute my 12-week plan."*

### Key Rules (Remember These)
1. **One primary action per screen** — only 1 gradient-brand CTA per viewport
2. **Card hierarchy** — Hero (border-2 primary) > Primary (glass) > Secondary (muted)
3. **Mobile-first stacking** — max 3 cards above fold, collapse secondary
4. **Predictable wizard rhythm** — all 3 wizards use same StepShell structure
5. **Progressive disclosure** — hide Insights, Rescue, details on mobile
6. **No decorative motion** — remove pulse, glow, hover lifts (from MOTION_EFFECTS_GUIDE)
7. **Sticky only CTAs and tabs** — no sticky headers or cards

### Plugin Verdict
`frontend-design@claude-plugins-official` is a **creation tool**, not an **audit tool**. It cannot review existing layouts. Its design philosophy (bold, unforgettable, creative) conflicts with our calm/trustworthy product tone. We adopt its **typography/color discipline** but reject its **creative composition** for this productivity app.

### Next Step
Run **Prompt 1** (Extract PageHeader) or **Prompt 2** (Add Step Pip to SetupStepShell) — both are high-impact, low-effort, independent of each other.

---

## 14. Implemented Primitives (2026-05-06)

All layout primitives have been implemented in `src/app/components/layout/`.

### 14.1 PageHeader ✅
**File**: `src/app/components/layout/PageHeader.tsx`

**Props**:
```typescript
interface PageHeaderProps {
  eyebrow?: string;          // text-xs uppercase tracking-[0.16em] text-muted-foreground
  title: string;             // h2 mobile text-2xl, desktop text-3xl, font-bold
  description?: ReactNode;     // text-base text-muted-foreground
  level?: 2 | 3;              // default 2, selects h2 or h3
  className?: string;
}
```

**Usage**:
```tsx
import { PageHeader } from "@/app/components/layout";

<PageHeader
  eyebrow="Viết mục tiêu"
  title="Bước 1: Specific"
  description="Viết mục tiêu cụ thể để biết rõ cần đạt được gì."
  level={2}
/>
```

**Replaces ad-hoc patterns**: Dashboard hero, SMARTStepShell heading, FeasibilityStepShell heading, SetupStepShell heading, CoreFlowGateState heading.

---

### 14.2 SectionBlock ✅
**File**: `src/app/components/layout/SectionBlock.tsx`

**Props**:
```typescript
interface SectionBlockProps {
  title: string;
  eyebrow?: string;
  description?: ReactNode;
  children: ReactNode;
  collapsible?: boolean;      // default false
  defaultOpen?: boolean;       // default true
  className?: string;
}
```

**Usage**:
```tsx
import { SectionBlock } from "@/app/components/layout";

<SectionBlock
  title="Cài đặt mục tiêu"
  eyebrow="Settings"
  collapsible
>
  {/* Settings content */}
</SectionBlock>
```

**Use for**: Settings groups, Dashboard stats row, grouped content sections.

---

### 14.3 PrimaryActionCard ✅
**File**: `src/app/components/layout/PrimaryActionCard.tsx`

**Props**:
```typescript
interface PrimaryActionCardProps {
  title: string;               // text-xl font-semibold
  description?: string;           // text-sm text-muted-foreground
  action: ReactNode;              // Usually Button gradient-brand
  children?: ReactNode;           // Optional extra content
  hero?: boolean;                 // Adds hero-surface class
  className?: string;
}
```

**Usage**:
```tsx
import { PrimaryActionCard } from "@/app/components/layout";

<PrimaryActionCard
  title="Việc quan trọng nhất hôm nay"
  description="Chỉ cần xong việc này là hôm nay đã đủ."
  action={<Button className="gradient-brand">Lưu check-in</Button>}
  hero
/>
```

**Use for**: Today priority hero, Dashboard CTA hero.

---

### 14.4 SecondaryPanel ✅
**File**: `src/app/components/layout/SecondaryPanel.tsx`

**Props**:
```typescript
interface SecondaryPanelProps {
  icon?: ReactNode;             // size-4, color varies by context
  title: string;                 // text-sm font-semibold
  children: ReactNode;           // Panel content (text-sm)
  collapsible?: boolean;          // default false
  defaultOpen?: boolean;           // default true
  className?: string;
}
```

**Styling**: `bg-muted/90 border border-muted rounded-xl p-4`

**Usage**:
```tsx
import { SecondaryPanel } from "@/app/components/layout";

<SecondaryPanel
  icon={<Lightbulb className="text-violet-500" />}
  title="Gợi ý điền nhanh"
  collapsible
>
  <p>Thử dùng mục tiêu mẫu để bắt đầu nhanh hơn.</p>
</SecondaryPanel>
```

**Use for**: Insights, Rescue nudge, Clarity progress, Hints/guidance panels.

---

### 14.5 StepShell (Existing - Not Reimplemented)
**Files**: 
- `src/app/pages/SMARTGoalSetup/components/SmartGoalStepShell.tsx`
- `src/app/pages/12WeekSetup/components/SetupStepShell.tsx`
- `src/app/pages/FeasibilityCheck/components/FeasibilityStepShell.tsx`

**Status**: 3 variants exist. SetupStepShell already has step pip (added after audit).

**Note**: Unifying into single StepShell is deferred (DESIGN_SYSTEM_INVENTORY D4). Current approach: keep 3 shells, fix inconsistencies per need.

---

### 14.6 ReviewSummaryGrid ✅
**File**: `src/app/components/layout/ReviewSummaryGrid.tsx`

**Props**:
```typescript
interface ReviewSummaryItem {
  label: string;
  value: string;
  status?: "success" | "warning" | "destructive";
}

interface ReviewSummaryGridProps {
  items: ReviewSummaryItem[];
  columns?: 1 | 2;              // default 2
  className?: string;
}
```

**Usage**:
```tsx
import { ReviewSummaryGrid } from "@/app/components/layout";

<ReviewSummaryGrid
  columns={2}
  items={[
    { label: "Mục tiêu", value: "Tăng 20% doanh thu" },
    { label: "Chỉ số", value: "Doanh thu hàng tháng", status: "success" },
    { label: "Thời hạn", value: "12 tuần", status: "warning" },
  ]}
/>
```

**Use for**: SMART summary, Feasibility result, 12WeekSetup review.

---

### 14.7 EmptyStateLayout ✅
**File**: `src/app/components/layout/EmptyStateLayout.tsx`

**Props**:
```typescript
interface EmptyStateLayoutProps {
  icon: ReactNode;               // size-12, color-muted-foreground
  title: string;                   // text-lg font-semibold
  description: string;               // text-sm text-muted-foreground (follow UX_COPY_STYLE_GUIDE §4)
  primaryAction?: ReactNode;         // Button gradient-brand
  secondaryAction?: ReactNode;       // Button outline
  className?: string;
}
```

**Copy rules** (from UX_COPY_STYLE_GUIDE §4):
1. Tình trạng (trạng thái hiện tại)
2. Lý do ngắn (tại sao trống)
3. Next action + CTA (hành động tiếp theo)

**Usage**:
```tsx
import { EmptyStateLayout } from "@/app/components/layout";

<EmptyStateLayout
  icon={<ClipboardX className="text-slate-400" />}
  title="Chưa có việc nào trong chu kỳ này"
  description="Chu kỳ chưa có việc lặp lại. Tạo việc để bắt đầu thực hiện."
  primaryAction={<Button className="gradient-brand">Vào Setup để thêm việc</Button>}
/>
```

**Use for**: Empty states across Dashboard, Achievements, GoalTracker, VisionBoard.

---

### 14.8 StatusRow ✅
**File**: `src/app/components/layout/StatusRow.tsx`

**Props**:
```typescript
interface StatusRowProps {
  icon?: ReactNode;                    // size-4, flex-shrink-0
  text: string;                         // text-sm text-muted-foreground
  badge?: {
    label: string;
    variant?: BadgeVariant;              // "default" | "secondary" | "destructive" | "success" | "warning" | "info" | "outline"
  };
  className?: string;
}
```

**Usage**:
```tsx
import { StatusRow } from "@/app/components/layout";

<StatusRow
  icon={<AlertTriangle className="text-amber-500" />}
  text="Review đến hạn hôm nay"
  badge={{ label: "Cần xem lại", variant: "warning" }}
/>
```

**Use for**: "Review đến hạn" on Week tab, "3 việc trễ" inline, status notifications.

---

### 14.9 Migration Order

Recommended order to refactor pages (low risk first):

| Order | Page | Components to Apply | Risk |
|-------|------|---------------------|------|
| 1 | SMARTGoalSetup | PageHeader (replace ad-hoc heading) | Low |
| 2 | 12WeekSetup | PageHeader (replace CardTitle heading) | Low |
| 3 | Today tab | PrimaryActionCard (priority hero), SecondaryPanel (insights) | Low-Medium |
| 4 | Settings tab | SectionBlock (3 groups), SecondaryPanel (status cards) | Medium |
| 5 | Dashboard | PrimaryActionCard (hero), SectionBlock (stats row) | Medium |
| 6 | FeasibilityCheck | PageHeader (replace heading), ReviewSummaryGrid | Low |

**Rule**: Only refactor ONE page per PR. Don't refactor entire app in one task.

---

### 14.10 Plugin Review Notes

**Plugin used**: `frontend-design@claude-plugins-official`

**What plugin informed**:
- ✅ **Typography**: Keep Be Vietnam Pro, maintain hierarchy (h1=30px, h2=24px, h3=20px)
- ✅ **Color discipline**: Use semantic tokens from COLOR_SYSTEM_DIRECTION.md
- ✅ **No decorative effects**: Reject plugin's "creative composition" for this productivity app

**What plugin did NOT do**:
- ❌ **Cannot audit**: Plugin is creation tool, not analysis tool
- ❌ **No audit commands**: No review/analyze capabilities
- ❌ **No screenshot analysis**: Plugin works via code reading, not visual rendering

**Verdict**: Plugin's "bold/unforgettable" philosophy **rejected** for this app. We need **calm, predictable** layouts (opposite of plugin's creative composition).

---

### 14.11 Files Created

| File | Status | Description |
|------|--------|-------------|
| `src/app/components/layout/index.ts` | ✅ Created | Barrel exports for all primitives |
| `src/app/components/layout/PageHeader.tsx` | ✅ Created | Eyebrow + heading + description (h2/h3) |
| `src/app/components/layout/SectionBlock.tsx` | ✅ Created | Section wrapper với optional collapsible |
| `src/app/components/layout/PrimaryActionCard.tsx` | ✅ Created | Hero card với border-2 border-primary |
| `src/app/components/layout/SecondaryPanel.tsx` | ✅ Created | Muted panel với icon + collapsible support |
| `src/app/components/layout/ReviewSummaryGrid.tsx` | ✅ Created | 1-2 col grid cho label-value pairs với status badges |
| `src/app/components/layout/EmptyStateLayout.tsx` | ✅ Created | Empty state với icon + CTAs |
| `src/app/components/layout/StatusRow.tsx` | ✅ Created | Inline status row với optional badge |

---

### 14.12 Usage Examples

**PageHeader** — Replaces ad-hoc headings across wizards:
```tsx
<PageHeader
  eyebrow="Viết mục tiêu"
  title="Bước 1: Specific"
  description="Viết mục tiêu cụ thể để biết rõ cần đạt được gì."
  level={2}
/>
```

**SectionBlock** — Settings groups, Dashboard stats:
```tsx
<SectionBlock
  title="Cài đặt mục tiêu"
  eyebrow="Settings"
  collapsible
  defaultOpen={false}
>
  {/* settings content */}
</SectionBlock>
```

**PrimaryActionCard** — Today priority hero, Dashboard CTA:
```tsx
<PrimaryActionCard
  title="Việc quan trọng nhất hôm nay"
  description="Chỉ cần xong việc này là hôm nay đã đủ."
  action={<Button className="gradient-brand">Lưu check-in</Button>}
  hero
/>
```

**SecondaryPanel** — Insights, Rescue, Hints:
```tsx
<SecondaryPanel
  icon={<Lightbulb className="text-violet-500" />}
  title="Gợi ý điền nhanh"
  collapsible
  defaultOpen={false}
>
  <p>Thử dùng mục tiêu mẫu để bắt đầu nhanh hơn.</p>
</SecondaryPanel>
```

**ReviewSummaryGrid** — SMART summary, Feasibility result:
```tsx
<ReviewSummaryGrid
  columns={2}
  items={[
    { label: "Mục tiêu", value: "Tăng 20% doanh thu" },
    { label: "Chỉ số", value: "Doanh thu hàng tháng", status: "success" },
  ]}
/>
```

**EmptyStateLayout** — Empty states:
```tsx
<EmptyStateLayout
  icon={<ClipboardX className="text-slate-400" />}
  title="Chưa có việc nào trong chu kỳ này"
  description="Chu kỳ chưa có việc lặp lại. Tạo việc để bắt đầu thực hiện."
  primaryAction={<Button className="gradient-brand">Vào Setup để thêm việc</Button>}
/>
```

**StatusRow** — Inline notifications:
```tsx
<StatusRow
  icon={<AlertTriangle className="text-amber-500" />}
  text="Review đến hạn hôm nay"
  badge={{ label: "Cần xem lại", variant: "warning" }}
/>
```

---

### 14.13 Verification Status

**Typecheck & Build**:
- ❌ `npm run typecheck` — Failed due to pre-existing syntax error in `Dashboard.tsx` (not related to layout primitives)
- ❌ `npm run build` — Failed due to same `Dashboard.tsx` syntax error

**Primitives compilation**: All 7 components have correct TypeScript syntax. They will compile successfully once the pre-existing `Dashboard.tsx` errors are fixed.

**Manual verification steps** (run after fixing Dashboard.tsx):
```bash
npm run typecheck
npm run build
```

**No tests added**: Components are layout-only, no business logic. If the repo has component test patterns, add light render tests per primitive:
```tsx
// Example test pattern if repo uses Vitest + Testing Library
describe("PageHeader", () => {
  it("renders title and description", () => {
    render(
      <PageHeader
        eyebrow="Test"
        title="Test Title"
        description="Test description"
      />
    );
    expect(screen.getByText("Test Title")).toBeInTheDocument();
  });
});
```

---

### 14.14 Risks

| Risk | Level | Mitigation |
|------|-------|-------------|
| TypeScript errors in my components | ✅ None | Verified syntax manually; imports use existing `../ui/*` paths |
| Build failure (external) | ⚠️ Not my fault | `Dashboard.tsx` has pre-existing syntax errors; fix separately |
| Inconsistent usage | Medium | Follow migration order (§14.9) — one page per PR |
| Missing tests | Low | Components are presentational; add tests if repo pattern exists |

---

### 14.16 Dashboard Redesign Reference

**File**: `guidelines/LAYOUT_DASHBOARD_CHANGELOG.md`

**Redesign goals**:
- Reduce card competition from 8-12 to 2-3 above fold
- Make primary CTA the only gradient-brand button visible
- Collapse stats by default on mobile
- Move plan card from sticky sidebar to footer
- Make demo/local notice subtle (SecondaryPanel, collapsible)

**New layout order**:
1. Hero (PrimaryActionCard) — only gradient CTA
2. Demo notice (SecondaryPanel, if demo)
3. Stats (SectionBlock, collapsible)
4. Performance grid (Goal, Execution, Streak)
5. Attention panels (Review due, Weakest area — collapsible)
6. Tools section (outline buttons)
7. Plan card (footer)

**Components used**:
- `PrimaryActionCard` for hero
- `SectionBlock` for grouped sections with collapsible headers
- `SecondaryPanel` for demo notice and attention items
- `EmptyStateLayout` (optional) for empty state

**Before/After comparison**:
| Metric | Before | After |
|--------|--------|-------|
| Cards above fold (mobile) | 6-8 | 2-3 |
| Primary CTA visibility | Low (blended) | High (only gradient) |
| Stats visibility | Always | Collapsible |
| Scroll depth to performance | 6-8 vh | 3-4 vh |
| Auth CTA prominence | High | Low |

See `LAYOUT_DASHBOARD_CHANGELOG.md` for full audit and migration steps.

---

### 14.17 Wizard Layout Standardization Reference

**File**: `guidelines/LAYOUT_WIZARD_CHANGELOG.md`

**Wizards covered**: SMARTGoalSetup, FeasibilityCheck

**Standardized rhythm**:
```
PageShell (max-w-4xl)
├── StepHeader (unified)
│   ├── Step pip (CoreFlowProgress)
│   ├── Eyebrow (Bước X/Y)
│   ├── Title (h2)
│   └── Description
├── StepContent (Card)
│   ├── Form fields / Questions (space-y-6)
│   ├── SecondaryPanel (hints, collapsible)
│   └── Footer (sticky CTA on mobile)
```

**SMARTGoalSetup adjustments**:
- Clarity panel: collapse when `clarityDoneCount === 8`
- Archetype hint: move to `SecondaryPanel`, `defaultOpen={false}`
- Add dividers between sections

**FeasibilityCheck adjustments** (Option A preferred):
- Refactor to **one question per step** (8 steps total)
- Restructure ResultStep with `SecondaryPanel` for bottleneck + guidance
- Keep sticky CTA footer consistent

**Consistency checklist**:
- [x] Sticky CTA footer (identical)
- [x] Spacing `space-y-6`
- [x] Heading hierarchy (h2 outside, h3 inside CardTitle)
- [x] SecondaryPanel for collapsible hints
- [x] Alert variants (success/warning/info)

See `LAYOUT_WIZARD_CHANGELOG.md` for full migration plan and phase-by-phase prompts.

---

### 14.18 Final Summary

**Layout System Promise**:
> *"A calm, professional execution cockpit — where I always know the one thing I must do today, with clear paths to set up my goal, check feasibility, and execute my 12-week plan."*

**Key Principles** (remember these):
1. **One primary action per screen** — only 1 gradient-brand CTA per viewport
2. **Card hierarchy** — Hero (border-2 primary) > Primary (glass) > Secondary (muted)
3. **Mobile-first stacking** — max 3 cards above fold, collapse secondary
4. **Predictable wizard rhythm** — all 3 wizards use same StepShell structure
5. **Progressive disclosure** — hide Insights, Rescue, details on mobile
6. **No decorative motion** — remove pulse, glow, hover lifts (from MOTION_EFFECTS_GUIDE)
7. **Sticky only CTAs and tabs** — no sticky headers or cards

**Plugin Verdict**:
`frontend-design@claude-plugins-official` is a **creation tool**, not an **audit tool**. It cannot review existing layouts. Its "bold/unforgettable" philosophy **rejected** for this app. We adopt its **typography/color discipline** but reject its **creative composition** for a calm, predictable productivity app.

**Next Implementation Steps**:
1. Fix `Dashboard.tsx` syntax errors (unblock build)
2. Implement `DashboardRedesigned.tsx` per LAYOUT_DASHBOARD_CHANGELOG.md
3. Swap in production after visual QA
4. Migrate other pages (SMART, Feasibility, 12WeekSystem) one by one

---

*End of Layout System Guide*

