# P4 — Smoke production + visual QA + final go/no-go

> Phase cuối trước demo. Chạy đầy đủ smoke automation, visual regression 3 viewport, fix bug blocker còn lại, ra quyết định go/no-go.

---

## Bối cảnh

- URL production: https://dearourfuture.io.vn/
- Repo root: `C:\Users\admin\Downloads\Vision Board Web Platform\`
- Đọc trước: `CLAUDE.md`, `qa-artifacts/p1-audit/REPORT.md`, output P2 (PR copy polish), output P3 (demo account + script + checklist).

## Phạm vi

1. Chạy automation smoke (4 lệnh).
2. Chạy visual QA full flow + capture artifact.
3. Triage bug blocker còn từ P1 và quyết định:
   - Fix nếu < 1h effort + impact cao.
   - Defer + note workaround nếu > 1h hoặc impact thấp.
4. Tạo file go/no-go decision.

Branch:

```bash
git checkout main
git pull origin main
git checkout -b qa/demo-final-smoke
```

## Phase 4.1 — Automation smoke

Chạy theo thứ tự (mỗi lệnh < 3 phút trừ build):

```bash
npm run typecheck
npm run lint
npm run test:run
npm run build
node scripts/check-runtime-env.mjs
node scripts/check-runtime-env.mjs --full-stack
```

Expected: tất cả pass. Note bất kỳ test fail mới (so với baseline 1616 pass sau commit 614b83a8).

Sau đó chạy smoke scripts dành riêng cho demo:

```bash
npm run smoke:mvp1
npm run smoke:core-quality
npm run smoke:prod:quick
```

Nếu `smoke:prod:quick` fail vì auth secret thiếu, ghi nhận lý do và **vẫn tiếp tục** P4.2 — script này yêu cầu GitHub secret, có thể chỉ chạy được trong CI.

## Phase 4.2 — Visual QA core flow

Khởi động dev server với env demo-safe để tránh login-gate:

```bash
# Tạo .env.development.local nếu chưa có
echo "VITE_APP_MODE=demo
VITE_BILLING_PROVIDER_MODE=mock_provider
VITE_ANALYTICS_MODE=off" > .env.development.local

npm run dev
```

Dùng Playwright MCP. Với mỗi viewport (1280, 768, 375), navigate qua chuỗi:

1. `/` (clear localStorage trước mỗi viewport)
2. `/onboarding`
3. `/life-insight`
4. `/smart-goal-setup`
5. `/feasibility`
6. `/12-week-setup`
7. `/12-week-system`
8. `/today-v2`
9. `/journal`
10. `/billing/plan`

Lưu screenshot vào `qa-artifacts/p4-visual/{viewport}/{step}-{slug}.png`.

Sau khi chụp, dùng `npm run qa:visual-ux-ui` nếu khả dụng:

```bash
npm run qa:visual-ux-ui
```

Script này so sánh với baseline. Note bất kỳ diff lớn nào.

## Phase 4.3 — Smoke production live

Vẫn dùng Playwright MCP, đổi target sang `https://dearourfuture.io.vn/`:

1. Test 3 viewport cho PublicVisitorView (đã làm ở P1, lặp lại để confirm sau P2 polish).
2. Login với demo account (P3) ở viewport 1280.
3. Verify `/12-week-system` load đúng dữ liệu đã setup.
4. Tick 1 task → verify auto-sync hoạt động (đợi 5s, refresh, vẫn ticked).
5. Logout.
6. Capture `qa-artifacts/p4-prod-smoke/*.png`.

Note timing: thời gian từ click login → tới `/12-week-system` (nếu > 5s là warning).

## Phase 4.4 — Triage bug blocker còn từ P1

Đọc `qa-artifacts/p1-audit/REPORT.md` section "🔴 Blocker". Với mỗi blocker:

| Decision tree |
|---|
| Effort < 1h **và** impact cao → fix ngay trong branch `qa/demo-final-smoke`. |
| Effort >= 1h **hoặc** impact thấp → defer, note workaround vào script demo (P3). |

Ví dụ bug có thể gặp:

- **CSP error cloudflare beacon**: defer. Workaround: vô hại, không note với lớp.
- **Plus upgrade redirect fail**: nếu fix nhanh được trong < 1h, fix; nếu không, defer + script demo không show flow này.
- **Auto-sync delay > 60s**: tăng polling interval hoặc note "có thể mất ~1 phút".

Mỗi fix → 1 commit nhỏ trong branch `qa/demo-final-smoke`.

## Phase 4.5 — Tạo file go/no-go decision

