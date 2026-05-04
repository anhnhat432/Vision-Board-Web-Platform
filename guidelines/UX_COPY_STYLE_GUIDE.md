# UX Copy Style Guide

Last updated: 2026-05-04
Companion to: `CORE_COACHING_COPY_GUIDE.md` (tone, length budgets, per-surface detail, audit checklist).

This guide focuses on **conventions and vocabulary mapping** for anyone writing or reviewing UI strings.

---

## 1. Tone

| Principle | Nghĩa thực tế |
|---|---|
| Rõ | Mỗi câu chỉ nói 1 ý. User đọc xong biết phải làm gì. |
| Cụ thể | Nói số, nói tên việc, nói tab cần mở. Không "hãy cố gắng". |
| Không sáo rỗng | Không filler ("Chúc bạn thành công!", "Bạn thật tuyệt vời"). |
| Không phán xét | Không "Bạn đã làm sai", "Mục tiêu quá tham vọng". Nói tình trạng + hành động. |
| Hướng hành động | Mỗi đoạn copy kết thúc bằng next action hoặc giải thích tín hiệu user vừa thấy. |

**Ngôn ngữ:** Tiếng Việt phổ thông, giọng trung tính. Không dùng "ạ", "nhé", "nha", "ơi". Giữ English cho code identifier và branding (Plus, Setup, review, check-in).

---

## 2. CTA Convention

### Primary CTA
Verb + object. Nút nổi bật nhất trên màn.

| Khi nào | Ví dụ |
|---|---|
| Tạo mới | "Tạo kế hoạch 12 tuần" |
| Lưu / chốt | "Lưu check-in hôm nay", "Chốt review tuần này" |
| Bắt đầu flow | "Bắt đầu Life Balance" |

### Secondary CTA
Verb + destination hoặc verb + context. Variant `outline` hoặc `ghost`.

| Khi nào | Ví dụ |
|---|---|
| Chuyển tab | "Mở tab Tuần", "Mở Hôm nay" |
| Gợi ý thay thế | "Dùng gợi ý này cho tuần sau" |
| Sửa / quay lại | "Mở Setup để chỉnh", "Quay lại bước 1" |

### Destructive CTA
Nút đỏ, có xác nhận. Copy nói rõ hậu quả, không dọa.

| Khi nào | Ví dụ |
|---|---|
| Xóa dữ liệu | "Xóa toàn bộ dữ liệu local" |
| Ghi đè | "Xác nhận dùng bản cloud" |
| Hủy chu kỳ | "Dừng chu kỳ hiện tại" |

**Quy tắc chung:**
- Không dùng CTA mơ hồ: ❌ "OK", "Tiếp tục", "Xem thêm" (thiếu object).
- CTA ≤ 6 từ.
- Destructive CTA luôn có bước xác nhận trước khi thực thi.

---

## 3. Warning Convention

| Mức | Màu | Mở đầu bằng | Ví dụ |
|---|---|---|---|
| Gợi ý | Xanh nhạt (sky/violet) | Tình trạng + gợi ý | "Tuần 1 nên nhẹ — thêm 1 việc nếu giữ nhịp tốt." |
| Cảnh báo nhẹ | Hổ phách (amber) | Tình trạng + nên làm gì | "Có 3 việc trễ. Không cần làm hết — chọn cách quay lại nhịp gọn nhất." |
| Cảnh báo mạnh | Đỏ (rose/red) | Tình trạng + phải làm gì | "Tuần 1 có 7 việc — vượt giới hạn. Bỏ 1-2 việc tùy chọn." |
| Lỗi | Đỏ đậm + alert icon | Gì xảy ra + cách sửa | "Số task tuần 1 không hợp lệ. Tạo lại chu kỳ." |

**Không bao giờ mở đầu warning bằng:** "Sai", "Lỗi của bạn", "Bạn đã làm sai".

---

## 4. Empty State Convention

Mỗi empty state có 3 phần:

