# Sửa regression: LoginPage chặn redirect khi profile đang loading

> Copy block dưới đây paste sang AI khác. Làm tuần tự Phase 1 → Phase 3. Sau mỗi phase có verify bắt buộc.

---

## Bối cảnh

Dự án **Vision Board Web Platform** (tên hiển thị: **Dear Our Future**).

- Frontend: React 18, Vite, TypeScript, Tailwind, Vitest, React Testing Library
- Repo root: `C:\Users\admin\Downloads\Vision Board Web Platform\`
- Vietnamese-first communication. English chỉ dùng cho code/commit/identifier.
- Đọc trước: `CLAUDE.md` (root) để hiểu nguyên tắc làm việc.

### Vấn đề cần fix

Test pre-existing fail trên main branch:

```
FAIL  src/app/pages/LoginPage.test.tsx
  > redirects authenticated users while profile routing is still loading
  expect(await screen.findByTestId("destination")).toHaveTextContent("/12-week-system")
```

Test (file `src/app/pages/LoginPage.test.tsx`, dòng 235-253) set:
- `user = { uid: "user_pending_profile" }` (đã authenticated)
- `userProfile = null`
- `userProfileLoading = true`
- URL: `/login?next=%2F12-week-system`

Test mong đợi: LoginPage **redirect ngay** tới `/12-week-system` mà không đợi profile load.

Thực tế: LoginPage hiển thị card `LoginStatusCard title="Đang tải hồ sơ"` → test timeout vì không thấy `data-testid="destination"`.

### Nguyên nhân (đã điều tra)

- Commit `5ab779f9` (10/5/2026) "Fix post-login redirect while profile loads" đã sửa LoginPage để redirect ngay khi profile loading, **và** thêm test này để khoá lại hành vi đó.
- Commit `fd4b0955` (admin dashboard redesign) sau đó đã **reintroduce** logic block khi profile chưa sẵn sàng, gây regression.

Block gây regression hiện tại nằm ở `src/app/pages/LoginPage.tsx` khoảng dòng **143-154**:

```ts
// If already signed in, wait for profile so admin accounts can
// land directly in the admin console instead of the normal user workspace.
if (!authLoading && user) {
  if (userProfileLoading || (!userProfile && !userProfileError)) {
    return (
      <LoginStatusCard
        icon={<Loader2 className="h-5 w-5 animate-spin text-white" />}
        title="Đang tải hồ sơ"
        description="Hệ thống đang kiểm tra quyền tài khoản trước khi mở trang tiếp theo."
      />
    );
  }

  if (userProfile?.role === "admin") {
    return <Navigate to={redirectTo.startsWith("/admin/") ? redirectTo : "/admin/dashboard"} replace />;
  }

  if (userProfile) {
    return <Navigate to={redirectTo} replace />;
  }

  if (userProfileLoading || !userProfileError) {  // ← dead code, không bao giờ chạy do block phía trên
    return <Navigate to={redirectTo} replace />;
  }
  ...
}
```

### Trade-off cần hiểu trước khi sửa

Block "Đang tải hồ sơ" tồn tại để admin user (role=admin) được route thẳng vào `/admin/dashboard` thay vì `/` khi profile load xong. Nếu redirect ngay khi loading, admin user có thể tạm thời landing ở `/` trong vài trăm ms trước khi profile resolve.

**Hành vi chấp nhận được** vì:
1. AdminLayout (`src/app/components/admin/AdminLayout.tsx`) có guard riêng — sẽ tự handle loading + role mismatch khi user vào `/admin/*`.
2. Trải nghiệm "redirect ngay" tốt cho 99% user là non-admin (test khoá đúng case này).
3. Admin chấp nhận extra step: sau khi profile load, họ có thể tự navigate hoặc dùng saved bookmark.
4. Nếu vẫn muốn admin auto-route, làm trong follow-up task (vd RootLayout có useEffect kiểm tra role và redirect).

### Phạm vi

**Chỉ sửa 1 file:** `src/app/pages/LoginPage.tsx`.

Không động vào:
- `LoginPage.test.tsx` (test đã đúng, không sửa test để khớp bug).
- AdminLayout, RootLayout, AuthContext, ProtectedRoute.
- Routes, storage, billing.

---

## Phase 1 — Sửa LoginPage để bỏ chặn redirect khi profile loading

### Mục tiêu

Loại bỏ block `LoginStatusCard "Đang tải hồ sơ"` đầu tiên. Logic redirect mới:

1. Nếu profile đã có và role=admin → redirect tới `/admin/dashboard` (giữ nguyên).
2. Nếu profile đã có (user thường) → redirect tới `redirectTo` (giữ nguyên).
3. Nếu có `userProfileError` → hiển thị error card với nút Thử lại / Đăng xuất (giữ nguyên).
4. Còn lại (`userProfileLoading=true` HOẶC profile null mà chưa có error) → **redirect ngay** tới `redirectTo`.

### File

`src/app/pages/LoginPage.tsx`

### Vùng cần sửa

Khoảng dòng **143-184** (block `if (!authLoading && user) { ... }`).

### Before

```ts
// If already signed in, wait for profile so admin accounts can
// land directly in the admin console instead of the normal user workspace.
if (!authLoading && user) {
  if (userProfileLoading || (!userProfile && !userProfileError)) {
    return (
      <LoginStatusCard
        icon={<Loader2 className="h-5 w-5 animate-spin text-white" />}
        title="Đang tải hồ sơ"
        description="Hệ thống đang kiểm tra quyền tài khoản trước khi mở trang tiếp theo."
      />
    );
  }

  if (userProfile?.role === "admin") {
    return <Navigate to={redirectTo.startsWith("/admin/") ? redirectTo : "/admin/dashboard"} replace />;
  }

  if (userProfile) {
    return <Navigate to={redirectTo} replace />;
  }

  if (userProfileLoading || !userProfileError) {
    return <Navigate to={redirectTo} replace />;
  }

  return (
    <LoginStatusCard
      icon={<AlertCircle className="h-5 w-5 text-amber-600" />}
      title="Không tải được hồ sơ"
      description={userProfileError}
      action={
        // ... giữ nguyên
      }
    />
  );
}
```

### After

```ts
// If already signed in, route based on profile state.
// Admin users with a fully loaded profile go to the admin console.
// Other users (including profiles still loading) go to the requested destination immediately
// — admin layout will guard /admin routes server-side if a non-admin lands there.
if (!authLoading && user) {
  if (userProfile?.role === "admin") {
    return <Navigate to={redirectTo.startsWith("/admin/") ? redirectTo : "/admin/dashboard"} replace />;
  }

  if (userProfile) {
    return <Navigate to={redirectTo} replace />;
  }

  if (userProfileError) {
    return (
      <LoginStatusCard
        icon={<AlertCircle className="h-5 w-5 text-amber-600" />}
        title="Không tải được hồ sơ"
        description={userProfileError}
        action={
          // ... giữ nguyên action prop từ block cũ
        }
      />
    );
  }

  // userProfileLoading hoặc (profile null && chưa có error) → redirect ngay
  return <Navigate to={redirectTo} replace />;
}
```

### Lưu ý

- **Giữ nguyên block `action` của error card** (Button Thử lại + Đăng xuất, dòng ~173-184). Chỉ tái cấu trúc thứ tự if/else, không xoá nội dung error card.
- Sau khi sửa, có thể `Loader2` không còn được dùng trong file này. **Kiểm tra**: nếu Loader2 chỉ xuất hiện ở block vừa xoá, xoá import `Loader2` khỏi `lucide-react` import. Nếu Loader2 còn dùng chỗ khác (vd trong form submit), giữ import.
- Comment mới giải thích trade-off để người đọc sau hiểu lý do.

### Verify Phase 1

```bash
npm run typecheck
npm run lint
```

Cả 2 phải pass. Lint không có warning mới ở LoginPage.tsx (kể cả `Loader2 is defined but never used` — nếu có thì xoá import).

**Không sang Phase 2 nếu Phase 1 chưa pass.**

---

## Phase 2 — Chạy test LoginPage + test suite liên quan

### 2.1 Chạy đúng test bị fail

```bash
npx vitest run src/app/pages/LoginPage.test.tsx
```

Expected: **12 pass, 0 fail**.

Đặc biệt verify 3 test sau đều pass:
- `redirects an authenticated user back to the requested route`
- `sends authenticated admin users directly to the admin console`
- `redirects authenticated users while profile routing is still loading` ← test gốc fail

### 2.2 Chạy toàn bộ test suite

```bash
npm run test:run
```

Expected: pass count tăng đúng 1 so với baseline trước fix (1616 pass thay vì 1615). Không có test mới fail.

Nếu có test khác fail do thay đổi này (vd test cụ thể về "Đang tải hồ sơ" card), **dừng lại và báo cáo** — không tự sửa test trừ khi:
- Test đó assert nội dung "Đang tải hồ sơ" mà không có context khác → có thể xoá test vì hành vi đó đã thay đổi.
- Báo rõ test nào, expect/actual để mình duyệt trước.

### 2.3 Build

```bash
npm run build
```

Expected: pass, không bundle size warning mới.

**Không sang Phase 3 nếu Phase 2 chưa pass.**

---

## Phase 3 — Commit + báo cáo

### 3.1 Commit

```bash
git add src/app/pages/LoginPage.tsx
git commit -m "fix(auth): redirect after login while profile is still loading

Restore behavior from 5ab779f9 that admin redesign (fd4b0955) regressed.
LoginPage no longer blocks on userProfileLoading; non-admin users land
immediately at their requested next route. Admin auto-routing still works
once the profile resolves before navigation."
```

### 3.2 Báo cáo cuối

Báo về:
- Hash commit mới.
- Output `npx vitest run src/app/pages/LoginPage.test.tsx` (chỉ phần summary).
- Output `npm run test:run` (chỉ phần summary, confirm 1616 pass).
- Output `npm run typecheck`, `npm run lint`, `npm run build` (pass/fail).
- Có xoá import `Loader2` không.
- Có test nào khác fail không.
- Risk còn lại (vd admin landing ở `/` ngắn ngủi nếu profile chưa load).

---

## Quy tắc khi làm

- Tuân thủ `CLAUDE.md` ở repo root (không tự refactor file khác, không thêm dependency).
- Dùng tool `Read`/`Edit`/`Write` để sửa, không dùng `cat >` hay `Set-Content`.
- Sau mỗi tool call hoàn tất thì tiếp tục autonomously, đừng dừng đợi user xác nhận giữa chừng.
- Nếu lệnh fail, đọc lỗi, fix, chạy lại. Chỉ báo blocker nếu thật sự không tự giải quyết được.
- **Không sửa test** để khớp bug. Test gốc đã document hành vi đúng.
- Trả lời mình bằng **tiếng Việt**.

Bắt đầu từ **Phase 1**.
