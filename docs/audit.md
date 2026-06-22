# Audit report

## Phạm vi

Audit tĩnh + chạy lệnh kiểm chứng trên frontend và backend, không sửa source code, không đọc/không in secrets.

## Lệnh đã chạy

| Lệnh                   | Kết quả | Ghi chú                                                                                                                                                       |
| ---------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`    | ✅ Pass | Frontend typecheck pass                                                                                                                                       |
| `npm run typecheck`    | ✅ Pass | Backend typecheck pass                                                                                                                                        |
| `npm run lint`         | ❌ Fail | 36 errors, 47 warnings, 2 infos; có lỗi a11y trong [`LifeAreaHealthIcon()`](src/app/components/illustrations/mini/LifeAreaIcons.tsx:19) và các icon liên quan |
| `npm run test:run`     | ✅ Pass | Frontend: 114 files, 1256 tests pass                                                                                                                          |
| `npm run build`        | ✅ Pass | Frontend build pass; có cảnh báo chunk lớn                                                                                                                    |
| `npm run build`        | ✅ Pass | Backend build pass                                                                                                                                            |
| `npm test`             | ❌ Fail | Backend test fail ở checkout billing; nhiều case trả `500` thay vì `200/503`                                                                                  |
| `npm audit --omit=dev` | ✅ Pass | Frontend: 0 vulnerabilities                                                                                                                                   |
| `npm audit --omit=dev` | ✅ Pass | Backend: 0 vulnerabilities                                                                                                                                    |

## Findings

---

### BUG-001

- Severity: high
- File + dòng liên quan: [`createCheckoutSession()`](backend/src/controllers/billingController.ts:182), [`createPublicCheckoutSession()`](backend/src/controllers/billingController.ts:285), [`resolveDiscountForCheckout()`](backend/src/services/discountService.ts:224), [`getActiveSaleEvent()`](backend/src/services/discountService.ts:73), assertions fail trong [`billingRoutes.test.ts`](backend/src/tests/billingRoutes.test.ts:332)
- Mô tả chính xác lỗi: Các route checkout billing phụ thuộc Mongo ngay từ đầu request, kể cả khi không dùng coupon và kể cả nhánh lẽ ra chỉ cần trả `503 provider_not_configured`. Khi DB không sẵn sàng, route trả `500` sau timeout thay vì `200` hoặc `503`.
- Cách tái hiện hoặc điều kiện gây lỗi: Chạy `npm test` trong backend. Các test checkout đang fail với `500 !== 200` và `500 !== 503` ở nhóm [`POST /api/billing/checkout-session`](backend/src/tests/billingRoutes.test.ts:258) và [`POST /api/billing/public-checkout-session`](backend/src/tests/billingRoutes.test.ts:433).
- Vì sao nó xảy ra: [`createCheckoutSession()`](backend/src/controllers/billingController.ts:182) và [`createPublicCheckoutSession()`](backend/src/controllers/billingController.ts:285) luôn gọi [`resolveDiscountForCheckout()`](backend/src/services/discountService.ts:224) trước khi resolve adapter/provider. Hàm này luôn gọi [`getActiveSaleEvent()`](backend/src/services/discountService.ts:73), và hàm đó luôn truy vấn [`DiscountModel.find()`](backend/src/services/discountService.ts:90). Kết quả là ngay cả nhánh mock/no-coupon/provider-misconfigured cũng vẫn chạm DB.
- Hướng sửa tối thiểu:
  1. Fast-fail nhánh `checkout_disabled` / `provider_not_configured` trước khi query discount.
  2. Chỉ query sale/coupon khi thực sự cần.
  3. Nếu sale lookup chỉ là tối ưu thương mại, chuyển sang best-effort thay vì biến toàn bộ checkout thành hard dependency vào Mongo.
- Test regression nên thêm: Thêm test route xác nhận checkout vẫn trả đúng `200` với mock provider hoặc `503 provider_not_configured` khi không có Mongo connection và request không mang coupon.
- Confidence: high

---

### BUG-002

- Severity: high
- File + dòng liên quan: [`upload`](backend/src/routes/assistantRoutes.ts:27), [`transcribeController()`](backend/src/controllers/assistantController.ts:324)
- Mô tả chính xác lỗi: Endpoint speech-to-text nhận file upload vào memory nhưng không giới hạn kích thước file, số file, hoặc MIME type.
- Cách tái hiện hoặc điều kiện gây lỗi: Gửi `multipart/form-data` rất lớn tới route [`/assistant/transcribe`](backend/src/routes/assistantRoutes.ts:58). Buffer của file sẽ được giữ hoàn toàn trong RAM qua [`req.file.buffer`](backend/src/controllers/assistantController.ts:333).
- Vì sao nó xảy ra: Route khởi tạo `multer` bằng [`multer({ storage: multer.memoryStorage() })`](backend/src/routes/assistantRoutes.ts:27) mà không cấu hình `limits` hay `fileFilter`. Controller sau đó dùng trực tiếp buffer mà không có guard kích thước.
- Hướng sửa tối thiểu:
  1. Thêm `limits.fileSize` và `limits.files`.
  2. Chặn MIME type ngoài danh sách audio được hỗ trợ.
  3. Trả `413` cho payload quá lớn và `400` cho loại file sai.
- Test regression nên thêm: Thêm backend route tests cho file quá lớn, nhiều file, và MIME type không hợp lệ.
- Confidence: high

---

### BUG-003

- Severity: medium
- File + dòng liên quan: [`handleCassoWebhook()`](backend/src/controllers/cassoWebhookController.ts:285), [`upsertSubscriptionFromProviderEvent()`](backend/src/services/billingService.ts:286), test [`treats Mongo duplicate key during save as an idempotent replay`](backend/src/tests/cassoWebhook.replay.test.ts:163), tham chiếu mẫu atomic ở [`claimPayosOrderAsCompleted()`](backend/src/controllers/payosWebhookController.ts:107)
- Mô tả chính xác lỗi: Casso webhook không claim đơn hàng một cách atomic trước khi chạy side effects. Test hiện tại cho thấy khi `order.save()` ném duplicate-key, handler vẫn đã gọi grant entitlement một lần nhưng response lại báo replay/không xử lý.
- Cách tái hiện hoặc điều kiện gây lỗi: Chạy backend test. Case [`treats Mongo duplicate key during save as an idempotent replay`](backend/src/tests/cassoWebhook.replay.test.ts:163) pass với bằng chứng `grantCalls === 1` nhưng response body là `processedCount: 0`.
- Vì sao nó xảy ra: [`handleCassoWebhook()`](backend/src/controllers/cassoWebhookController.ts:286) đọc pending order bằng `findOne`, sau đó chạy [`billingService.upsertSubscriptionFromProviderEvent()`](backend/src/controllers/cassoWebhookController.ts:345) rồi mới set `order.status = "completed"` và `save()` ở [`handleCassoWebhook()`](backend/src/controllers/cassoWebhookController.ts:360). Không có bước claim atomic kiểu [`findOneAndUpdate`](backend/src/controllers/payosWebhookController.ts:112) như flow PayOS.
- Hướng sửa tối thiểu:
  1. Đổi Casso sang pattern claim atomic giống [`claimPayosOrderAsCompleted()`](backend/src/controllers/payosWebhookController.ts:107).
  2. Chỉ grant entitlement / gửi receipt sau khi request thắng bước claim.
  3. Nếu claim thua race, trả duplicate mà không chạy side effects.
- Test regression nên thêm: Thêm test khẳng định khi claim/save thua race thì `billingService.upsertSubscriptionFromProviderEvent()` không được gọi.
- Confidence: medium

---

### BUG-004

- Severity: medium
- File + dòng liên quan: [`handleClear()`](src/app/features/assistant/AssistantObservabilityPanel.tsx:60)
- Mô tả chính xác lỗi: Tác vụ xóa toàn bộ event history của assistant vẫn dùng `window.confirm` thay vì dialog nội bộ.
- Cách tái hiện hoặc điều kiện gây lỗi: Mở panel observability và bấm clear history. Code đi qua [`window.confirm(...)`](src/app/features/assistant/AssistantObservabilityPanel.tsx:61).
- Vì sao nó xảy ra: [`handleClear()`](src/app/features/assistant/AssistantObservabilityPanel.tsx:60) gọi trực tiếp browser confirm thay vì dùng dialog component. Cách này không nhất quán với phần còn lại của app, kém testable hơn, và phụ thuộc UI blocking API của browser.
- Hướng sửa tối thiểu: Thay `window.confirm` bằng dialog nội bộ cùng pattern xác nhận đang dùng ở các destructive action khác.
- Test regression nên thêm: Thêm UI test cho flow clear-history xác nhận/cancel trong [`AssistantObservabilityPanel()`](src/app/features/assistant/AssistantObservabilityPanel.tsx:37), và test grep để chặn `window.confirm(` trong assistant surfaces.
- Confidence: high

---

### BUG-005

- Severity: low
- File + dòng liên quan: [`iconBase`](src/app/components/illustrations/mini/LifeAreaIcons.tsx:5), [`LifeAreaHealthIcon()`](src/app/components/illustrations/mini/LifeAreaIcons.tsx:19), [`LifeAreaCareerIcon()`](src/app/components/illustrations/mini/LifeAreaIcons.tsx:27), [`LifeAreaFinanceIcon()`](src/app/components/illustrations/mini/LifeAreaIcons.tsx:36), [`LifeAreaFamilyIcon()`](src/app/components/illustrations/mini/LifeAreaIcons.tsx:46), [`LifeAreaLearningIcon()`](src/app/components/illustrations/mini/LifeAreaIcons.tsx:55), [`LifeAreaMindIcon()`](src/app/components/illustrations/mini/LifeAreaIcons.tsx:65), [`LifeAreaFunIcon()`](src/app/components/illustrations/mini/LifeAreaIcons.tsx:76), [`LifeAreaRelationshipIcon()`](src/app/components/illustrations/mini/LifeAreaIcons.tsx:88)
- Mô tả chính xác lỗi: Bộ icon mini đang chặn lint frontend vì vi phạm rule a11y `noSvgWithoutTitle`.
- Cách tái hiện hoặc điều kiện gây lỗi: Chạy `npm run lint`. Output báo lỗi ở các icon trong [`LifeAreaIcons.tsx`](src/app/components/illustrations/mini/LifeAreaIcons.tsx) với message `Alternative text title element cannot be empty`.
- Vì sao nó xảy ra: Các component SVG export ra không có `<title>` hoặc nhãn thay thế, trong khi rule a11y đang yêu cầu text thay thế cho SVG. Ngoài ra [`iconBase`](src/app/components/illustrations/mini/LifeAreaIcons.tsx:5) hard-code `aria-hidden: true`, làm các icon luôn bị ẩn khỏi assistive tech dù có thể được tái sử dụng ở ngữ cảnh cần semantic label.
- Hướng sửa tối thiểu:
  1. Nếu icon chỉ mang tính trang trí, chuẩn hóa cách khai báo để lint hiểu chúng là decorative.
  2. Nếu icon có thể mang nghĩa nội dung, thêm `title`/`aria-label` và cho phép override `aria-hidden`.
- Test regression nên thêm: Thêm lint gate hoặc snapshot/accessibility test cho toàn bộ icon exports trong [`LifeAreaIcons.tsx`](src/app/components/illustrations/mini/LifeAreaIcons.tsx).
- Confidence: high

---

### BUG-006

- Severity: low
- File + dòng liên quan: trường [`code`](backend/src/models/DiscountModel.ts:33), index [`discountSchema.index({ code: 1 }, { unique: true })`](backend/src/models/DiscountModel.ts:104)
- Mô tả chính xác lỗi: Model discount khai báo unique index cho `code` hai lần.
- Cách tái hiện hoặc điều kiện gây lỗi: Chạy backend test. Output có nhiều warning của Mongoose: `Duplicate schema index on {"code":1}`.
- Vì sao nó xảy ra: [`code`](backend/src/models/DiscountModel.ts:33) đã có `unique: true`, nhưng schema lại khai báo thêm [`discountSchema.index({ code: 1 }, { unique: true })`](backend/src/models/DiscountModel.ts:104).
- Hướng sửa tối thiểu: Giữ đúng một cách khai báo unique index cho `code`.
- Test regression nên thêm: Thêm model-level test kiểm tra danh sách schema indexes chỉ còn một unique index cho `code`, hoặc assertion trong boot test để không còn warning duplicate index.
- Confidence: high

## Không ghi nhận finding ở các mục sau

- `npm audit --omit=dev` cho root package: không có vulnerability được báo.
- `npm audit --omit=dev` cho backend package: không có vulnerability được báo.
- Frontend và backend đều pass typecheck/build trong môi trường hiện tại.

## Ghi chú đánh giá

Báo cáo này chỉ giữ lại finding có bằng chứng trực tiếp từ source hoặc từ output lệnh đã chạy. Các nhận xét style/refactor thuần túy đã bị loại bỏ.
