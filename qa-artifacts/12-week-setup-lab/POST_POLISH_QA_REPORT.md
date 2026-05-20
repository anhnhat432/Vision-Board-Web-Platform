# Post-polish QA Report — /12-week-setup-lab

## Commands run
- `git status --short && git branch --show-current` — PASS. Branch: `main`. Worktree already had polish changes in `src/features/plan12week/...` and untracked `docs/ux/12-week-setup-lab-ai-simulated-test.md` before QA.
- `set VITE_APP_MODE=demo&& npm run dev -- --host 127.0.0.1 --port 5174` — PASS. Vite served `http://127.0.0.1:5174/`.
- `node scripts/qa-12-week-setup-lab.cjs` — PASS, exit code 0. Existing script created legacy `QA_REPORT.md` and baseline screenshots.
- `node qa-artifacts/12-week-setup-lab/post-polish-qa-runner.cjs` — PASS. Post-polish browser QA for required validation behavior and screenshot names.

## Viewports tested
- Mobile: 375 x 812
- Desktop: 1440 x 900

## Step 2 validation behavior
- Step 2 validation: không hiện lỗi đỏ khi mới vào Step 2.
- Step 2 validation: lỗi đỏ chỉ xuất hiện sau khi bấm Tiếp với tên trống.
- Step 2 validation: sau khi nhập tên việc, lỗi đỏ biến mất.

## Root cause Step 3 disabled
- Root cause: automation đang dùng disabled CTA để kích hoạt validation Step 2, nhưng `Tiếp →` ở Step 2 bị disabled bởi `currentStepValidationError` khi còn dưới 2 việc lặp lại hợp lệ. Playwright click thường timeout trên disabled button, nên runner kẹt trước khi seed đủ Step 2/Step 3. Đây là lỗi QA script, không phải lỗi UX Step 3.
- Sau khi buộc click validation riêng cho Step 2 rồi seed đủ 3 việc lặp lại hợp lệ, Step 3 có `lagMetricName`, `startDate` tương lai, `reviewDay` hợp lệ và không còn `startDateValidation.error`; nút `Tiếp →` enabled và đi được Step 4.

## Fix applied
- Sửa QA runner để force-click riêng kịch bản validation Step 2 trên CTA disabled và kiểm tra lỗi theo `p[role='alert']` thay vì scan toàn body. Không sửa source app, không sửa route chính, không đổi storage schema/backend/auth/paywall/submit.

## Full flow Step 1 → Step 4
- PASS — mobile flow đi được Step 1 → Step 4, sau đó chụp Step 4 mobile và desktop.

## Other checklist observations
- Full flow Step 1 → Step 4 pass: đã vào màn preview sau khi hoàn tất Step 3.
- Step 4 preview có phần 'Vì sao mục tiêu này quan trọng' và nội dung why dễ đọc trong viewport kiểm thử.
- Header/progress copy không ghi nhận pattern gây nhầm rõ ràng giữa progress tổng và wizard 4 bước nhỏ trong automation text scan.

## Screenshots
- `qa-artifacts/12-week-setup-lab/post-polish-step-1-mobile.png`
- `qa-artifacts/12-week-setup-lab/post-polish-step-2-mobile.png`
- `qa-artifacts/12-week-setup-lab/post-polish-step-2-validation.png`
- `qa-artifacts/12-week-setup-lab/post-polish-step-3-mobile.png`
- `qa-artifacts/12-week-setup-lab/post-polish-step-4-mobile.png`
- `qa-artifacts/12-week-setup-lab/post-polish-step-4-desktop.png`

## Commands not run
- `npm run typecheck`, `npm run build`, `npm run test:run -- 12Week` — không chạy vì chỉ sửa QA runner/report, không sửa source app.

