# Paid MVP Provider Selection

Ngày đánh giá: 2026-05-02

Vai trò: Product + Payment Architect

---

## 1. Decision

### ✅ SELECTED: PayOS

Provider được chọn cho paid MVP sandbox: **PayOS**.

Context: Đồ án môn khởi nghiệp, mục tiêu qua môn. Không cần scale quốc tế, không cần subscription phức tạp, không cần hóa đơn VAT.

Lý do chọn PayOS:

- Hỗ trợ chuyển khoản ngân hàng / QR Pay — đúng phương thức thanh toán đã chọn
- VND native
- Cá nhân có thể đăng ký sandbox với CCCD
- API đơn giản, SDK Node.js, docs tiếng Việt
- Phí thấp (~1.1%)
- One-time payment link phù hợp mô hình billing đơn giản

**Trạng thái hiện tại**:

| Option                      | Trạng thái                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------ |
| SELECTED: PayOS             | ✅ **Hiện tại**                                                                      |
| UNDECIDED                   | — Đã quyết định                                                                      |
| PREPARE MULTI-PROVIDER ONLY | ✅ Đã làm — `PaymentProviderAdapter` interface + mock adapter + placeholder registry |

---

## 2. Required Inputs — Owner Phải Trả Lời

Không có câu trả lời cho các câu hỏi này thì KHÔNG được chọn provider, KHÔNG được code integration, KHÔNG được hứa thu tiền thật.

| #   | Câu hỏi                           | Tùy chọn                                                              | Trả lời hiện tại                                           |
| --- | --------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------- |
| 1   | **Thị trường mục tiêu**           | Việt Nam, quốc tế, cả hai                                             | ✅ **Việt Nam**                                            |
| 2   | **Đơn vị tiền tệ**                | VND, USD, EUR, multi-currency                                         | ✅ **VND**                                                 |
| 3   | **Loại hình doanh nghiệp / thuế** | Cá nhân, công ty TNHH, hộ kinh doanh, chưa đăng ký                    | ✅ **Cá nhân chưa đăng ký kinh doanh** (sinh viên / đồ án) |
| 4   | **Phương thức thanh toán**        | Thẻ quốc tế, thẻ nội địa, ví điện tử (MoMo/ZaloPay), chuyển khoản     | ✅ **Chuyển khoản ngân hàng**                              |
| 5   | **Mô hình billing**               | Monthly subscription, quarterly, yearly, one-time per cycle, lifetime | ✅ **One-time per 12-week cycle**                          |
| 6   | **Yêu cầu hóa đơn / thuế**        | Hóa đơn VAT, biên lai điện tử, không cần cho MVP                      | ✅ **Không cần cho MVP**                                   |
| 7   | **Chính sách hoàn tiền**          | 7 ngày, 30 ngày, không hoàn, case-by-case                             | ✅ **7 ngày**                                              |
| 8   | **Khoảng giá**                    | VD: 99k–199k VND/tháng, $5–$15/tháng                                  | ✅ **99.000 VND / chu kỳ 12 tuần**                         |
| 9   | **Mobile app trong tương lai?**   | Có (iOS/Android) → Apple/Google IAP constraints                       | ✅ **Không**                                               |

### Tác động của từng câu trả lời

| Nếu trả lời...                         | Thì provider...                                                               |
| -------------------------------------- | ----------------------------------------------------------------------------- |
| Thị trường VN + VND + ví điện tử       | → PayOS hoặc VNPay bắt buộc cho local payment                                 |
| Thị trường quốc tế + USD + thẻ quốc tế | → Stripe hoặc Paddle/Lemon Squeezy                                            |
| Cả hai                                 | → Stripe (quốc tế) + PayOS (VN local) hoặc Paddle (MoR xử lý thuế tự động)    |
| Cá nhân chưa đăng ký kinh doanh        | → Paddle/Lemon Squeezy (Merchant of Record — họ đứng tên bán)                 |
| Công ty VN                             | → Stripe hoặc PayOS (với hợp đồng merchant)                                   |
| Subscription hàng tháng                | → Stripe, Paddle, Lemon Squeezy (native subscription)                         |
| One-time hoặc lifetime                 | → Bất kỳ provider nào                                                         |
| Cần hóa đơn VAT                        | → Paddle (tự động), hoặc tự xuất + nộp thuế                                   |
| Mobile app tương lai                   | → Apple/Google IAP bắt buộc cho in-app purchase → cần cân nhắc hybrid billing |

