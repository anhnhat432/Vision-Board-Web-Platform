# Week Tab UI Upgrade — Spec

## Surface
`src/app/components/twelve-week/TwelveWeekWeekTab.tsx` (shell) + sub-components:
`WeeklyRail`, `WeeklyHeroBeforeReview`, `WeeklyReviewForm`, `WeeklyReviewSummary`, `WeeklyEmptyFuture`.

Mixed surface (12-week execution = core product flow). UI-only; no storage/sync/auth/billing/entitlement changes.

## Audit Findings (code-based)
1. `WeeklyEmptyFuture` "Quay lại Tuần X" pill là `<span>` không có onClick — affordance chết. (line 57-60)
2. `WeeklyReviewForm` step-progress connector lines: `.weekly-step-line` absolute, không có positioned ancestor, `left:(idx/4)*100%` lệch +12.5% so với tâm dot → lines không nối dot. (lines 237-254)
3. `WeeklyReviewSummary` có "insights teaser" card cuối (line 331-343) — copy generic filler, không phải content thật, nằm sau next-week-recommendation CTA → dư.
4. Score số lớn (hero/summary) dùng CSS pulse static, chưa có count-up (dashboard đã có → product inconsistency).
5. Hero progress bar dùng `<Progress>` tĩnh, chưa có entrance motion (dashboard đã có motion.div → inconsistency).

## Acceptance (EARS)
- WHEN user views a future week, THE system SHALL make "Quay lại Tuần X" chọn tuần hiện tại khi click.
- WHEN the step-progress renders, THE connector lines SHALL span giữa tâm hai dot kề nhau (không trôi tới ancestor sai).
- WHEN a score number mounts into view, THE system SHALL count up from 0→value (trừ `prefers-reduced-motion`: hiển thị giá trị cuối ngay).
- WHEN the hero progress bar mounts, THE fill SHALL animate width 0→target (trừ reduced-motion: tức thì).
- WHERE the summary's next-week recommendation CTA exists, THE system SHALL NOT render filler "Góc nhìn tuần sau" card bên dưới.
- WHERE tests assert `weekly-review-check-*` và `weekly-review-readiness`, THE system SHALL giữ nguyên testid + text.

## Phases
1. Correctness: WeeklyEmptyFuture pill → button onSelectWeek(currentWeek); WeeklyReviewForm stepper restructure (flex line giữa dot, bỏ absolute math).
2. Focal + motion: CountUp trên 3 score (hero lead, form lead+lag, summary lead+lag); motion.div entrance trên hero progress bar (giữ shimmer class trên track).
3. Declutter: xoá WeeklyReviewSummary "insights teaser" filler card.
4. Verify: typecheck, lint, test:run, build.
5. Layout redesign (WeeklyHeroBeforeReview): thay score number lớn bằng conic-gradient progress ring 160px (focal premium, center number text-5xl + CountUp); gập "Chuẩn bị review" CTA từ card riêng vào footer hero (giảm 1 block, bớt scroll dọc). Audit Playwright (demo data inject, tuần 4 @57%) xác nhận ring render đúng, mobile footer flex-col + button full-width. Verify typecheck/lint/1395 test/build OK.
6. Redesign 3 vùng user chỉ (giữ logic):
   - WeeklyRail → dot-timeline: 12 node tròn (36px, current 44px) trên track line thay 12 card dày; W#/Check/Lock trong node, % dưới, "Hiện tại" badge trên current, state qua fill/border (success/error/accent/dashed).
   - TwelveWeekRescueNudge → compact: bỏ "•"+badge border noise, headline serif, suggestion 1 dòng (title truncate + hint truncate + button "Làm" inline), 245→226px.
   - WeeklyReviewForm → siết padding/spacing: hero p-8→p-6, body space-y-7→6, step card padding 1.5rem→1.25rem; body 1762→1694px, hero 315→299px.
   Giữ testid/data-suggestion-id/aria. Verify Playwright (rail circle 36/44px, rescue suggestion-id intact) + typecheck/lint/1395 test/build OK.
7. Refine sau ảnh user:
   - Rail: tuần đã review chốt hiện "✓" thay vì % (tránh checkmark + "0%" gây khó hiểu).
   - WeeklyReviewForm readiness box: từ 4 cột dày → dạng hàng ngang chip gọn (127px, -34px).
   - Step cards: bỏ shadow, border nhạt 40% opacity thay vì 1.5px solid line (nhẹ hơn).
   Verify typecheck/lint/1395 test/build OK.

## Risks
- Stepper restructure đụng JSX map → cần `Fragment` key; test không assert line structure → an toàn.
- CountUp render `<span>` thay text → giữ className/serif token; `data-testid="weekly-lead-score"` phải nằm trên CountUp span để test `getByTestId`仍 pass.
- motion.div thay `<Progress>` → giữ `weekly-progress-bar` shimmer trên track cha.
