# Blocker B1 — Backend rate-limit 429 + frontend bounce `/onboarding`

> Phát hiện trong P1 audit. Đây là blocker nặng nhất cho demo: nhiều người login cùng lúc trên 1 mạng lớp học → toàn phòng có thể bị bounce về `/onboarding` dù account đã có plan.
>
> Đọc trước: `qa-artifacts/p1-audit/REPORT.md` mục B1 + N4 (cloud data còn nguyên — chỉ là bootstrap profile bị 429).

---

## Triệu chứng

```
POST https://api.dearourfuture.io.vn/api/auth/profile → 429 Too Many Requests
console: Failed to bootstrap user profile. {message: "Too many requests...", status: 429}
→ AuthContext fallback null profile → LoginPage / RootLayout coi user chưa có data
→ Redirect về /onboarding mặc dù user đã có goal + plan trên backend
```

Phụ thuộc tail: `GET /api/billing/payment-history` và `GET /api/plans/{id}` cũng bị 429 — cùng rate-limit window.

## Mục tiêu fix

Phải đạt **CẢ HAI** trong 1 tuần demo:

1. **Backend**: nâng giới hạn rate-limit cho `/api/auth/profile` (route bootstrap đặc biệt — không được rate-limit cứng).
2. **Frontend**: nếu vẫn 429 (race condition, burst), KHÔNG được kick user về `/onboarding`. Phải giữ phiên local + retry mềm.

Đây là 2 sub-phase độc lập. Có thể giao 2 dev khác nhau.

---

## Sub-phase B1-BE — Backend rate-limit cho `/api/auth/profile`

### Phạm vi

File chính: `backend/src/server.ts` (rate-limit setup), `backend/src/middleware/rateLimit.ts` hoặc file middleware tương đương. Đọc `backend/src/middleware/` để xác định setup hiện tại.

### Phase BE-1: Diagnose

1. Đọc `backend/src/server.ts` từ đầu file, tìm chỗ `app.use(...)` cho rate-limit middleware (thường là `express-rate-limit`).
2. Đọc bất kỳ file `rateLimit*.ts` hoặc `middleware/index.ts`.
3. Note:
   - Limit hiện tại (vd `100 req / 15 min / IP`)?
   - Áp dụng global hay per-route?
   - Có whitelist nào không?
4. Kiểm tra route handler `/api/auth/profile` trong `backend/src/routes/auth*.ts`. Có gọi external service nào chậm (Firebase Admin verifyIdToken, MongoDB) khiến mỗi request lâu không?
5. Render tier: kiểm tra dashboard hoặc `backend/render.yaml` để xem free/paid plan, ảnh hưởng concurrent requests.

### Phase BE-2: Fix

3 options, recommend chọn theo độ ưu tiên:

**Option A (recommend)** — Tăng limit cho riêng `/api/auth/profile`:

```ts
// trong server.ts hoặc middleware setup
import rateLimit from "express-rate-limit";

const authProfileLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 phút
  max: 30,              // 30 req/phút/IP — đủ cho 1 lớp 25-30 người login cùng lúc
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please wait a moment and try again.", status: 429 },
  skip: (req) => req.method !== "POST" && req.method !== "GET", // chỉ rate-limit method liên quan
});

app.use("/api/auth/profile", authProfileLimiter);
```

**Option B** — Skip rate-limit cho route bootstrap nhưng giữ cho route mutation:

```ts
app.use("/api/auth/profile", (req, res, next) => {
  // bootstrap không bị rate-limit
  next();
});
```

Rủi ro: bị tấn công enumeration / brute force.

**Option C** — IP-aware: whitelist IP của trường (nếu biết) hoặc dùng `keyGenerator` theo Firebase UID thay vì IP:

```ts
const authProfileLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10, // per UID
  keyGenerator: (req) => req.user?.uid ?? req.ip,
});
```

Mỗi user 10 req/phút, IP lớp học share không bị bóp.

### Phase BE-3: Verify

```bash
cd backend
npm run typecheck
npm run lint
npm test
```

Sau đó test local:

```bash
npm run dev   # backend ở port 4000
# Trong terminal khác:
for i in {1..40}; do curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4000/api/auth/profile -X POST; done
```

Expect: 40 request → ≤ 30 trả 200/204 (nếu unauth), 10 trả 429. Hoặc với Option C: nếu cùng IP nhưng khác Firebase token → mỗi token được 10 req.

### Phase BE-4: Commit + deploy

```bash
git add backend/src/server.ts backend/src/middleware/...
git commit -m "fix(backend): raise rate-limit for /api/auth/profile bootstrap

Class demo on 2026-05-31 has ~30 attendees logging in simultaneously
from a single WiFi network. Old limit (100/15min global) was getting
exhausted by burst of profile-bootstrap requests, causing 429 → 
frontend bouncing authenticated users to /onboarding.

Apply per-route limiter at 30/min (option A) — sufficient for class
demo while preserving security."
```

Push + deploy Render (auto-deploy on push to main, hoặc trigger manual qua Render dashboard).

Verify production:

```bash
curl -i https://api.dearourfuture.io.vn/api/auth/profile -X POST
# Lặp 20 lần liên tiếp, đếm 429.
```

---

## Sub-phase B1-FE — Frontend 429 fallback trong AuthContext

### Phạm vi

File chính:

- `src/lib/auth/AuthContext.tsx` hoặc tương đương
- `src/lib/api/apiClient.ts` (interceptor 401/429)
- `src/app/components/RootLayout.tsx` (nếu có guard logic)