---

## 3. So Sánh Provider

### 3.1 Stripe

| Tiêu chí                     | Đánh giá                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------ |
| **Subscription support**     | ✅ Native — Stripe Billing, trials, upgrades, downgrades, proration                  |
| **Webhook reliability**      | ✅ Xuất sắc — retry tự động, event log, CLI test, signing secret                     |
| **Customer portal / cancel** | ✅ Stripe Customer Portal — self-service cancel, update card, view invoices          |
| **Tax / invoice**            | ✅ Stripe Tax (tự động tính thuế), Stripe Invoicing, receipt PDF                     |
| **VN card / local payment**  | ❌ Không hỗ trợ thẻ nội địa VN, không ví điện tử VN                                  |
| **International payment**    | ✅ 195+ quốc gia, 135+ đơn vị tiền tệ, tất cả mạng thẻ lớn                           |
| **Developer complexity**     | 🟢 Trung bình — SDK tốt, docs xuất sắc, community lớn                                |
| **Refund / dispute**         | ✅ Native refund API, dispute management, evidence submission                        |
| **Phí**                      | 2.9% + $0.30 (US), 3.4% + $0.30 (VN-registered), phí bổ sung cho currency conversion |
| **Settlement**               | T+2 (US/EU), T+7+ (VN entity — chưa rõ nếu cá nhân)                                  |
| **Đăng ký merchant**         | Cần business entity hoặc sole proprietor — cá nhân VN có thể khó                     |
| **Mobile IAP**               | Không thay thế Apple/Google IAP cho in-app purchase                                  |

**Điểm mạnh**: Best-in-class cho SaaS subscription. Ecosystem lớn nhất. Adapter interface trong codebase đã thiết kế theo Stripe pattern.

**Điểm yếu**: Không cover được thanh toán nội địa VN. Merchant onboarding cho cá nhân VN chưa rõ.

### 3.2 PayOS

| Tiêu chí                     | Đánh giá                                                           |
| ---------------------------- | ------------------------------------------------------------------ |
| **Subscription support**     | ❌ Không có native subscription — chỉ one-time payment link        |
| **Webhook reliability**      | ⚠️ Có webhook nhưng không retry tự động, không event log dashboard |
| **Customer portal / cancel** | ❌ Không có — phải tự build                                        |
| **Tax / invoice**            | ❌ Không — tự xử lý                                                |
| **VN card / local payment**  | ✅ Thẻ nội địa, QR Pay, chuyển khoản liên ngân hàng                |
| **International payment**    | ⚠️ Hạn chế — chủ yếu Visa/Master qua ngân hàng VN                  |
| **Developer complexity**     | 🟢 Thấp — API đơn giản, SDK Node.js, docs tiếng Việt               |
| **Refund / dispute**         | ⚠️ Có refund API nhưng chargeback/dispute quy trình thủ công       |
| **Phí**                      | ~1.1% (nội địa), ~2.5–3% (quốc tế) — thấp hơn Stripe cho VN        |
| **Settlement**               | T+1 đến T+3 (VN bank account)                                      |
| **Đăng ký merchant**         | Cần đăng ký kinh doanh hoặc cá nhân có CCCD — dễ hơn Stripe cho VN |
| **Mobile IAP**               | Không thay thế Apple/Google IAP                                    |

**Điểm mạnh**: Dễ đăng ký cho VN market, phí thấp, QR Pay phổ biến tại VN. API đơn giản.

**Điểm yếu**: Không có subscription billing → phải tự build recurring logic. Không có customer portal. Webhook kém tin cậy hơn Stripe.

### 3.3 MoMo Business