## Console errors
- console.error: Không ghi nhận.
- uncaught exception: Không ghi nhận.
- failed network request: [
  {
    "url": "http://127.0.0.1:5174/@fs/C:/Users/admin/Downloads/Vision%20Board%20Web%20Platform/src/features/plan12week/hooks/useMutationQueueSync.ts",
    "failure": "net::ERR_ABORTED"
  },
  {
    "url": "http://127.0.0.1:5174/@fs/C:/Users/admin/Downloads/Vision%20Board%20Web%20Platform/src/app/components/ui/label.tsx",
    "failure": "net::ERR_ABORTED"
  },
  {
    "url": "http://127.0.0.1:5174/@fs/C:/Users/admin/Downloads/Vision%20Board%20Web%20Platform/src/features/plan12week/hooks/usePlan12Week.ts",
    "failure": "net::ERR_ABORTED"
  },
  {
    "url": "http://127.0.0.1:5174/@fs/C:/Users/admin/Downloads/Vision%20Board%20Web%20Platform/src/features/plan12week/hooks/usePlanExecutionSync.ts",
    "failure": "net::ERR_ABORTED"
  },
  {
    "url": "http://127.0.0.1:5174/@fs/C:/Users/admin/Downloads/Vision%20Board%20Web%20Platform/src/app/components/ui/textarea.tsx",
    "failure": "net::ERR_ABORTED"
  },
  {
    "url": "http://127.0.0.1:5174/node_modules/.vite/deps/recharts.js?v=79533b23",
    "failure": "net::ERR_ABORTED"
  },
  {
    "url": "http://127.0.0.1:5174/@fs/C:/Users/admin/Downloads/Vision%20Board%20Web%20Platform/src/features/plan12week/hooks/usePlanSetupSync.ts",
    "failure": "net::ERR_ABORTED"
  },
  {
    "url": "http://127.0.0.1:5174/@fs/C:/Users/admin/Downloads/Vision%20Board%20Web%20Platform/src/app/utils/text.ts",
    "failure": "net::ERR_ABORTED"
  },
  {
    "url": "http://127.0.0.1:5174/@fs/C:/Users/admin/Downloads/Vision%20Board%20Web%20Platform/src/app/utils/demo-feedback.ts",
    "failure": "net::ERR_ABORTED"
  }
]
- warnings: Không ghi nhận warning ảnh hưởng QA.

## Findings
- Step 1 mobile: có CTA/click target nhỏ hơn 40px: Bỏ qua điều hướng | Dear Our Future | Facebook | Trang chính | Tính năng | Gói & thanh toán | Hỏi đáp thanh toán | Về Dear Our Future | Liên hệ | Điều khoản dịch vụ | Chính sách bảo mật | Chính sách hoàn tiền
- Step 1: field order không đúng hoặc thiếu label theo checklist.
- Step 2 mobile: có CTA/click target nhỏ hơn 40px: Bỏ qua điều hướng | Dear Our Future | Facebook | Trang chính | Tính năng | Gói & thanh toán | Hỏi đáp thanh toán | Về Dear Our Future | Liên hệ | Điều khoản dịch vụ | Chính sách bảo mật | Chính sách hoàn tiền
- Step 3 mobile: có CTA/click target nhỏ hơn 40px: Bỏ qua điều hướng | Dear Our Future | Facebook | Trang chính | Tính năng | Gói & thanh toán | Hỏi đáp thanh toán | Về Dear Our Future | Liên hệ | Điều khoản dịch vụ | Chính sách bảo mật | Chính sách hoàn tiền
- Step 4 mobile: có CTA/click target nhỏ hơn 40px: Bỏ qua điều hướng | Dear Our Future | Facebook | Trang chính | Tính năng | Gói & thanh toán | Hỏi đáp thanh toán | Về Dear Our Future | Liên hệ | Điều khoản dịch vụ | Chính sách bảo mật | Chính sách hoàn tiền
- Step 4 desktop: có CTA/click target nhỏ hơn 40px: Bỏ qua điều hướng | Đăng nhập | Đăng ký | Chuyển sang chế độ tối | Dear Our Future | Facebook | Trang chính | Tính năng | Gói & thanh toán | Hỏi đáp thanh toán | Về Dear Our Future | Liên hệ | Điều khoản dịch vụ | Chính sách bảo mật | Chính sách hoàn tiền

## GO/POLISH/NO-GO recommendation
- POLISH — cần xử lý findings/console errors ở trên trước khi GO rộng hơn.
