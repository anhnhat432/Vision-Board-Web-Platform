# 📋 Hướng dẫn sử dụng Prompts để hoàn thiện dự án

## Tổng quan

Tài liệu này cung cấp **20 prompts được thiết kế chuyên biệt** để giúp bạn hoàn thiện Vision Board Web Platform MVP 1. Các prompts được chia theo độ ưu tiên và bao phủ tất cả critical bugs, UX issues, và improvements cần thiết.

## 📦 Files trong bộ prompts

```
Vision Board Web Platform/
├── PROMPTS_FOR_CLAUDE.md          # Chi tiết từng prompt (đọc kỹ)
├── PROMPTS_QUICK_REFERENCE.md     # Quick lookup table
├── TASK_LIST.md                   # Task tracking template
└── README_PROMPTS.md              # File này - hướng dẫn sử dụng
```

---

## 🎯 MVP 1 Goals

**Mục tiêu chính:** Tạo public demo local-first cho 12-week execution system

**Yêu cầu bắt buộc:**
- ✅ Hoạt động mà không cần login, Firebase, backend, real payment
- ✅ Data persisted in localStorage
- ✅ Mock upgrade rõ ràng là simulation
- ✅ Core flow từ onboarding đến weekly review mượt mà
- ✅ Mobile và desktop đều responsive

---

## 🚨 Critical: Top 10 Risks (P0)

**Phải fix TẤT CẢ trước khi release MVP 1:**

| # | Risk | Impact | Effort |
|---|------|--------|--------|
| 1 | Dashboard confusion (signed-out) | High | Low |
| 2 | Mobile scroll position | High | Low |
| 3 | Crowded 12-week layout | High | Medium |
| 4 | Heavy terminology | Medium | Low |
| 5 | Mock checkout trust | High | Medium |
| 6 | LocalStorage clarity | Medium | Low |
| 7 | Backend/auth noise in demo | High | Low |
| 8 | Weekly review blocked by paywall | High | Low |
| 9 | Poor plan quality | Medium | Medium |
| 10 | Production regression | High | Medium |

**Khuyến nghị:** Hoàn thành P0 trước khi chuyển sang P1/P2.

---

## 📖 Làm thế nào để sử dụng một prompt?

### Step 1: Chuẩn bị
```bash
# Mở project trong VS Code hoặc terminal
cd "Vision Board Web Platform"
npm run dev  # nếu chưa chạy dev server
```

### Step 2: Copy prompt
Mở `PROMPTS_FOR_CLAUDE.md`, tìm prompt bạn cần (ví dụ: Prompt 1), copy toàn bộ nội dung.

### Step 3: Dán vào Claude Code
Paste prompt vào Claude Code chat. Claude sẽ:
1. Tự động đọc files liên quan
2. Phân tích issue
3. Implement fix theo đúng rules
4. Chạy verification commands
5. Báo cáo kết quả

### Step 4: Verify
Sau khi Claude hoàn thành:
```bash
# Chạy commands được ghi trong prompt
npm run typecheck
npm run lint
npm run test:run
npm run build

# Test thủ công nếu cần
# Mở browser, test theo QA path trong prompt
```

### Step 5: Mark complete
Cập nhật `TASK_LIST.md`:
- [x] Prompt 1 - Dashboard confusion ✅
- Ghi notes về files changed và verification results

---

## 🎨 Example Workflow

Giả sử bạn muốn fix **Prompt 1: Dashboard confusion**

### Before (Expected current state):
- Signed-out user sees sample goals that look like real data
- No clear CTA to start
- UX confusing

### After (Expected result):
- Clean empty state OR clearly labeled "Example goals"
- Primary CTA: "Start Your 12-Week Plan"
- Clear demo labeling

### Steps:
1. Copy Prompt 1 từ PROMPTS_FOR_CLAUDE.md
2. Paste vào Claude Code
3. Claude đọc Dashboard.tsx và storage.ts, implement fix
4. Claude chạy `npm run typecheck`, `npm run build`
5. Claude báo cáo: "Fixed, here's what changed..."
6. Bạn verify:
   ```bash
   npm run dev
   # Mở incognito, verify clean dashboard
   ```
7. Mark complete trong TASK_LIST.md

---

## 📊 Prioritization Strategy

