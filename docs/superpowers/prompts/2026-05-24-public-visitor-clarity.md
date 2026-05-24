# Cải thiện PublicVisitorView để user hiểu "app là gì" + "dùng ra sao"

> Copy block dưới đây paste sang AI khác. AI sẽ làm tuần tự Phase 1 → Phase 4. Sau mỗi phase có verify bắt buộc — không pass thì dừng, không sang phase sau.

---

## Bối cảnh

Dự án **Vision Board Web Platform** (tên hiển thị: **Dear Our Future**).

- Frontend: React 18, Vite, TypeScript, Tailwind, shadcn/ui, lucide-react, Vitest, React Testing Library
- Repo root: `C:\Users\admin\Downloads\Vision Board Web Platform\`
- Vietnamese-first communication. English chỉ dùng cho code/commit/identifier.
- Đọc trước: `CLAUDE.md` (root), `guidelines/MVP_1_SCOPE.md` để hiểu định vị sản phẩm.

### Vấn đề cần fix
Feedback thật từ người dùng: khi vào trang web, họ **không hiểu app này làm về cái gì** và **hoạt động ra sao**. Trang chủ public hiện tại (`PublicVisitorView`) có heading thơ mơ hồ ("Một chỗ tĩnh để bạn nhìn lại tuần sống của mình") và chỉ liệt kê 3 bước rời rạc, chưa cho thấy luồng sử dụng đầy đủ.

### Phạm vi
**Chỉ sửa 1 file:** `src/features/dashboard/v2/PublicVisitorView.tsx`.

Không động vào:
- Routes, storage, business logic, billing, auth.
- `NewUserSetupView`, `DashboardHero` (user đã onboard / đã có dữ liệu).
- `Dashboard.tsx` (chỉ là caller).
- Bất kỳ file test nào ngoài `PublicVisitorView` (nếu có test riêng).

### Nguyên tắc chung
- Giữ phong cách yên tĩnh: serif heading, màu token `app-*`, **không thêm animation/glow/3D**.
- Tuân thủ Tailwind class pattern hiện có trong file. Không thay thư viện UI.
- Không thêm dependency mới. Icon chỉ lấy từ `lucide-react`.
- Mobile-first: kiểm tra ở 375px, 768px, 1280px.
- Không sửa lan man ngoài 3 vùng dưới đây.

---

## Phase 1 — Viết lại Hero

### Mục tiêu
Heading hiện tại quá thơ. Thay bằng câu nói **thẳng app làm gì** và sub-text mô tả **dùng ra sao** trong 1 câu.

### File
`src/features/dashboard/v2/PublicVisitorView.tsx`

### Vùng cần sửa
Block `<div>` chứa eyebrow + h1 + sub (khoảng dòng 42-71, bắt đầu từ `<p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-app-ink-muted">` và kết thúc trước thẻ `<ul className="mt-5 flex flex-wrap gap-2">`).

### Before
```tsx
<p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-app-ink-muted">
  Xin chào, đây là Vision Board
</p>
<h1 className="mt-4 max-w-3xl font-serif text-[38px] font-medium leading-[1.12] tracking-[-0.02em] text-app-ink sm:text-[44px]">
  Một chỗ tĩnh để bạn nhìn lại{" "}
  <span className="relative inline-block">
    <span className="relative z-10">tuần sống</span>
    <svg ... >...</svg>
  </span>{" "}
  của mình.
</h1>
<p className="mt-4 max-w-2xl text-[16px] leading-7 text-app-ink-soft">
  Đi từ cân bằng cuộc sống, mục tiêu SMART, kế hoạch 12 tuần đến việc hôm nay. Ít màn hình hơn, rõ việc tiếp
  theo hơn.
</p>
```

### After
```tsx
<p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-app-ink-muted">
  Dear Our Future · Hệ thống mục tiêu 12 tuần
</p>
<h1 className="mt-4 max-w-3xl font-serif text-[38px] font-medium leading-[1.12] tracking-[-0.02em] text-app-ink sm:text-[44px]">
  Biến mục tiêu mơ hồ thành{" "}
  <span className="relative inline-block">
    <span className="relative z-10">kế hoạch 12 tuần</span>
    <svg
      aria-hidden="true"
      viewBox="0 0 200 12"
      preserveAspectRatio="none"
      className="absolute inset-x-0 -bottom-1 h-2.5 w-full text-app-warm"
    >
      <path
        d="M2 8 C 40 2, 80 10, 120 4 S 180 8, 198 5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  </span>{" "}
  và việc làm mỗi ngày.
</h1>
<p className="mt-4 max-w-2xl text-[16px] leading-7 text-app-ink-soft">
  Bạn chấm điểm các lĩnh vực sống, viết mục tiêu SMART, chia thành chu kỳ 12 tuần, rồi mỗi ngày
  chỉ cần mở Today để biết hôm nay làm gì và cuối tuần review lại — tất cả trong một nơi, lưu
  ngay trên thiết bị của bạn.
</p>
```