1. **Tình trạng** — chuyện gì đang xảy ra ("Chưa có việc nào trong chu kỳ này")
2. **Lý do ngắn** — tại sao trống ("Chu kỳ chưa có việc lặp lại")
3. **Next action + CTA** — user nhấn gì ("Vào Setup để thêm 2-4 việc lặp lại trước" + nút)

Không bao giờ chỉ hiện "Trống" hoặc "Không có dữ liệu".

---

## 5. Local / Demo / Cloud Copy Convention

Mục tiêu: user không sợ mất dữ liệu.

| Ngữ cảnh | Copy pattern |
|---|---|
| Demo mode | "Bản demo lưu trên trình duyệt này, không cần cloud." |
| Local data | "Dữ liệu được lưu local trên trình duyệt — vẫn dùng được khi offline." |
| Cloud sync | "Đồng bộ cloud là lớp tùy chọn để phòng khi đổi máy." |
| Xóa data | Luôn nói rõ phạm vi: "Chỉ xóa dữ liệu 12-week trên server, không xóa local." |
| Ghi đè | "Chưa tự ghi đè để tránh mất dữ liệu. Nên export backup trước." |
| Conflict | "Local và cloud đang khác nhau. Chưa có dữ liệu nào bị ghi đè." |
| Sau khi giữ local | "Đã giữ bản local. Không có dữ liệu nào bị xóa hoặc ghi đè." |

**Quy tắc:**
- Không dùng "sync" đơn lẻ trong copy user — dùng "đồng bộ" hoặc "đồng bộ cloud".
- Mọi hành động xóa/ghi đè có bước xác nhận.
- Nếu backend fail, nói rõ: "Dữ liệu local vẫn an toàn."

---

## 6. SMART Goal Copy Convention

- Step heading là câu hỏi, không phải label. ("Bạn muốn có kết quả gì?" thay vì "Mục tiêu cụ thể")
- Helper text dưới input: 1 câu ngắn dạy cách điền, không giải thích lý do.
- Outcome indicator warning giữ nguyên canonical phrasing (xem `CORE_COACHING_COPY_GUIDE.md` §9.1).
- Acronym SMART giữ nguyên uppercase.

---

## 7. Feasibility Result Copy Convention

- Mở đầu bằng tình trạng, không phải verdict. ("14/20 — challenging." thay vì "Mục tiêu quá khó.")
- `firstWeekGuidance` luôn là câu hành động bắt đầu bằng "Tuần 1...".
- `scopeRecommendation` nói giữ gì / cắt gì cụ thể.
- `bottleneck.action` là 1 câu mệnh lệnh.
- Không dùng "feasibility" trong copy user — dùng "kiểm tra tính thực tế" hoặc "đánh giá nhanh".

---

## 8. 12-Week Execution Copy Convention

### Today tab
- Hero: nêu việc quan trọng nhất + "Chỉ cần xong việc này là hôm nay đã đủ."
- Overdue: "Việc này đang trễ — hôm nay làm phiên bản gọn nhất, đừng bỏ luôn."
- Rescue: "Không cần làm hết — chọn cách quay lại nhịp gọn nhất."
- Check-in: "Chọn năng lượng và ghi 1 ý ngắn." + CTA "Lưu check-in hôm nay".

### Week tab
- Review form: 3 câu phản tư + 1 quyết định. Prompt hỏi quan sát, không phán xét.
- Review CTA khi đúng hạn: "Sẵn sàng chốt review tuần này."
- Review CTA khi chưa hạn: "Có thể chốt sớm — bạn vẫn được phép sửa đến ngày review chính thức."

### Progress tab
- Số trước, câu sau. ("4/5 việc — lead completion 80%.")
- Badge trạng thái: "Đang đúng nhịp", "Mới bắt đầu", "Cần chú ý", "Cần quay lại nhịp".
- Không frame "ahead/behind" — nói gap bằng số.

### Settings tab
- Copy dữ liệu luôn nói rõ: lưu ở đâu, xóa phạm vi nào, có xác nhận không.
- "tactic" trong copy → "việc" hoặc "việc lặp lại".

---

## 9. Từ nên dùng