### Nếu bạn mới bắt đầu:
**Làm theo thứ tự này:**
1. Prompt 1 → 2 → 3 → 4 → 5 (P0 critical bugs)
2. Prompt 6 → 7 → 8 → 9 → 10 (P0 improvements)
3. Prompt 13 (Simplify layouts - affects UX)
4. Prompt 19 (TypeScript - makes everything easier)
5. Prompt 20 (Responsive - cần sau layout changes)
6. Prompt 18 (Loading states)
7. P1/P2 tasks theo nhu cầu

### Nếu bạn có deadline gấp:
**Chỉ làm P0 prompts (1-10) + Prompt 13 + Prompt 19:**
- Đảm bảo demo ổn định
- UX cơ bản tốt
- TypeScript clean để dễ maintain

### Nếu bạn muốn harden backend:
**Focus P1:**
- Prompt 11 (Retry logic)
- Prompt 12 (Conflict resolution)
- Prompt 17 (Retry queue)
- Prompt 16 (Backend tests)

---

## 🧪 Testing & Verification

### Mỗi prompt có verification section
Prompt luôn bao gồm:
1. **Commands to run** (typecheck, lint, build, etc.)
2. **Manual test steps** (nếu cần)
3. **Expected outcome** (phải thấy gì sau khi fix)

### Production smoke test (Bắt buộc trước release)
```bash
npm run smoke:prod
```

Nếu smoke fails:
1. Xem log để xem step nào fail
2. Fix issue đó trước khi tiếp tục
3. Nếu fails do credentials, document blocker rõ ràng

---

## 🐛 Bug Fix vs. New Feature

**Bug fix prompts** (1-10, 11-12, 18, 19):
- Fix existing functionality
- Không thêm features mới
- Focus trên stability

**Improvement prompts** (13-17, 20):
- Cải thiện UX/quality
- Có thể thêm code mới nhưng nhỏ
- Prioritize simplicity

**Không bao gồm trong prompts:**
- New product features (outside MVP scope)
- Major refactors
- Dependency additions

---

## 📝 Notes quan trọng khi implement

### LocalStorage Rules
```typescript
// ✅ ĐÚNG: Dùng existing storage helpers
import { saveGoal, loadGoal } from '@/app/utils/storage';

// ❌ SAI: Không rename storage keys
localStorage.setItem('my_new_key', ...); // NO!

// ✅ Nếu cần change shape, thêm migration:
const normalizeUserData = (oldData) => {
  return { ...oldData, newField: 'default' };
};
```

### Demo Mode Rules
```typescript
// ✅ ĐÚNG: Skip backend sync trong demo
if (appMode === 'demo') {
  return; // skip sync
}

// ❌ SAI: Không gọi backend trong demo mode
fetch('/api/goals', ...); // Must guard this!
```

### Billing Rules
```typescript
// ✅ Mock checkout phải rõ ràng là demo
<Button>Simulate Upgrade (Demo)</Button>
<p className="text-sm text-gray-500">
  This is a simulation. No real payment will be processed.
</p>

// ❌ Không hiển thị như real payment
<StripeCheckout /> // NO! Use mock provider
```

---

## 🆘 Khi nào cần hỗ trợ?

### Trước khi hỏi, hãy:
1. ✅ Đọc AGENTS.md kỹ
2. ✅ Chạy `npm run check` và xem lỗi gì
3. ✅ Xem console error trong browser DevTools
4. ✅ Kiểm tra .env có đúng không

### Khi hỏi, cung cấp:
- File name và line number của bug
- Error message đầy đủ
- Expected vs. actual behavior
- Screenshot nếu là UI issue
- Commands bạn đã thử

### Ví dụ hỏi tốt:
> "Prompt 3 - 12-week layout quá crowded. Tôi đã thêm collapse sidebar nhưng Today tab vẫn không nổi bật. Trang TwelveWeekSystem.tsx dùng flex layout với 4 tabs parallel. Làm sao để Today tab chiếm 70% width và các tab khác 30% trong sidebar?"

### Ví dụ hỏi CHẤT (tránh):
> "Project not working fix please" ❌

---

## 📈 Progress Tracking

### Sử dụng TASK_LIST.md:
1. Mở file
2. Tìm prompt bạn đang làm
3. Cập nhật status:
   - [ ] = Not started
   - [x] = Completed
4. Ghi notes về:
   - Files changed
   - Verification results
   - Blockers (nếu có)

### Weekly check-in:
- % Completion của P0
- Blockers hiện tại
- Plan cho tuần tới