### Lưu ý
- Giữ nguyên SVG underline (chỉ chuyển ôm từ "tuần sống" sang "kế hoạch 12 tuần").
- Không đổi className hero ngoài text content.
- 3 chip trust (`<ul className="mt-5 flex flex-wrap gap-2">...`) và mockup preview card desktop **giữ nguyên 100%**.

### Verify Phase 1
```bash
npm run typecheck
npm run lint
```
Cả 2 phải pass, không có warning mới ở `PublicVisitorView.tsx`.

Visual check (manual, không bắt buộc nếu không có dev server đang chạy):
- Mở `/` ở chế độ ẩn danh (chưa login, chưa có localStorage data).
- Heading mới hiện đúng, underline ôm cụm "kế hoạch 12 tuần".

**Không sang Phase 2 nếu Phase 1 chưa pass verify.**

---

## Phase 2 — Thêm section "Cách hoạt động" (4 bước)

### Mục tiêu
Trả lời câu "app hoạt động ra sao" bằng 4 bước trực quan, có thời gian ước tính.

### File
`src/features/dashboard/v2/PublicVisitorView.tsx`

### Thay đổi import (đầu file)
Thêm icon mới vào import từ `lucide-react` — bổ sung `CalendarRange`, `Sun` (giữ nguyên các icon đang dùng):

```tsx
import {
  CalendarRange,
  Check,
  Compass,
  HardDrive,
  Lock,
  LogIn,
  RefreshCw,
  Smartphone,
  Sun,
  Target,
  UserPlus,
} from "lucide-react";
```

### Thêm const mới (đặt ngay phía trên `FEATURE_ROWS`, sau dòng `interface PublicVisitorViewProps`)

```tsx
const HOW_IT_WORKS_STEPS = [
  {
    step: "01",
    icon: Compass,
    title: "Soi cuộc sống",
    description: "Chấm điểm 4 lĩnh vực để biết nên ưu tiên đâu trước.",
    duration: "≈3 phút",
  },
  {
    step: "02",
    icon: Target,
    title: "Đặt mục tiêu SMART",
    description: "Biến mong muốn thành mục tiêu đo được và kiểm tra tính thực tế.",
    duration: "≈5 phút",
  },
  {
    step: "03",
    icon: CalendarRange,
    title: "Dựng chu kỳ 12 tuần",
    description: "Chia mục tiêu thành 2-4 thói quen tuần và cột mốc tuần 4/8/12.",
    duration: "≈10 phút",
  },
  {
    step: "04",
    icon: Sun,
    title: "Today + Review tuần",
    description: "Mở Today biết việc hôm nay, cuối tuần review để chỉnh tải.",
    duration: "Mỗi ngày 1-2 phút",
  },
] as const;
```

### Vị trí chèn JSX
Chèn **sau** block returning visitor banner (`{hasLocalData ? ... : null}`) và **trước** section 3 feature card hiện tại (`<section className="grid gap-4 lg:grid-cols-3" aria-label="Điểm nổi bật">`).

### Snippet JSX cần thêm
```tsx
<section
  className="rounded-card border border-app-line bg-app-surface p-5 md:p-6"
  aria-labelledby="dashboard-how-it-works-title"
>
  <div className="flex flex-col gap-1">
    <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-app-ink-muted">
      Cách hoạt động
    </p>
    <h2
      id="dashboard-how-it-works-title"
      className="font-serif text-[24px] font-medium leading-8 text-app-ink"
    >
      Từ mục tiêu mơ hồ đến việc hôm nay, trong 4 bước.
    </h2>
  </div>

  <ol className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    {HOW_IT_WORKS_STEPS.map((step) => {
      const Icon = step.icon;
      return (
        <li
          key={step.step}
          className="rounded-card border border-app-line bg-app-bg p-4"
        >
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-app-accent-soft text-app-accent">
              <Icon className="h-4 w-4" />
            </span>
            <span className="text-[12px] font-semibold uppercase tracking-[0.18em] text-app-accent">
              Bước {step.step}
            </span>
          </div>
          <h3 className="mt-3 text-[15px] font-semibold text-app-ink">{step.title}</h3>
          <p className="mt-1 text-[14px] leading-6 text-app-ink-muted">{step.description}</p>
          <p className="mt-3 text-[12px] font-medium text-app-ink-soft">{step.duration}</p>
        </li>
      );
    })}
  </ol>
</section>
```