### Phase FE-1: Locate bootstrap call

1. Grep `auth/profile` trong `src/`:
   ```bash
   rtk grep -rn "auth/profile" src/ --include="*.ts" --include="*.tsx"
   ```
2. Đọc function bootstrap user profile (thường tên `bootstrapUserProfile`, `loadUserProfile`, `useUserProfile`).
3. Hiểu: khi gặp 429, hiện tại return gì? null? throw? Catch ở đâu?

### Phase FE-2: Implement fallback

Mong muốn: khi `/api/auth/profile` trả 429,

1. **Retry với exponential backoff** 3 lần (1s → 2s → 4s).
2. **Nếu vẫn 429 sau 3 retry**, KHÔNG set `userProfile = null`. Thay vào đó:
   - Đọc cache profile từ localStorage (`firebase_id_token`, `latest_user_profile_cache`).
   - Set `userProfile` từ cache nếu có.
   - Set `userProfileLoading = false` và `userProfileError = "rate_limited"`.
3. **AuthContext export thêm**: `isProfileFromCache: boolean`.
4. **RootLayout/LoginPage** kiểm tra `isProfileFromCache` → vẫn cho user vào `/12-week-system` nếu có cache; chỉ kick onboarding nếu **cache + backend đều null**.

### Code pattern đề xuất

```ts
// src/lib/auth/AuthContext.tsx (giả định)
async function bootstrapProfile(token: string): Promise<UserProfile | null> {
  const cacheKey = `latest_user_profile_cache:${token.slice(0, 20)}`;
  let attempt = 0;
  const delays = [1000, 2000, 4000];
  
  while (attempt <= 3) {
    try {
      const res = await fetch(`${API_BASE}/api/auth/profile`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.status === 429 && attempt < 3) {
        await sleep(delays[attempt]);
        attempt++;
        continue;
      }
      
      if (res.ok) {
        const profile = await res.json();
        localStorage.setItem(cacheKey, JSON.stringify(profile));
        return profile;
      }
      
      // 429 sau 3 retry hoặc lỗi khác
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        console.warn("[auth] using cached profile after 429");
        return JSON.parse(cached);
      }
      
      return null;
    } catch (err) {
      // network error
      const cached = localStorage.getItem(cacheKey);
      if (cached) return JSON.parse(cached);
      throw err;
    }
  }
  return null;
}
```

### Phase FE-3: Update guards

Trong file route guard / RootLayout, đảm bảo:

```tsx
// Trước
if (!authLoading && user && !userProfile) {
  return <Navigate to="/onboarding" replace />;
}

// Sau
if (!authLoading && user && !userProfile && !isProfileFromCache) {
  return <Navigate to="/onboarding" replace />;
}
```

(Tìm file thật và sửa logic này — đừng copy-paste cứng.)

### Phase FE-4: Verify

```bash
npm run typecheck
npm run lint
npm run test:run
npm run build
```

Test thủ công local (cần backend có thể fake 429):

1. Trong DevTools Network, intercept `/api/auth/profile`, override response status 429.
2. Login → verify console hiển thị 3 retry → cuối cùng dùng cache (nếu có).
3. Verify URL KHÔNG bounce sang `/onboarding`.

Hoặc test bằng cách run multiple parallel logins từ 1 IP để trigger thật.

### Phase FE-5: Commit

```bash
git add src/lib/auth/AuthContext.tsx src/lib/api/apiClient.ts src/app/components/RootLayout.tsx
# Cũng add test mới nếu có:
git add src/lib/auth/__tests__/AuthContext.429-fallback.test.ts
git commit -m "fix(auth): retry + cache fallback when /auth/profile returns 429

P1 audit found that fresh-context logins during class demo hit
backend rate-limit, causing authenticated users with existing 12-week
plans to be bounced to /onboarding. This patch:

- Retries auth/profile with exponential backoff (1s, 2s, 4s)
- Falls back to cached profile (localStorage) after retries exhausted
- Adds isProfileFromCache flag for guards to preserve session
- RootLayout no longer kicks user to /onboarding if cache available

Related: docs/superpowers/prompts/2026-05-24-loginpage-profile-loading-regression.md"
```

---

## Acceptance criteria cho cả B1

Trước khi đánh dấu B1 = DONE:

- [ ] Backend deploy production, curl test 30 req/phút trên `/api/auth/profile` không trả 429.
- [ ] Frontend deploy production, login fresh trên incognito → land thẳng `/12-week-system` (không qua `/onboarding`).
- [ ] Login đồng thời 5 tab incognito trên cùng IP → tất cả land `/12-week-system` (test "simulated class").
- [ ] Test khôi phục cache: tạm offline backend, login lại → vẫn vào `/12-week-system` nếu có cache, không bounce.

## Phụ thuộc tail (B1.5)

Sau khi B1 fix, kiểm tra lại 2 route phụ:

- `GET /api/billing/payment-history`
- `GET /api/plans/{id}`

Nếu vẫn 429, áp dụng cùng pattern (raise limit hoặc retry+cache). Note trong commit.

## Quy tắc khi làm

- KHÔNG tăng rate-limit lên `Infinity` — vẫn cần guard chống abuse.
- KHÔNG cache profile vô thời hạn — set TTL cache 1h nếu thêm field expiry.
- KHÔNG bypass Firebase token verify ở backend.
- Test rate-limit trên local trước khi deploy.
- Trả lời tiếng Việt.

Bắt đầu Phase BE-1 (đọc backend trước).