---

## 🎓 Understanding Prompt Structure

Mỗi prompt trong PROMPTS_FOR_CLAUDE.md có cấu trúc:

```
## Prompt X: Title

**Context**: Tại sao cần fix này?

**Task**: Làm gì?

**Prompt for Claude**:
```
Toàn bộ prompt dành cho Claude Code
- Bao gồm file paths cần check
- Required changes chi tiết
- Verification steps
- Success criteria
```
```

**Claude sẽ làm:**
1. Đọc files được mention
2. Implement changes theo required list
3. Chạy commands verification
4. Báo cáo kết quả

---

## 🔄 Workflow cho team

### Single developer:
1. Pick one prompt
2. Work through it
3. Mark complete
4. Move to next

### Multiple developers:
1. Assign prompts (1-2 mỗi người)
2. Work in parallel
3. Daily sync về blockers
4. Merge carefully (git conflicts có thể xảy ra)

**Recommended division:**
- Dev 1: Prompt 1-5 (Dashboard → Mobile → Layout → Terminology → Checkout)
- Dev 2: Prompt 6-10 (Storage → Demo mode → Paywall → Plan quality → Smoke)
- Dev 3: Prompt 11-20 (Sync + Responsive + Tests)

---

## 🚀 Quick Start (5 phút)

1. **Đọc nhanh:**
   - PROMPTS_QUICK_REFERENCE.md (2 phút)
   - Top 10 Risks section (1 phút)

2. **Bắt đầu với Prompt 1:**
   - Copy prompt 1
   - Paste vào Claude Code
   - Nhấn Enter

3. **Verify kết quả:**
   ```bash
   npm run typecheck && npm run build
   ```

4. **Mark complete** trong TASK_LIST.md

5. **Lặp** với Prompt 2

---

## 💡 Best Practices

1. **Làm P0 trước** - chúng là blocking bugs
2. **Don't skip verification** - luôn chạy commands trong prompt
3. **Test manually** - automated tests không catch hết UX issues
4. **Keep changes small** - mỗi prompt nên là một focused change
5. **Commit after each prompt** - dễ rollback nếu cần
6. **Ask for help** nếu stuck sau 30 phút
7. **Read error messages** - chúng thường có hint về solution

---

## 📞 Support Channels

Nếu bạn cần hỗ trợ với prompts:

1. **Check AGENTS.md** - đã có đầy đủ technical details
2. **Check existing tests** - `src/**/*.test.tsx` có thể có hints
3. **Dev console** - browser DevTools cho runtime issues
4. **Network tab** - debug API calls (nếu có)
5. **VS Code Problems panel** - TypeScript errors

---

## 🎉 Khi hoàn thành

Khi tất cả P0 prompts (1-10) done:

1. Chạy full verification:
   ```bash
   npm run check:all
   ```

2. Manual QA trên cả desktop và mobile:
   - Fresh incognito test
   - Complete full flow
   - Test edge cases

3. Production smoke:
   ```bash
   npm run smoke:prod
   ```

4. Update `CURRENT_PROJECT_STATUS.md` nếu cần

5. Viết release notes:
   - What's working
   - Known limitations
   - Next steps (P1/P2)

6. **Celebrate!** 🎊 MVP 1 ready for demo!

---

## 📚 Additional Resources

### Files đã đọc:
- `CLAUDE.md` - Project rules
- `AGENTS.md` - Full architecture
- `guidelines/MVP_1_SCOPE.md` - MVP scope
- `guidelines/CURRENT_PROJECT_STATUS.md` - Current state

### Scripts hữu ích:
```bash
npm run dev              # Dev server (demo mode)
npm run dev -- --host    # Dev server on network
npm run check            # All checks
npm run qa:visual-ux-ui  # Visual QA (nếu có)
npm run env:check        # Verify env vars
```

### Environment variables:
```env
# Demo mode (default)
VITE_APP_MODE=demo
VITE_ANALYTICS_MODE=off
VITE_BILLING_PROVIDER_MODE=mock_provider

# Real mode (cần Firebase)
VITE_APP_MODE=real
VITE_API_BASE_URL=https://your-api.com
VITE_FIREBASE_API_KEY=...
# ... other Firebase config
```

---

**Ready to ship?** Bắt đầu với Prompt 1 và làm tuần tự!

**Questions?** Read AGENTS.md first, then ask with specific context.

**Good luck!** 🚀