### Lưu ý
- Dùng `<ol>` (ordered list) vì 4 bước có thứ tự.
- Giữ token `app-*`. Không hardcode hex.
- Không thêm animation/hover effect ngoài layout đã có.

### Verify Phase 2
```bash
npm run typecheck
npm run lint
```

Visual:
- 4 card hiển thị thành 1 cột (mobile), 2 cột (sm), 4 cột (lg).
- Icon + số bước + tiêu đề + mô tả + thời gian — không tràn ngang trên mobile 375px.

**Không sang Phase 3 nếu Phase 2 chưa pass.**

---

## Phase 3 — Đổi vai 3 feature card cũ thành "Vì sao chọn Dear Our Future"

### Mục tiêu
Vì Phase 2 đã thay vai "giới thiệu các bước", 3 card cũ (Compass/Target/RefreshCw — Bước 01/02/03) sẽ bị **trùng**. Đổi nội dung sang **3 lợi ích khác biệt** để bổ sung góc nhìn "vì sao dùng".

### File
Vẫn `src/features/dashboard/v2/PublicVisitorView.tsx`.

### Thay đổi `FEATURE_ROWS`

Before:
```tsx
const FEATURE_ROWS = [
  {
    step: "01",
    title: "Cân bằng trước mục tiêu",
    description: "Chấm nhanh các lĩnh vực sống để biết nên bắt đầu ở đâu.",
    href: "/life-balance",
    icon: Compass,
  },
  {
    step: "02",
    title: "SMART Goal có nhịp",
    description: "Biến mong muốn thành mục tiêu đo được, rồi nối vào chu kỳ 12 tuần.",
    href: "/smart-goal-setup",
    icon: Target,
  },
  {
    step: "03",
    title: "Review để không trôi",
    description: "Mỗi tuần có một điểm dừng ngắn để nhìn lại và chỉnh tải.",
    href: "/journal",
    icon: RefreshCw,
  },
] as const;
```

After:
```tsx
const FEATURE_ROWS = [
  {
    tag: "Local-first",
    title: "Mở là dùng được, không bắt đăng nhập",
    description: "Dữ liệu lưu ngay trên thiết bị của bạn. Đăng nhập chỉ khi muốn sao lưu lên cloud.",
    href: "/life-balance",
    icon: Lock,
  },
  {
    tag: "Đúng thứ tự",
    title: "Không phải trang trắng như Notion",
    description: "App dẫn bạn qua đúng các bước có nghiên cứu sau lưng, không bị rối khi mới bắt đầu.",
    href: "/12-week-setup",
    icon: Compass,
  },
  {
    tag: "Mobile-ready",
    title: "Đủ nhẹ cho buổi sáng vội",
    description: "Mở Today, tick xong việc, đóng lại. Không cần học UI phức tạp hay setup dài dòng.",
    href: "/today-v2",
    icon: Smartphone,
  },
] as const;
```

### Thay đổi vùng render `FEATURE_ROWS.map(...)` (khoảng dòng 184-212)

Vì shape const đổi từ `{step, title, description, href, icon}` sang `{tag, title, description, href, icon}`, **thay** đoạn render. Đồng thời đổi `aria-label` section.

Before:
```tsx
<section className="grid gap-4 lg:grid-cols-3" aria-label="Điểm nổi bật">
  {FEATURE_ROWS.map((feature) => {
    const Icon = feature.icon;

    return (
      <a
        key={feature.title}
        href={feature.href}
        className="group rounded-card border border-app-line bg-app-surface p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-app-accent/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-app-accent-soft text-app-accent transition-colors duration-200 group-hover:bg-app-accent group-hover:text-white">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-app-accent">
              Bước {feature.step}
            </p>
            <h2 className="mt-1 text-[16px] font-semibold text-app-ink">{feature.title}</h2>
            <p className="mt-1 text-[14px] leading-6 text-app-ink-muted">{feature.description}</p>
            <span className="mt-3 inline-flex text-[14px] font-medium text-app-accent transition-transform duration-200 group-hover:translate-x-0.5">
              Khám phá →
            </span>
          </div>
        </div>
      </a>
    );
  })}
</section>
```