| Tiêu chí                     | Đánh giá                                                 |
| ---------------------------- | -------------------------------------------------------- |
| **Subscription support**     | ❌ Không                                                 |
| **Webhook reliability**      | ⚠️ IPN callback — không retry tự động tiêu chuẩn         |
| **Customer portal / cancel** | ❌ Không                                                 |
| **Tax / invoice**            | ❌ Không                                                 |
| **VN card / local payment**  | ✅ Ví MoMo (30M+ user VN), QR                            |
| **International payment**    | ❌ Chỉ VN                                                |
| **Developer complexity**     | 🔴 Cao — docs hạn chế, sandbox hay lỗi, support chậm     |
| **Refund / dispute**         | ⚠️ Có refund nhưng quy trình thủ công, không API dispute |
| **Phí**                      | ~1–1.5% (ví MoMo)                                        |
| **Settlement**               | T+1 đến T+2                                              |
| **Đăng ký merchant**         | Cần đăng ký kinh doanh + hợp đồng MoMo Business          |
| **Mobile IAP**               | Không thay thế Apple/Google IAP                          |

**Điểm mạnh**: Phổ biến nhất VN cho ví điện tử. Phí thấp.

**Điểm yếu**: Chỉ ví MoMo, không thẻ. Không subscription. DX kém. Không phù hợp làm provider chính cho SaaS.

### 3.4 VNPay

| Tiêu chí                     | Đánh giá                                              |
| ---------------------------- | ----------------------------------------------------- |
| **Subscription support**     | ❌ Không native — chỉ one-time                        |
| **Webhook reliability**      | ⚠️ IPN callback — không retry chuẩn                   |
| **Customer portal / cancel** | ❌ Không                                              |
| **Tax / invoice**            | ❌ Không                                              |
| **VN card / local payment**  | ✅ Thẻ nội địa tất cả ngân hàng, QR VNPay, ví VNPay   |
| **International payment**    | ⚠️ Visa/Master qua ngân hàng VN                       |
| **Developer complexity**     | 🔴 Cao — docs cũ, sandbox phức tạp, checksum thủ công |
| **Refund / dispute**         | ⚠️ Có nhưng quy trình phức tạp                        |
| **Phí**                      | ~1–1.5% (nội địa)                                     |
| **Settlement**               | T+1 đến T+3                                           |
| **Đăng ký merchant**         | Cần đăng ký kinh doanh + hợp đồng VNPay               |
| **Mobile IAP**               | Không thay thế Apple/Google IAP                       |

**Điểm mạnh**: Phủ rộng nhất VN cho thanh toán ngân hàng + QR.

**Điểm yếu**: DX kém nhất trong danh sách. Không subscription. Không phù hợp SaaS.

### 3.5 Paddle

| Tiêu chí                     | Đánh giá                                                                   |
| ---------------------------- | -------------------------------------------------------------------------- |
| **Subscription support**     | ✅ Native — recurring, trials, proration, pause                            |
| **Webhook reliability**      | ✅ Tốt — retry, event log, signing                                         |
| **Customer portal / cancel** | ✅ Paddle.js checkout overlay + customer portal                            |
| **Tax / invoice**            | ✅ **Merchant of Record** — Paddle thu thuế, xuất hóa đơn, nộp VAT cho bạn |
| **VN card / local payment**  | ❌ Không hỗ trợ thanh toán nội địa VN                                      |
| **International payment**    | ✅ Rộng — thẻ quốc tế, PayPal, Apple Pay, Google Pay                       |
| **Developer complexity**     | 🟢 Trung bình-thấp — Paddle.js overlay, webhook SDK                        |
| **Refund / dispute**         | ✅ Paddle xử lý refund/chargeback thay bạn (MoR)                           |
| **Phí**                      | 5% + $0.50 (cao hơn Stripe)                                                |
| **Settlement**               | Net 15 (chậm hơn Stripe)                                                   |
| **Đăng ký merchant**         | ✅ **Không cần entity riêng** — Paddle là merchant, bạn là vendor          |
| **Mobile IAP**               | Không thay thế Apple/Google IAP                                            |

