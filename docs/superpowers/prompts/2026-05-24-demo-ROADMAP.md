# Demo Roadmap — Dear Our Future trước lớp

> Index của tất cả prompt liên quan demo, cập nhật sau khi có P1 audit findings.
> Ngày tạo: 2026-05-24. Demo dự kiến: ~ngày 31/5 (1 tuần).

---

## Đường đi đề xuất

```
P1 audit ✅ (xong) 
    ↓
B1 ⚠️ rate-limit fix     ━┓
B2 ⚠️ conflict banner    ━┫  ← Song song (3 dev khác nhau)
B3 🟡 billing decision   ━┛
    ↓
P2 polish copy
    ↓
P3 demo account + script + checklist
    ↓
P4 smoke + go/no-go
    ↓
🎤 Demo trước lớp
```

## Trạng thái prompt

| Prompt | File | Trạng thái | Ai chạy | Effort |
|---|---|---|---|---|
| P1 audit | [2026-05-24-demo-p1-production-audit.md](2026-05-24-demo-p1-production-audit.md) | ✅ DONE — commit `4de35b0d` | AI agent | ~3h |
| B1 rate-limit + 429 fallback | [2026-05-24-demo-blocker-b1-rate-limit.md](2026-05-24-demo-blocker-b1-rate-limit.md) | ✅ DONE — commits `f5f9f473` (BE) + `4e554625` (FE), đã merge main | Backend + Frontend | done |
| B2 sync conflict banner | [2026-05-24-demo-blocker-b2-sync-conflict-banner.md](2026-05-24-demo-blocker-b2-sync-conflict-banner.md) | ✅ DONE — commit `0b6e6dc0`, đã merge main | Frontend dev | done |
| B3 billing disabled copy | [2026-05-24-demo-blocker-b3-billing-disabled-copy.md](2026-05-24-demo-blocker-b3-billing-disabled-copy.md) | ✅ DONE (Option C) — commit `ecb599a2`, đã merge main. **PayOS đã cấu hình backend nhưng giữ tắt cho pilot — không gắn với deadline demo.** | Frontend dev | done |
| P2 polish copy | [2026-05-24-demo-p2-polish-copy.md](2026-05-24-demo-p2-polish-copy.md) | ✅ DONE — commit `f9208fa4` | Frontend dev | 2h |
| P3 demo account + script | [2026-05-24-demo-p3-demo-account-script.md](2026-05-24-demo-p3-demo-account-script.md) | ✅ DONE — commit `56ae5514`. **Đã viết xong Kịch bản & Checklist.** | Bạn (manual) + AI viết docs | 2h |
| P4 smoke + go/no-go | [2026-05-24-demo-p4-smoke-final.md](2026-05-24-demo-p4-smoke-final.md) | ⏳ chờ chạy (sau khi merge B1/B2/B3 deploy production xong) | AI agent | 3h |

## Lịch đề xuất 7 ngày

### Day 1 (HÔM NAY 2026-05-24) — Kick off blocker
- [ ] Quyết định Option A/B/C cho B3 (15 phút)
- [ ] Giao B1 cho backend dev + frontend dev (parallel)
- [ ] Giao B2 cho frontend dev
- [ ] Backend dev bắt đầu B1-BE (Phase BE-1 diagnose)

### Day 2 — Backend rate-limit done + B2 wrapping up
- [ ] B1-BE deploy production
- [ ] B2 deploy production
- [ ] Verify cả 2 trên live: login fresh không bị bounce, không banner conflict

### Day 3 — Frontend 429 fallback + B3
- [ ] B1-FE deploy
- [ ] B3 (Option C): copy + nav hidden, deploy
- [ ] Smoke nhanh: 5 login đồng thời từ 1 IP → tất cả vào `/12-week-system`

### Day 4 — P2 polish copy
- [ ] Sửa copy "không cần đăng nhập" (R1)
- [ ] Refine PublicVisitorView CTA, 3 chip, 3 card
- [ ] PR review + merge

### Day 5 — P3 demo account + script
- [ ] Tạo demo account `demo+lop@dearourfuture.com` (hoặc tương đương)
- [ ] Setup data 12-tuần đẹp: 30% tasks tick, 1 weekly review, week 3/12
- [ ] Viết file script demo 6 phút
- [ ] Viết file pre-flight checklist

### Day 6 — P4 smoke + go/no-go
- [ ] Chạy 8 lệnh smoke (typecheck/lint/test/build/env/mvp1/core-quality/prod:quick)
- [ ] Visual QA 10 page × 3 viewport
- [ ] Smoke production live URL với demo account
- [ ] Triage bug còn lại
- [ ] Ra quyết định Go/No-Go
- [ ] Tag release `demo-class-2026-05-31`

### Day 7 — Dress rehearsal + sáng demo
- [ ] Tối hôm trước: charge laptop, mang adapter, in QR backup
- [ ] Sáng demo: incognito, login demo account, 2 tab backup, tắt notification
- [ ] 🎤 GO!

## Decision points cần user trả lời

1. **B3 Option**: A (complete PayOS migration), B (rollback Casso), hay C (giữ disabled + polish copy)?  
   → Khuyến nghị **C**.

2. **B1 dev assignment**: ai làm backend? Có quyền deploy Render không?

3. **Demo account email**: email nào? (Cần inbox truy cập được nếu cần verify.)

4. **Bối cảnh demo**: môn gì, thầy ai, bao nhiêu phút? (Để customize script ở P3.)

5. **Có cần record video backup demo không?** Trong trường hợp WiFi/projector hỏng.

## Risk còn lại không có trong prompt nào

- **R3 Google OAuth chưa test E2E** — bạn tự click "Tiếp tục với Google" 1 lần trên laptop demo trước hôm chiếu để verify Firebase whitelist `dearourfuture.io.vn`.
- **N1 CSP cloudflare** — defer sau demo (không ảnh hưởng UX).
- **Performance LCP/FCP/CLS** — chưa đo. Nếu cần số, dùng Lighthouse hoặc PageSpeed Insights trước demo 1 ngày.
- **Test signup flow** — P1 không kiểm chứng do thiếu email. Bạn tự signup 1 lần trên laptop dự phòng.

## Quy tắc chung

- Mỗi blocker = 1 PR riêng, không gộp.
- Không tự merge — user duyệt.
- Không deploy production cuối tuần (trừ khi đã smoke staging trước).
- Sau mỗi prompt xong, AI dừng lại báo cáo + chờ user duyệt trước khi sang prompt kế.

## Liên hệ khẩn

Nếu bất kỳ blocker nào không xong trước demo, dùng plan B:

1. **Backup script**: demo flow với account đã setup, không động chạm login mới live → tránh B1.
2. **Skip /billing/plan** trong demo path → tránh B3.
3. **Demo trên laptop với `npm run dev`** (env real mode + cache profile sẵn) → tránh phụ thuộc network production.
