# AI Assistant Rollout & Operations Runbook (GĐ5)

Tài liệu vận hành cho giai đoạn rollout/A-B testing của Trợ lý AI "Cú".
Áp dụng cho signed-in real-mode users. Demo mode không bị ảnh hưởng.

## 1. Feature flags (env backend)

| Env | Mặc định | Ý nghĩa |
|---|---|---|
| `AI_ENABLE_STRUCTURED_OUTPUT` | `0` | Bật JSON mode cho nhánh action/workflow của Groq. |
| `AI_ENABLE_TELEMETRY` | `0` | Bật telemetry redacted (turn + client events). |
| `AI_ENABLE_STREAMING` | `1` | Kill-switch streaming Groq chat. `0` = ép buffered toàn bộ. |
| `AI_CANARY_PERCENT` | `100` | % signed-in real-mode users vào nhóm bật tính năng mới. |
| `AI_EXPERIMENT` | rỗng | Tên experiment A/B hiện tại (rỗng = không chạy A/B). |
| `AI_EXPERIMENT_VARIANTS` | `control` | Danh sách variant, cách nhau dấu phẩy. |
| `AI_SLO_P95_LATENCY_MS` | `12000` | Ngưỡng cảnh báo p95 latency. |
| `AI_SLO_ERROR_RATE_PCT` | `3` | Ngưỡng error rate (critical). |
| `AI_SLO_TIMEOUT_RATE_PCT` | `2` | Ngưỡng timeout rate. |
| `AI_SLO_RATE_LIMIT_RATE_PCT` | `5` | Ngưỡng rate-limit rate. |
| `AI_SLO_ACTION_FAIL_RATE_PCT` | `5` | Ngưỡng action fail rate. |
| `AI_SLO_AVG_TOKEN_BUDGET` | `4000` | Ngưỡng token trung bình mỗi turn. |
| `AI_COST_PER_1K_TOKENS_USD` | `0` | Đơn giá ước tính USD / 1K token (0 = tắt alert cost-USD). |
| `AI_SLO_TOTAL_COST_USD` | `0` | Ngưỡng chi phí ước tính USD trong cửa sổ (0 = tắt). |
| `AI_SLO_COST_WINDOW_MINUTES` | `60` | Cửa sổ (phút) cộng chi phí cost-USD (mặc định = USD/giờ). |
| `AI_SLO_SECRET_LEAK_MAX` | `0` | Số redaction secret/token (trong cửa sổ) tối đa trước khi alert critical. |
| `AI_SLO_SECRET_LEAK_WINDOW_MINUTES` | `60` | Cửa sổ (phút) đếm secret-leak hit; alert tự lành khi hit cũ trôi đi. |
| `AI_SLO_MIN_SAMPLE` | `20` | Số turn tối thiểu trước khi đánh giá SLO. |

Rollout/A-B chỉ deterministic theo session hash (one-way). Demo mode hoặc thiếu identity luôn trả `inCohort=true`, `variant=control`.

## 2. Endpoints vận hành (admin-only)

- `GET /api/ai/assistant/telemetry/overview` — provider health, quality proxy, cost, parse/repair, experiments theo route.
- `GET /api/ai/assistant/alerts` — danh sách alert SLO (chỉ đánh giá khi sample >= `AI_SLO_MIN_SAMPLE`).
- `POST /api/ai/assistant/telemetry` — ingest client events redacted (gate qua `AI_ENABLE_TELEMETRY`).

Tất cả chỉ trả metadata redacted; không bao giờ trả raw prompt/secret/session id.

## 3. Rollout theo lớp

1. Internal/staging: bật `AI_ENABLE_TELEMETRY=1`, chạy `npm run smoke:ai` + live eval.
2. Preview/demo: kiểm tra demo copy/fallback, không gọi protected sync.
3. Production canary: `AI_CANARY_PERCENT=5` -> `10` cho signed-in real-mode users; theo dõi `/alerts`.
4. Full rollout: nâng dần lên `100` khi SLO đạt và không có alert critical.

## 4. A/B testing