**Điểm mạnh**: MoR giải quyết hết vấn đề thuế/pháp lý/hóa đơn. Cá nhân chưa có công ty vẫn dùng được. Subscription native.

**Điểm yếu**: Phí cao nhất. Settlement chậm. Không cover VN local payment. Paddle có quyền từ chối vendor.

### 3.6 Lemon Squeezy

| Tiêu chí                     | Đánh giá                                               |
| ---------------------------- | ------------------------------------------------------ |
| **Subscription support**     | ✅ Native — subscription, one-time, license key        |
| **Webhook reliability**      | ✅ Tốt — signing, retry                                |
| **Customer portal / cancel** | ✅ Built-in customer portal                            |
| **Tax / invoice**            | ✅ **Merchant of Record** — tự xử lý thuế/VAT toàn cầu |
| **VN card / local payment**  | ❌ Không                                               |
| **International payment**    | ✅ Thẻ quốc tế, PayPal                                 |
| **Developer complexity**     | 🟢 **Thấp nhất** — API đơn giản, webhook rõ ràng       |
| **Refund / dispute**         | ✅ Lemon Squeezy xử lý (MoR)                           |
| **Phí**                      | 5% + $0.50 (tương đương Paddle)                        |
| **Settlement**               | Linh hoạt — Stripe Connect payout                      |
| **Đăng ký merchant**         | ✅ **Không cần entity** — MoR model                    |
| **Mobile IAP**               | Không thay thế Apple/Google IAP                        |

**Điểm mạnh**: DX đơn giản nhất. MoR model. Cá nhân dùng được. Tốt cho indie/solo SaaS.

**Điểm yếu**: Phí cao. Không VN local. Ít mature hơn Paddle/Stripe.

---

## 4. Ma Trận Đánh Giá Tổng Hợp

| Tiêu chí (trọng số)                | Stripe  | PayOS   | MoMo  | VNPay | Paddle | Lemon Squeezy |
| ---------------------------------- | ------- | ------- | ----- | ----- | ------ | ------------- |
| Subscription native (cao)          | ✅      | ❌      | ❌    | ❌    | ✅     | ✅            |
| Webhook reliability (cao)          | ✅      | ⚠️      | ⚠️    | ⚠️    | ✅     | ✅            |
| Customer portal (trung bình)       | ✅      | ❌      | ❌    | ❌    | ✅     | ✅            |
| Tax/invoice (tùy entity)           | ✅      | ❌      | ❌    | ❌    | ✅ MoR | ✅ MoR        |
| VN local payment (tùy market)      | ❌      | ✅      | ✅    | ✅    | ❌     | ❌            |
| International payment (tùy market) | ✅      | ⚠️      | ❌    | ⚠️    | ✅     | ✅            |
| Developer complexity (trung bình)  | 🟢      | 🟢      | 🔴    | 🔴    | 🟢     | 🟢            |
| Refund/dispute (trung bình)        | ✅      | ⚠️      | ⚠️    | ⚠️    | ✅     | ✅            |
| Phí (trung bình)                   | 🟢 2.9% | 🟢 1.1% | 🟢 1% | 🟢 1% | 🔴 5%  | 🔴 5%         |
| Không cần entity (cao nếu cá nhân) | ❌      | ⚠️      | ❌    | ❌    | ✅     | ✅            |

---

## 5. Recommendation

### 5.1 Provider nên dùng cho sandbox trước

**Nếu target = quốc tế hoặc cả hai**: → **Stripe** sandbox trước.

- Lý do: Adapter interface trong codebase (`PaymentProviderAdapter`) đã thiết kế theo Stripe pattern. Stripe test mode miễn phí, không cần merchant approval. Webhook CLI test local. Customer portal ready. Subscription billing native.
- Risk: Nếu sau cùng owner chọn VN-only market, Stripe sandbox work vẫn có giá trị vì adapter abstraction cho phép swap provider.

**Nếu target = VN only + VND**: → **PayOS** sandbox trước.

- Lý do: Dễ đăng ký nhất cho VN individual/business. Phí thấp. API đơn giản.
- Risk: Không có subscription native → cần tự build recurring billing logic (cron job + payment link mỗi kỳ). Customer portal phải tự build.