Tạo `docs/superpowers/specs/2026-05-24-demo-go-no-go.md`:

```markdown
# Go/No-Go Decision — Demo Dear Our Future trước lớp

**Ngày quyết định**: [YYYY-MM-DD]
**Người quyết định**: [tên]
**Demo dự kiến**: [YYYY-MM-DD HH:mm]

## Tóm tắt

[GO ✅ | NO-GO 🛑 | GO with caveats 🟡]

## Smoke results

| Lệnh | Kết quả | Note |
|---|---|---|
| typecheck | ✅/❌ | |
| lint | ✅/❌ | |
| test:run | ✅/❌ (X pass / Y fail) | |
| build | ✅/❌ | |
| env:check (basic) | ✅/❌ | |
| env:check (full-stack) | ✅/❌ | |
| smoke:mvp1 | ✅/❌ | |
| smoke:core-quality | ✅/❌ | |
| smoke:prod:quick | ✅/❌ | |
| qa:visual-ux-ui | ✅/❌ | diff X% |

## Visual QA

| Page × Viewport | 1280 | 768 | 375 |
|---|---|---|---|
| / | ✅/❌ | ✅/❌ | ✅/❌ |
| /onboarding | ✅/❌ | ✅/❌ | ✅/❌ |
| /life-insight | ✅/❌ | ✅/❌ | ✅/❌ |
| /smart-goal-setup | ✅/❌ | ✅/❌ | ✅/❌ |
| /feasibility | ✅/❌ | ✅/❌ | ✅/❌ |
| /12-week-setup | ✅/❌ | ✅/❌ | ✅/❌ |
| /12-week-system | ✅/❌ | ✅/❌ | ✅/❌ |
| /today-v2 | ✅/❌ | ✅/❌ | ✅/❌ |
| /journal | ✅/❌ | ✅/❌ | ✅/❌ |
| /billing/plan | ✅/❌ | ✅/❌ | ✅/❌ |

## Production smoke (live URL)

| Item | Status |
|---|---|
| URL load < 3s | ✅/❌ |
| Login demo account | ✅/❌ |
| /12-week-system data đúng | ✅/❌ |
| Task tick → sync | ✅/❌ |
| 3 viewport PublicVisitorView | ✅/❌ |

## Bugs đã fix trong P4

- Commit `xxx`: [mô tả]

## Bugs defer (đã có workaround trong script)

- [bug name]: workaround = [...]

## Risk còn lại

- ...

## Demo plan B

- Nếu Vercel down: dùng laptop với `.env.development.local` demo mode (đã chuẩn bị).
- Nếu cả 2 down: mở video record `qa-artifacts/demo-record.mp4` (nếu đã record sẵn).
- Nếu projector hỏng: in QR code đăng ký, share link qua chat lớp.

## Quyết định

[GO ✅] — sẵn sàng demo. Có [N] bug defer + workaround OK.
[NO-GO 🛑] — phải fix [list bugs] trước demo. Reschedule nếu không kịp.
[GO with caveats 🟡] — demo được nhưng cần né [list]. Note trong script demo.
```

## Phase 4.6 — Commit + push + tag

```bash
# Trên branch qa/demo-final-smoke (chỉ commit nếu có fix bug ở Phase 4.4)
git status
git add [files]
git commit -m "fix(demo): blocker [tên] before class demo"

# Add go/no-go doc
git add docs/superpowers/specs/2026-05-24-demo-go-no-go.md
git commit -m "docs(demo): final go/no-go decision"

git push origin qa/demo-final-smoke
```

Nếu GO ✅, merge vào main:

```bash
gh pr create --title "QA final cho demo lớp" --body "..."
# User tự duyệt + merge
```

Sau khi merge, tag release:

```bash
git checkout main
git pull
git tag -a demo-class-2026-05-31 -m "Demo trước lớp"
git push origin demo-class-2026-05-31
```

(Đổi ngày thành ngày demo thật.)

## Báo cáo cuối P4

- Status final: GO / NO-GO / GO with caveats.
- Hash commit + tag.
- Đường dẫn file go-no-go.md.
- Tổng số bug fix + bug defer.
- Khuyến nghị cuối cùng cho user (gồm tone reassurance hoặc warning).

## Quy tắc

- KHÔNG merge PR tự động, để user duyệt.
- KHÔNG tag/push tag nếu chưa được user duyệt go.
- KHÔNG chạy script production làm thay đổi data thật (vd seed migration).
- Trả lời tiếng Việt.

Bắt đầu Phase 4.1.