- Đặt `AI_EXPERIMENT=<tên>` và `AI_EXPERIMENT_VARIANTS=control,variant_a[,variant_b]`.
- Mỗi user được gán variant deterministic theo session hash (ổn định giữa các phiên).
- Đọc kết quả ở `telemetry/overview` mục `experiments`: turns, errorRate, p95 latency, avgTokenEstimate theo từng variant.
- So sánh variant với control; chỉ kết luận khi mỗi nhánh đủ mẫu.

### A/B report template

```text
Experiment: <tên>          Khoảng thời gian: <từ> -> <đến>
Variant   | turns | errorRate | p95 latency | avgToken | nhận xét
control   |       |           |             |          |
variant_a |       |           |             |          |
Quyết định: giữ control / promote variant_a / tiếp tục thu thập
```

## 5. Alerting & SLO

Alert sinh ra khi vượt ngưỡng env (xem mục 1):

- `AI_SLO_ERROR_RATE` (critical): provider error rate vượt ngưỡng.
- `AI_SLO_SECRET_LEAK` (critical): phát hiện secret/token bị redaction trong telemetry; đánh giá NGAY, không chờ đủ mẫu. Chỉ tính secret/token (email lành tính không tính); đếm theo cửa sổ `AI_SLO_SECRET_LEAK_WINDOW_MINUTES` nên alert tự lành khi hit cũ trôi đi.
- `AI_SLO_P95_LATENCY`, `AI_SLO_TIMEOUT_RATE`, `AI_SLO_RATE_LIMIT_RATE` (warning).
- `AI_SLO_ACTION_FAIL_RATE` (warning): action thực thi fail nhiều.
- `AI_SLO_AVG_TOKEN_BUDGET` (warning): chi phí token trung bình vượt budget.
- `AI_SLO_TOTAL_COST_USD` (warning): tổng chi phí ước tính (USD) vượt ngưỡng; chỉ bật khi có `AI_COST_PER_1K_TOKENS_USD` > 0.

Poll `GET /api/ai/assistant/alerts` định kỳ (vd mỗi 1-5 phút) từ job giám sát; nếu có alert critical -> kích hoạt mục 6.

## 6. Runbook xử lý sự cố

- Tắt nhanh tính năng mới: hạ `AI_CANARY_PERCENT=0` (rollback rollout không cần deploy lại code).
- Tắt structured output: `AI_ENABLE_STRUCTURED_OUTPUT=0`.
- Tắt streaming (UX lỗi/treo): `AI_ENABLE_STREAMING=0` -> mọi turn về buffered.
- Tắt A/B: xóa `AI_EXPERIMENT` (rỗng) -> mọi user về control.
- Provider lỗi/rate-limit kéo dài: deterministic fallback đã tự kích hoạt; cân nhắc đổi `AI_PROVIDER`/`AI_MODEL`.
- Token/cost spike: kiểm tra `cost` trong overview, siết context hoặc giảm `AI_CANARY_PERCENT`. Đặt `AI_COST_PER_1K_TOKENS_USD` + `AI_SLO_TOTAL_COST_USD` để cảnh báo theo tiền.
- Secret-leak alert (`AI_SLO_SECRET_LEAK`): điều tra ngay nguồn nhồi secret vào prompt/route/field; telemetry đã che giá trị nhưng cần chặn tại nguồn. Restart backend để reset bộ đếm sau khi xử lý.
- Privacy/incident: telemetry là metadata redacted in-memory; restart backend để xóa store nếu cần.

Mục tiêu: thời gian tắt một tính năng AI rủi ro < 15 phút bằng flags (không cần đụng core app).

## 7. Production smoke checklist

```bash
# Backend health + env
node scripts/check-runtime-env.mjs --full-stack

# AI live smoke (cần staging token)
AI_SMOKE_BASE_URL=https://your-backend.example.com AI_SMOKE_AUTH_TOKEN=<firebase-id-token> npm run smoke:ai
```

- [ ] `AI_ENABLE_TELEMETRY=1` ở staging/prod.
- [ ] `/telemetry/overview` trả dữ liệu (admin token).
- [ ] `/alerts` trả `evaluated=false` khi sample nhỏ, không 5xx.
- [ ] Canary percent đúng mức dự kiến.
- [ ] Không có demo copy/mock route leak vào real mode.
- [ ] Fallback hoạt động khi mô phỏng provider lỗi.