After:
```tsx
<section className="grid gap-4 lg:grid-cols-3" aria-label="Vì sao chọn Dear Our Future">
  {FEATURE_ROWS.map((feature) => {
    const Icon = feature.icon;

    return (
      <a
        key={feature.title}
        href={feature.href}
        className="group rounded-card border border-app-line bg-app-surface p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-app-accent/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-app-accent-soft text-app-accent transition-colors duration-200 group-hover:bg-app-accent group-hover:text-white">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-app-accent">
              {feature.tag}
            </p>
            <h2 className="mt-1 text-[16px] font-semibold text-app-ink">{feature.title}</h2>
            <p className="mt-1 text-[14px] leading-6 text-app-ink-muted">{feature.description}</p>
            <span className="mt-3 inline-flex text-[14px] font-medium text-app-accent transition-transform duration-200 group-hover:translate-x-0.5">
              Tìm hiểu →
            </span>
          </div>
        </div>
      </a>
    );
  })}
</section>
```

### Verify Phase 3
```bash
npm run typecheck
npm run lint
```
- `Target` và `RefreshCw` vẫn được dùng ở các block khác trong file (`Target` dùng trong mockup preview, `RefreshCw` dùng trong banner "Có dữ liệu đã lưu" và trong 3 chip trust). **Không xoá khỏi import.**
- Nếu lint báo `'Target' is defined but never used`, kiểm tra lại — Target vẫn còn ở mockup. Nếu thật sự không còn dùng thì xoá khỏi import.

**Không sang Phase 4 nếu Phase 3 chưa pass.**

---

## Phase 4 — Verify tổng thể + test snapshot/render nếu có

### 4.1 Chạy đầy đủ
```bash
npm run typecheck
npm run lint
npm run test:run
npm run build
```

Tất cả phải pass. Nếu `npm run test:run` báo fail ở snapshot test liên quan đến PublicVisitorView/Dashboard → đó là **expected** vì text đã đổi. Cập nhật snapshot:

```bash
npm run test:run -- -u
```

Sau đó chạy lại `npm run test:run` để xác nhận pass.

### 4.2 Visual check thủ công

Mở dev server:
```bash
npm run dev
```

Mở 2 chế độ:
- Chưa có data, chưa đăng nhập → vào `/` phải thấy `PublicVisitorView` (KHÔNG phải `NewUserSetupView` hay `DashboardHero`).
- Có data local (chạy onboarding 1 lần để có data) → vào `/` phải thấy `DashboardHero` (KHÔNG phải view chúng ta vừa sửa).

Trong `PublicVisitorView` mới:
- [ ] Eyebrow: "Dear Our Future · Hệ thống mục tiêu 12 tuần"
- [ ] H1 mới với underline ôm cụm "kế hoạch 12 tuần"
- [ ] Sub-text 1 câu mô tả luồng dùng
- [ ] 3 chip trust (Local-first, Đồng bộ, Mobile) — không bị mất
- [ ] Mockup preview card desktop — không bị mất, chỉ hiện ở `md:` trở lên
- [ ] Banner "Có dữ liệu đã lưu" nếu `hasLocalData=true`
- [ ] Section "Cách hoạt động" với 4 card bước (mobile 1 cột, sm 2 cột, lg 4 cột)
- [ ] Section 3 card "Vì sao chọn Dear Our Future" với 3 lợi ích mới (Local-first / Đúng thứ tự / Mobile-ready)
- [ ] CTA cuối "Sẵn sàng dựng chu kỳ 12 tuần đầu tiên?" — không bị mất

Test 3 viewport: 375px, 768px, 1280px. Không bị tràn ngang, không bị che chữ.

### 4.3 Commit

```bash
git add src/features/dashboard/v2/PublicVisitorView.tsx
git commit -m "feat(dashboard): rewrite public visitor view to clarify what app does and how it works"
```

### 4.4 Báo cáo cuối

Báo về:
- Hash commit.
- Output 4 lệnh ở 4.1 (chỉ phần kết quả tổng kết, không paste full log).
- Có cập nhật snapshot test không.
- Còn warning/risk gì không.

---

## Quy tắc khi làm

- Tuân thủ `CLAUDE.md` ở repo root (không tự refactor file khác, không thêm dependency thừa, không Bash heredoc).
- Dùng tool `Read`/`Edit`/`Write` để sửa file, không dùng `cat >` hay `Set-Content`.
- Sau mỗi tool call hoàn tất thì tiếp tục autonomously đến hết phase, đừng dừng giữa chừng đợi user.
- Nếu lệnh shell fail, đọc lỗi, fix, chạy lại. Chỉ báo blocker khi thật sự không tự giải quyết được.
- Trả lời mình bằng **tiếng Việt**.

Bắt đầu từ **Phase 1**.
