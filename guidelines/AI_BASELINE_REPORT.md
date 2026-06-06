# AI Assistant Baseline Report (Micro-phase G1)

Tài liệu baseline cho lộ trình nâng cấp AI (Groq) trong `.kilo/plans/1780702343229-jolly-cabin.md`.
Bám nguyên tắc local-first, real-mode safety, redaction chung. KHÔNG rewrite lớn.

## 1. Cấu hình provider tại thời điểm baseline (G0 đã chốt)

- Provider: Groq (`AI_PROVIDER=groq`).
- Model: `meta-llama/llama-4-scout-17b-16e-instruct` (default đã đồng bộ ở `backend/src/config/env.ts`).
- Endpoint: `https://api.groq.com/openai/v1/chat/completions` (OpenAI-compatible).
- Structured output (G3): gated `AI_ENABLE_STRUCTURED_OUTPUT` (default off).
- Telemetry (G4): gated `AI_ENABLE_TELEMETRY` (default off).
- Streaming: gated `AI_ENABLE_STREAMING` (default on).

## 2. Deterministic eval baseline (CI bắt buộc)

Nguồn: `src/app/features/assistant/__tests__/assistantEvals.test.ts` chạy qua `mockProvider`.
Lệnh: `npx vitest run src/app/features/assistant/__tests__/assistantEvals.test.ts --config vitest.fast.config.ts`.

Kết quả ghi nhận (cập nhật sau khi bổ sung G5 life_insight/feasibility):

- Tổng pass rate: 32/32 (100%).
- Safety-critical pass rate: 100% (categories: unsafe, invalid_action, safety).
- Rubric failures: 0 trên tất cả dimension (context_grounded, no_fabricated_id, asks_when_missing, valid_action_schema, concise, route_useful).

Breakdown theo category:

| Category | Pass |
|---|---|
| normal | 17/17 |
| missing_context | 8/8 |
| ambiguous | 2/2 |
| unsafe | 2/2 |
| invalid_action | 1/1 |
| safety | 1/1 |
| long_vietnamese | 1/1 |

Breakdown theo route core flow:

| Route | Pass |
|---|---|
| today | 12/12 |
| smart_goal | 6/6 |
| review | 4/4 |
| twelve_week | 3/3 |
| general | 3/3 |
| life_insight | 2/2 |
| feasibility | 2/2 |

Lưu ý: đây là baseline deterministic (mockProvider), dùng để chặn regression hành vi parse/safety.
Nó KHÔNG đo chất lượng câu trả lời thật của Groq.

## 3. Live eval / smoke (cần staging credentials)

Chưa chạy được trong môi trường này vì thiếu credential staging. Cần rerun khi có:

- Live eval: `npm run eval:ai:live` với `AI_EVAL_BASE_URL`, `AI_EVAL_AUTH_TOKEN` (Firebase ID token).
- Live smoke: `npm run smoke:ai` với `AI_SMOKE_BASE_URL`, `AI_SMOKE_AUTH_TOKEN`.

Các số sau cần đo trên staging và điền vào bảng dưới ở lần chạy đầu:

| Chỉ số | Cách lấy | Baseline |
|---|---|---|
| First-token latency p50/p95 | log stream `[Groq]` | chưa đo (cần staging) |
| Full response latency p50/p95 | telemetry `latencyMs` | chưa đo (cần staging) |
| Rate-limit rate (429) | telemetry errorCode | chưa đo (cần staging) |
| Invalid action block rate | `getAssistantParseMetrics()` | chưa đo (cần staging) |
| Repair rate | `getAssistantParseMetrics()` | chưa đo (cần staging) |
| Timeout rate | telemetry errorCode | chưa đo (cần staging) |

## 4. Reliability đã bổ sung sau baseline (G7)

- Timeout Groq configurable: `AI_GROQ_TIMEOUT_MS` (default 30000).
- Retry nhẹ 429: `AI_GROQ_MAX_RETRIES_ON_429` (default 1) + backoff `AI_GROQ_RETRY_BASE_DELAY_MS` (default 500).
- Circuit breaker: `assistantCircuitBreaker.ts`, ngưỡng `AI_GROQ_CIRCUIT_FAILURE_THRESHOLD` (default 4),
  cooldown `AI_GROQ_CIRCUIT_COOLDOWN_MS` (default 30000). Khi mở, request Groq fallback deterministic.

## 5. Top rủi ro AI cần theo dõi (định tính)

1. Rate-limit Groq khi tải cao -> đã có retry + circuit breaker + deterministic fallback.
2. Invalid action block từ model nhỏ -> structured output (G3) + repair pass.
3. Hallucinated taskId/goalId -> parser kiểm ID từ context + eval mustUseExistingTaskId.
4. Rò rỉ secret trong prompt/log -> redaction chung + eval unsafe categories.
5. Context lớn gây tốn token -> context budget report (G6) để theo dõi phần bị trim.

## 6. Cách rerun baseline

```bash
# Deterministic (luôn chạy được, CI bắt buộc)
npm run typecheck
npx vitest run src/app/features/assistant/__tests__/assistantEvals.test.ts --config vitest.fast.config.ts

# Live (chỉ khi có staging credentials)
AI_EVAL_BASE_URL=... AI_EVAL_AUTH_TOKEN=... npm run eval:ai:live
AI_SMOKE_BASE_URL=... AI_SMOKE_AUTH_TOKEN=... npm run smoke:ai
```
