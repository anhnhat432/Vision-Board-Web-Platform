# AI Optimization Loop (Giai đoạn 6)

Tài liệu vận hành cho vòng lặp tối ưu Trợ lý "Cú" dựa trên dữ liệu thật.
Bám nguyên tắc local-first, real-mode safety, redaction chung; KHÔNG rewrite lớn.

## 1. Quy trình review metrics hàng tuần

### 1.1 Nguồn dữ liệu hiện có

Trên branch hiện tại, telemetry vẫn là **local-first** (chưa có backend telemetry tổng hợp):

- `src/app/features/assistant/assistantObservability.ts`: event log local
  (`AssistantEvent[]`) theo user, đã redacted, cap 500 event.
- `src/app/features/assistant/assistantFeedback.ts`: golden examples + feedback
  dataset (`getAssistantGoldenExamples`, `exportAssistantFeedbackDataset`), kèm
  `reason`, `correction`, `context` đã sanitize.

### 1.2 Tooling tổng hợp

`src/app/features/assistant/ops/assistantMetricsReview.ts`:

- `buildAssistantReviewReport(events, goldenExamples, { window | windowDays })`:
  tổng hợp theo cửa sổ thời gian (mặc định 7 ngày). Trả về overview (action
  acceptance/success, helpful/not-helpful ratio, feedback theo `reason`), top
  failure routes, top failure cases, và `alerts` đánh giá ngưỡng KPI.
- `formatAssistantReviewReport(report)`: render markdown để dán vào weekly note.

Ngưỡng cảnh báo nhẹ (`REVIEW_KPI_THRESHOLDS`, bám mục 5 của plan):

| Metric | Ngưỡng | Mức |
|---|---|---|
| feedback.unsafe | >= 1 | critical |
| feedback.notHelpfulRatio | > 15% | warn |
| feedback.wrongContextRatio | > 5% | warn |
| action.acceptanceRate | < 35% | warn |
| action.successRate | < 95% | warn |

Cảnh báo ratio chỉ kích hoạt khi đủ mẫu tối thiểu (feedback >= 5, action >= 5)
để tránh báo động giả trên dữ liệu nhỏ.

### 1.3 Nhịp review đề xuất

1. Xuất dữ liệu: `getAssistantEvents(userId)` + `getAssistantGoldenExamples()`
   (hoặc dataset đã redacted gom từ nhiều nguồn qua `exportAssistantFeedbackDataset`).
2. Chạy `buildAssistantReviewReport` cho cửa sổ 7 ngày, đọc `formatAssistantReviewReport`.
3. Ghi lại top failure cases + alert vào weekly note.
4. Đưa các case lặp lại vào eval bằng pipeline ở mục 2.
5. Nếu một route bị `notHelpfulRatio`/`wrongContextRatio` cao, tinh chỉnh
   playbook route đó (mục 3) thay vì sửa prompt chung.

> Lưu ý: dữ liệu hiện local-only. Khi có backend telemetry (Giai đoạn 2 đầy đủ),
> thay nguồn input của `buildAssistantReviewReport` bằng query telemetry đã
> redacted; chữ ký hàm giữ nguyên (`AssistantEvent[]`).

## 2. Pipeline feedback xấu -> eval case

`src/app/features/assistant/evals/feedbackToEvalCase.ts`:

- `feedbackToEvalCases(examples, options)`: lọc golden example `not_helpful` với
  `reason` thuộc `wrong_context` / `wrong_action` (mặc định), redact lại
  `userMessage` lần nữa trước khi dùng làm `input`, suy ra `expected`:
  - `wrong_action`: forbid action type đã chạy sai, giữ `expectedActionType` nếu có.
  - `wrong_context` + context rỗng: bắt buộc hỏi lại (`mustAskClarifyingQuestion`)
    và forbid `create_goal` / `create_task` / `mark_task_done`.
  - Có expected action: bật `mustUseExistingTaskId`.
- `mergeFeedbackEvalCases(baseCases, feedbackCases)`: nối vào `EVAL_CASES` golden
  set, chống trùng `id`.

Quy tắc an toàn:

- Chỉ nhận case có expectation dùng được (`hasUsableExpectation`), tránh case rỗng.
- Dedupe theo `route + input + reason`.
- Redaction áp dụng ở cả nguồn (`assistantFeedback`) và bước này (double-redact).
- Không tự ghi đè file `assistantEvalCases.ts`; review thủ công case sinh ra
  trước khi commit vào golden set cố định.

## 3. Tối ưu prompt/model theo route

`backend/src/services/assistantPromptUtils.ts` đã tách playbook thành cấu trúc
data-driven `ROUTE_PLAYBOOKS` (`RoutePlaybook[]`) thay cho chuỗi if/else:

- Mỗi playbook có `id`, `matchKeywords`, `guidance`.
- `resolveRoutePlaybook(routeKey)` chọn playbook theo keyword; `buildSystemPrompt`
  chèn `guidance` của playbook khớp vào prompt. Output text giữ nguyên so với
  bản if/else cũ (không phá eval/snapshot).

Quy trình tinh chỉnh per-route:

1. Từ weekly review, xác định route có chất lượng thấp (`wrong_context` cao,
   action acceptance thấp).
2. Chỉ sửa `guidance` của playbook tương ứng trong `ROUTE_PLAYBOOKS`.
3. Thêm/điều chỉnh eval case cho route đó; chạy `npm run test:run`.
4. Tránh đụng prompt chung (`buildSystemPrompt` body) trừ khi vấn đề là toàn cục.

Model routing: hiện tại Groq dùng 1 model; routing fast/smart chỉ áp dụng cho
Gemini. Nếu cần phân tầng theo route, đặt sau feature flag và đo trước/sau bằng
weekly review, không hardcode provider-specific.

## 4. Tiêu chí cân nhắc embeddings / server-side memory / fine-tuning

Đây là **guideline quyết định**, KHÔNG phải lệnh triển khai. Mặc định giữ
heuristic local + RAG keyword hiện có cho tới khi vượt rõ các tiêu chí dưới.

### 4.1 Embeddings / vector retrieval

Chỉ cân nhắc khi đồng thời:

- Keyword retrieval (`assistantRetrieval.ts`) miss nhiều ở eval ngữ nghĩa dài,
  đo được bằng eval pass rate giảm trên nhóm "long Vietnamese input".
- Có nguồn dữ liệu đủ lớn per-user (goals/reviews/reflections) để vector search
  thắng keyword một cách đo được.
- Có ngân sách chi phí/latency cho bước embedding và không phá local-first
  (phải có fallback keyword khi offline/không consent).

Ràng buộc: chỉ index dữ liệu của user đã signed-in + consent; redaction trước
khi gửi đi; không tạo action từ retrieved nếu thiếu ID trong context hiện tại.

### 4.2 Server-side memory

Chỉ cân nhắc khi:

- Có nhu cầu cross-device continuity thực sự (user nhiều thiết bị) mà local
  memory không đáp ứng.
- Có privacy policy + consent UI + export/delete đầy đủ (Settings đã có
  xem/xóa memory; phải mở rộng cho scope server).
- Có migration rõ ràng cho shape memory; không phá local-first.

Ràng buộc: memory local vẫn là nguồn mặc định; server-side là lớp đồng bộ
opt-in, không bắt buộc cho 12-week execution loop.

### 4.3 Fine-tuning

Chỉ cân nhắc khi đủ CẢ BA (theo plan dòng 363-366):

1. Có dataset sạch, đa dạng, đã redacted (đủ lượng golden/feedback qua pipeline
   mục 2, đã review thủ công).
2. Prompt + RAG + schema đã tối ưu mà vẫn không đạt KPI (mục 5 của plan).
3. Chi phí/latency provider hiện tại là blocker rõ ràng, đo được.

Nếu chưa đủ cả ba: ưu tiên prompt/playbook/retrieval. Fine-tune là bước cuối,
cần audit dữ liệu và quyết định riêng, không nằm trong phạm vi code hiện tại.

## 5. Verify khi đụng vùng này

```bash
npm run typecheck
npm run test:run
npm --prefix backend run typecheck
npm --prefix backend run build
```