| Code / internal | Copy cho user |
|---|---|
| lead indicator | việc lặp lại |
| lag metric | kết quả cuối / chỉ số kết quả chính |
| task (trong copy) | việc |
| output / output chính | kết quả / kết quả chính |
| tactic | việc / việc lặp lại |
| lighter / same / push | nhẹ hơn / giữ nguyên / đẩy nhanh |
| plan quality check | đánh giá nhanh kế hoạch |
| bottleneck | phần yếu nhất / phần cần chú ý |
| load / load tuần | mức tải |
| re-entry | quay lại nhịp |
| rescue | quay lại nhịp / gợi ý phù hợp |
| cloud sync | đồng bộ cloud |
| feasibility | kiểm tra tính thực tế |

**Từ semi-English OK giữ nguyên:** review, check-in, Plus, Setup, cloud, local, export, backup.

---

## 10. Từ nên tránh

| Tránh | Lý do | Thay bằng |
|---|---|---|
| Hãy + verb | Mệnh lệnh trực tiếp quá nặng | Bỏ "Hãy", bắt đầu bằng verb luôn |
| Mình | Lẫn ngôi, không rõ ai nói | Bỏ hoặc dùng "Bạn" |
| Hệ thống | Lạnh, jargon | Bỏ hoặc viết lại câu chủ động |
| Đừng lo / Không sao | Minimizing | Nói lý do cụ thể tại sao OK |
| Hãy mạnh mẽ / Bứt phá | Sáo rỗng | Nói hành động cụ thể |
| Mục tiêu cuộc đời | Marketing tone | Nói cụ thể mục tiêu gì |
| AI giúp bạn | False claim (rule-based) | Nói tính năng cụ thể |
| Đảm bảo thành công | Overpromise | Nói kết quả có thể đo |
| Hoàn hảo / Tối ưu | Phán xét | Nói trạng thái cụ thể |
| giữ nhịp (lặp nhiều) | Nhàm, mơ hồ khi lặp | "duy trì", "việc lặp lại" |
| cứu nhịp | Dramatic | "quay lại nhịp" |
| system / hệ thống 12 tuần | Jargon | "kế hoạch 12 tuần" / bỏ |

---

## 11. Before / After

| Trước | Sau | Ghi chú |
|---|---|---|
| "Cứu nhịp tuần này" | "Quay lại nhịp tuần này" | Bớt dramatic |
| "Hệ thống sẽ khóa tuần" | "Tuần sẽ được khóa" | Bỏ "Hệ thống" |
| "Cho hệ thống biết tuần này..." | "Cho biết tuần này..." | Bỏ "hệ thống" |
| "3 việc giữ nhịp chính" | "3 việc lặp lại chính" | Đúng mapping |
| "Phân tích theo việc giữ nhịp" | "Phân tích theo việc lặp lại" | Đúng mapping |
| "Cần cứu nhịp" (badge) | "Cần quay lại nhịp" | Nhẹ hơn |
| "Ưu tiên tactic" | "Thứ tự việc lặp lại" | Bỏ English jargon |
| "Re-entry đã dùng" | "Số lần quay lại nhịp" | Vietnamese |
| "Keep local for now" | "Giữ bản local" | Vietnamese |
| "Use cloud version" | "Dùng bản cloud" | Vietnamese |
| "Hãy export backup trước" | "Nên export backup trước" | Bỏ "Hãy" |
| "Mở Plus để có rescue thông minh" | "Mở Plus để có gợi ý phù hợp" | Bỏ English "rescue" |
| "hãy giữ nhịp đến hết tuần" | "duy trì đến hết tuần" | Bỏ "hãy", bỏ "giữ nhịp" |
| "cloud sync là lớp tùy chọn" | "đồng bộ cloud là lớp tùy chọn" | Vietnamese cho "sync" |

---

## Cross-reference

- **Tone, length budgets, forbidden phrases, per-surface detail, audit checklist:** see `CORE_COACHING_COPY_GUIDE.md`.
- **Locked test/smoke strings:** see `CORE_COACHING_COPY_GUIDE.md` §7 and §12.
- **Vietnamese terminology mapping source of truth:** §9 of this file.