**Nếu cá nhân chưa có entity + quốc tế**: → **Lemon Squeezy** hoặc **Paddle** sandbox trước.

- Lý do: MoR model — không cần đăng ký kinh doanh. Họ xử lý thuế, hóa đơn, refund.
- Risk: Phí cao (5%). Không cover VN local payment.

### 5.2 Provider chưa nên dùng

| Provider          | Lý do chưa nên                                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **MoMo Business** | DX kém, không subscription, chỉ ví MoMo, không đủ scope cho SaaS billing. Có thể thêm sau như phương thức thanh toán phụ. |
| **VNPay**         | DX kém nhất, docs cũ, không subscription. Có thể thêm sau qua PayOS gateway thay vì direct integration.                   |

### 5.3 Conditional Recommendation Matrix

| Owner trả lời           | Provider khuyến nghị                       | Backup                       |
| ----------------------- | ------------------------------------------ | ---------------------------- |
| VN + VND + cá nhân      | PayOS                                      | Lemon Squeezy (MoR)          |
| VN + VND + công ty      | PayOS                                      | Stripe (nếu cần quốc tế sau) |
| Quốc tế + USD + cá nhân | Lemon Squeezy                              | Paddle                       |
| Quốc tế + USD + công ty | Stripe                                     | Paddle                       |
| Cả hai + cá nhân        | Lemon Squeezy (quốc tế) + PayOS (VN local) | Paddle + PayOS               |
| Cả hai + công ty        | Stripe (quốc tế) + PayOS (VN local)        | Paddle + PayOS               |

---

## 6. Risks

### 6.1 Legal / Tax Unknowns

| Risk                                          | Chi tiết                                                                                                                            | Severity      |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| **Chưa rõ loại hình kinh doanh**              | Cá nhân VN thu tiền online có thể cần đăng ký kinh doanh hoặc kê khai thuế TNCN. Không biết owner là cá nhân hay công ty.           | 🔴 Cao        |
| **Chưa rõ nghĩa vụ thuế**                     | Nếu bán cho khách quốc tế: có thể cần đăng ký VAT ở EU, GST ở Úc, sales tax ở Mỹ. MoR (Paddle/Lemon Squeezy) giải quyết vấn đề này. | 🔴 Cao        |
| **Chưa có privacy policy / terms of service** | Payment provider nào cũng yêu cầu có TOS + Privacy Policy trước khi approve merchant.                                               | 🔴 Cao        |
| **VN e-commerce regulations**                 | Bán dịch vụ online tại VN có thể cần thông báo với Bộ Công Thương.                                                                  | 🟡 Trung bình |

### 6.2 Chargeback / Refund

| Risk                      | Chi tiết                                                                                                                | Severity               |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| **Chưa có refund policy** | Nếu user yêu cầu hoàn tiền mà không có policy, có thể bị chargeback → phí phạt + freeze account.                        | 🔴 Cao                 |
| **Chargeback rate**       | Stripe/PayOS freeze merchant account nếu chargeback rate > 1%. Digital product dễ bị dispute vì "không nhận được hàng". | 🟡 Trung bình          |
| **MoR giảm risk**         | Paddle/Lemon Squeezy xử lý chargeback thay merchant. Nhưng họ có thể terminate vendor nếu dispute cao.                  | 🟢 Thấp (nếu dùng MoR) |

### 6.3 Webhook / Security

| Risk                              | Chi tiết                                                                                                      | Severity                                      |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| **Webhook raw body**              | Stripe cần raw body cho HMAC. Express `json()` middleware parse trước. Cần `express.raw()` cho webhook route. | 🟡 Trung bình — đã ghi nhận trong GO_NO_GO S2 |
| **Webhook retry**                 | Nếu server down khi provider gửi webhook → mất event. Cần dead-letter queue hoặc reconciliation job.          | 🟡 Trung bình — reconciliation CLI đã có      |
| **Sandbox → production key swap** | Sai key = charge thật trên test, hoặc test trên production. Cần env separation rõ ràng.                       | 🟡 Trung bình                                 |

