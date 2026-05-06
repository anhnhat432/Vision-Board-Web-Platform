# Tổng hợp Prompt cho Claude AI - Vision Board Web Platform

## 🎯 Mục tiêu MVP 1
**Public demo local-first** cho hệ thống 12-week execution, chạy mà không cần:
- ❌ Login bắt buộc
- ❌ Firebase
- ❌ Backend
- ❌ Real payment
- ✅ LocalStorage + Mock upgrade

## 📋 Core Flow (Phải hoàn thiện)
```
Onboarding → Life Balance → Life Insight → SMART Goal → 
Feasibility Check → 12-Week Plan → Weekly Execution → Reflection/Review
```

## 🔥 Top 10 Critical Fixes (P0)

| # | Vấn đề | File liên quan | Prompt số |
|---|--------|----------------|-----------|
| 1 | Dashboard confusion (signed-out state) | Dashboard.tsx, storage.ts | 1 |
| 2 | Mobile scroll không reset | Onboarding pages, 12WeekSetup | 2 |
| 3 | 12-week layout quá crowded | TwelveWeekSystem.tsx | 3 |
| 4 | Terminology nặng (metric, tactic load) | Setup pages, review UI | 4 |
| 5 | Mock checkout trông như real payment | MockCheckout.tsx, billing UI | 5 |
| 6 | LocalStorage không rõ ràng | Settings, Dashboard | 6 |
| 7 | Backend/auth noise trong demo mode | apiClient.ts, sync hooks | 7 |
| 8 | Weekly review bị paywall chặn | Week tab components | 8 |
| 9 | Plan quality kém (quá nhiều task) | planGeneration.ts | 9 |
| 10 | Production regression | smoke:e2e, .env.production | 10 |

## 🛠️ Priority P1 (Backend Sync Hardening)

| # | Nhiệm vụ | Prompt số |
|---|----------|-----------|
| 11 | Retry logic cho sync failures | 11 |
| 12 | Conflict resolution (multi-device) | 12 |

## ✨ Priority P2 (Quality of Life)

| # | Nhiệm vụ | Prompt số |
|---|----------|-----------|
| 13 | Simplify desktop/mobile layouts | 13 |
| 14 | Add data export & delete | 14 |
| 15 | Improve smoke test coverage | 15 |
| 16 | Add backend controller tests | 16 |
| 17 | Durable retry queue | 17 |
| 18 | Add loading states | 18 |
| 19 | Fix TypeScript errors | 19 |
| 20 | Mobile-first responsive | 20 |

---

## 🚀 Cách sử dụng

1. **Chọn prompt** phù hợp với bug/feature cần làm
2. **Copy toàn bộ prompt** vào Claude Code
3. Claude sẽ tự động:
   - Đọc files liên quan
   - Implement changes
   - Chạy verification commands
4. **Kiểm tra kết quả** theo checklist trong prompt

## ✅ Verification Commands

```bash
# Frontend (luôn chạy sau mỗi thay đổi)
npm run typecheck
npm run lint
npm run test:run
npm run build

# Full check (broad changes)
npm run check

# Backend (nếu sửa backend)
npm --prefix backend run typecheck
npm --prefix backend run build

# Runtime env check
node scripts/check-runtime-env.mjs

# Production smoke (trước release)
npm run smoke:prod
```

## 📁 Important Files

### Documentation (Đọc trước khi làm)
- `CLAUDE.md` - Quick start & rules
- `AGENTS.md` - Full project guide
- `guidelines/MVP_1_SCOPE.md` - MVP scope & acceptance
- `guidelines/CURRENT_PROJECT_STATUS.md` - Current state
- `PROMPTS_FOR_CLAUDE.md` - Chi tiết từng prompt

### Source Code Structure
```
src/
├── app/
│   ├── pages/           # Route-level screens
│   ├── components/      # Shared UI
│   └── utils/           # storage.ts, app-mode.ts
├── features/
│   └── plan12week/      # 12-week logic
│       ├── components/
│       ├── hooks/
│       ├── persistence/
│       └── services/
└── lib/
    ├── api/             # API client
    └── auth/            # Firebase

backend/
└── src/
    ├── controllers/
    ├── routes/
    ├── services/
    └── models/
```

## ⚠️ Lưu ý quan trọng

1. **LocalStorage là source of truth** cho demo mode
   - Không đổi storage keys
   - Không clear data một cách tùy tiện
   - Thêm migration nếu thay đổi shape

2. **Demo mode phải chạy standalone**
   - Không require Firebase/backend
   - Mock checkout phải rõ ràng là simulation
   - Backend sync phải skip trong demo

3. **UI/UX rules**
   - Mobile-first
   - Plain language (không jargon)
   - Primary action luôn visible
   - Calm, scannable layouts

4. **Không được**
   - ❌ Thêm dependencies mới
   - ❌ Rewrite large areas
   - ❌ Hardcode secrets
   - ❌ Mix unrelated refactors
   - ❌ Assume real billing/stripe integration

## 🎯 Quick Start Workflow

```bash
# 1. Setup
npm ci
npm --prefix backend ci
Copy-Item .env.example .env

# 2. Run demo mode
npm run dev
# Open http://localhost:5173

# 3. Chạy prompt phù hợp
# 4. Verify với commands trên
# 5. Commit & di chuyển sang prompt tiếp theo
```

---

## 📊 Progress Tracking

Đánh dấu hoàn thành:

- [ ] Prompt 1-10 (P0 Critical)
- [ ] Prompt 11-12 (P1 Backend Sync)
- [ ] Prompt 13-20 (P2 Improvements)
- [ ] Full verification checklist
- [ ] Production smoke passing
- [ ] Release notes written

---

**Nếu cần hỗ trợ:**
- Đọc kỹ AGENTS.md trước khi hỏi
- Mô tả chính xác bug/issue
- Include relevant file paths
- Show error messages nếu có

**Best practice:** Làm P0 trước, verify từng bước, không nhảy qua.