### 6.4 User Support Burden

| Risk                            | Chi tiết                                                                                       | Severity      |
| ------------------------------- | ---------------------------------------------------------------------------------------------- | ------------- |
| **Chưa có support channel**     | Nếu user gặp lỗi thanh toán mà không liên lạc được → dispute/chargeback.                       | 🔴 Cao        |
| **Manual entitlement recovery** | Reconciliation CLI tồn tại nhưng dùng in-memory repo. Chưa có Mongo-backed.                    | 🟡 Trung bình |
| **Timezone / locale**           | VN user + VND + tiếng Việt copy nhưng provider checkout page có thể tiếng Anh (Stripe/Paddle). | 🟢 Thấp       |

---

## 7. Apple / Google In-App Purchase Constraints

Nếu owner có kế hoạch mobile app:

| Ràng buộc                     | Chi tiết                                                                                        |
| ----------------------------- | ----------------------------------------------------------------------------------------------- |
| **Apple IAP bắt buộc**        | Nếu bán digital content/subscription trong iOS app → bắt buộc dùng Apple IAP. Apple thu 15–30%. |
| **Google Play Billing**       | Tương tự cho Android. Google thu 15–30%.                                                        |
| **Web billing vẫn hoạt động** | User mua trên web không bị ảnh hưởng. Chỉ in-app purchase bị ràng buộc.                         |
| **Hybrid billing**            | Cần thêm Apple/Google IAP adapter riêng + receipt verification server-side.                     |
| **Hiện tại**                  | Product là web-only (README xác nhận). Chưa cần lo IAP.                                         |

---

## 8. Codebase Readiness

Architecture hiện tại **đã sẵn sàng** cho bất kỳ provider nào:

| Component                                  | Trạng thái                               |
| ------------------------------------------ | ---------------------------------------- |
| `PaymentProviderAdapter` interface         | ✅ Provider-agnostic                     |
| Mock adapter                               | ✅ 21 tests                              |
| Provider registry (`BILLING_PROVIDER` env) | ✅ mock/stripe/payos/momo/vnpay          |
| Placeholder adapter (safe 503)             | ✅                                       |
| `BillingService` + entitlement resolution  | ✅ 30 tests                              |
| Checkout endpoint                          | ✅ 7 tests                               |
| Webhook endpoint + signature verify        | ✅ 11 tests                              |
| Customer portal endpoint                   | ✅ 3 tests                               |
| Cancel endpoint                            | ✅ 4 tests                               |
| Reconciliation CLI                         | ✅ 16 tests                              |
| Billing models (Mongoose)                  | ✅ In-memory repos — Mongo migration cần |
| Real provider adapter                      | ❌ **Chưa có** — chỉ placeholder         |

**Effort estimate để thêm provider adapter**:

| Provider      | Effort   | Ghi chú                                                              |
| ------------- | -------- | -------------------------------------------------------------------- |
| Stripe        | 2–3 ngày | SDK mature, docs rõ, Stripe Checkout + Billing API + Webhook Signing |
| Lemon Squeezy | 2–3 ngày | API đơn giản, webhook signing, subscription native                   |
| Paddle        | 3–4 ngày | Paddle.js overlay, webhook signing khác Stripe                       |
| PayOS         | 3–5 ngày | Cần tự build subscription logic (recurring payment link + cron)      |
| VNPay         | 5–7 ngày | Docs cũ, checksum thủ công, không subscription                       |
| MoMo          | 5–7 ngày | DX kém, sandbox hay lỗi                                              |

---

## 9. Next Codex Prompt — Nếu SELECTED

Chỉ chạy prompt này SAU KHI:

1. Owner trả lời 8 câu hỏi §2
2. Provider được chọn
3. Refund policy + TOS + Privacy Policy đã có
4. Support email đã verify

```
Bạn là full-stack engineer. Implement [PROVIDER_NAME] payment adapter cho Plus subscription.

Trước khi code:
1. Đọc guidelines/PAID_MVP_PROVIDER_SELECTION.md.
2. Đọc guidelines/BILLING_STATUS_AND_PLAN.md.
3. Đọc backend/src/services/paymentProviderAdapter.ts (interface).
4. Đọc backend/src/services/paymentProviderRegistry.ts (registry).
5. Đọc backend/src/services/mockPaymentAdapter.ts (reference implementation).
6. Đọc backend/src/controllers/billingController.ts (checkout endpoint).
7. Đọc backend/src/controllers/webhookController.ts (webhook endpoint).

Tạo:
1. backend/src/services/[provider]PaymentAdapter.ts
   - Implement PaymentProviderAdapter interface
   - createCheckoutSession: tạo [PROVIDER] checkout session/payment link
   - verifyWebhookSignature: verify [PROVIDER] webhook signing secret
   - parseWebhookEvent: transform [PROVIDER] payload → NormalizedProviderEvent
   - mapSubscriptionStatus: [PROVIDER] status → domain status
   - createCustomerPortalSession: nếu provider hỗ trợ
2. Wire adapter vào paymentProviderRegistry.ts switch statement
3. Thêm env vars vào backend/.env.example:
   - [PROVIDER]_SECRET_KEY
   - [PROVIDER]_WEBHOOK_SECRET
   - [PROVIDER]_PRICE_ID_PLUS (hoặc product mapping)
4. Tests: adapter unit tests (checkout mock, webhook verify/parse, status map)

Nếu provider KHÔNG có subscription native (PayOS/VNPay/MoMo):
5. Tạo backend/src/services/recurringBillingScheduler.ts
   - Logic tạo payment link mới mỗi billing cycle
   - Cron-compatible function
   - Track next billing date per subscription

Không:
- Không sửa mock adapter
- Không sửa billing models
- Không sửa frontend
- Không thêm Mongo repos (task riêng)
- Không add PRO plan

Chạy:
npm --prefix backend run typecheck
npm --prefix backend run build
npm --prefix backend run test
```

---

## 10. Next Codex Prompt — Nếu UNDECIDED (hiện tại)

```
Bạn là product owner. Trả lời 8 câu hỏi trong
guidelines/PAID_MVP_PROVIDER_SELECTION.md §2.

Sau khi trả lời, cập nhật file đó:
- Đổi trạng thái từ UNDECIDED sang SELECTED: <provider>
- Điền câu trả lời vào bảng §2
- Cập nhật §5 Recommendation thành quyết định cuối cùng
- Không sửa source code

Nếu chưa sẵn sàng trả lời tất cả:
- Ghi rõ câu nào chưa trả lời được và tại sao
- Giữ trạng thái UNDECIDED
- Liệt kê action items cần làm trước khi quyết định
```

---

## 11. Quan Hệ Với Các Tài Liệu Khác

| Tài liệu                         | Vai trò                                                                                      |
| -------------------------------- | -------------------------------------------------------------------------------------------- |
| `PAID_MVP_GO_NO_GO.md`           | Quyết định NO-GO tổng thể — document này là input cho §B3 (provider questions)               |
| `PAID_MVP_PROVIDER_DECISION.md`  | Quyết định "DO NOT IMPLEMENT YET" — document này kế thừa và chi tiết hóa provider evaluation |
| `BILLING_STATUS_AND_PLAN.md`     | Trạng thái billing domain — document này tham chiếu architecture readiness                   |
| `PAID_MVP_READINESS_DECISION.md` | Quyết định "PREPARE ONLY" — document này consistent với decision chain                       |

---

## 12. Tóm Tắt

1. **Không chọn provider bừa** — thiếu 8 business constraints quan trọng.
2. **Architecture sẵn sàng** — `PaymentProviderAdapter` + mock + registry + 92 billing tests.
3. **Provider tốt nhất phụ thuộc vào market**: Stripe (quốc tế), PayOS (VN), Paddle/Lemon Squeezy (MoR cho cá nhân).
4. **Không hứa thu tiền thật** cho đến khi legal/tax/refund/support đã rõ.
5. **Next step**: Owner trả lời §2 → chọn provider → sandbox → production.
