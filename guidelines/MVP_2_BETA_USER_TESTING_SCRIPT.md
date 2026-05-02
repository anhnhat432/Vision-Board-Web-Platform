# MVP 2 Beta User Testing Script

Prepared: 2026-05-01

## 1. Tester Profile

### Who should test

- 3–5 people who have used the MVP 1 local demo and are familiar with the 12-week system.
- At least 1 tester who is not an engineer (e.g., someone who uses planners, journals, or habit trackers regularly).
- At least 1 tester with access to 2 devices/browsers to test cross-device sync.

### Who should NOT test

- People unfamiliar with the product — they should use the MVP 1 testing script first.
- People expecting full cloud sync, real-time collaboration, or paid features.

### What to tell testers before starting

```text
Đây là bản beta cloud sync cho hệ 12 tuần. Dữ liệu của bạn sẽ được
đồng bộ thủ công lên cloud khi bạn nhấn nút "Đồng bộ cloud thủ công"
trong Cài đặt.

Lưu ý:
- Đây KHÔNG phải cloud sync hoàn chỉnh. Chỉ hỗ trợ task, check-in, review.
- Một số metadata kế hoạch có thể không đồng bộ đầy đủ giữa các thiết bị.
- Mock checkout không thu tiền thật.
- Hãy xuất backup trước khi sync lần đầu.
- Không nhập thông tin nhạy cảm, bí mật công việc, hoặc dữ liệu cá nhân
  của người khác.
```

## 2. Step-by-Step Tasks

### Session 1: Setup and first sync (15–20 phút)

| # | Task | Expected result | Tester notes |
|---|------|----------------|-------------|
| 1 | Mở app từ beta URL | Trang chủ hiển thị | |
| 2 | Đăng nhập bằng Google hoặc email | Vào được dashboard | |
| 3 | Nếu có dữ liệu local/demo: chọn "Import local data" | Dữ liệu local được import vào account | |
| 4 | Nếu chưa có plan: tạo plan 12 tuần đầy đủ | Plan hiển thị trong hệ 12 tuần | |
| 5 | Vào tab "Hôm nay" | Thấy hàng việc hôm nay | |
| 6 | Tick 1 task hoàn thành | Task đánh dấu completed | |
| 7 | Xuất backup: Settings → "Xuất bản sao local" | File JSON tải về | |
| 8 | Nhấn "Đồng bộ cloud thủ công" trong Settings | Sync chạy, hiển thị kết quả | |
| 9 | Refresh trang (F5) | Dữ liệu vẫn giữ nguyên | |
| 10 | Log out, log in lại | Dữ liệu được restore từ cloud | |

### Session 2: Daily execution sync (10–15 phút)

| # | Task | Expected result | Tester notes |
|---|------|----------------|-------------|
| 11 | Hoàn thành daily check-in (đầy đủ: mood, note, rating) | Check-in lưu local | |
| 12 | Nhấn "Đồng bộ cloud thủ công" | Check-in gửi lên cloud | |
| 13 | Refresh trang | Check-in vẫn hiển thị | |
| 14 | Mở tab "Tuần" → gửi weekly review | Review lưu local | |
| 15 | Nhấn "Đồng bộ cloud thủ công" | Review gửi lên cloud | |
| 16 | Refresh trang | Review vẫn hiển thị | |

### Session 3: Cross-device (10 phút, cần 2 thiết bị)

| # | Task | Expected result | Tester notes |
|---|------|----------------|-------------|
| 17 | Trên thiết bị B: mở app, đăng nhập cùng account | Dashboard hiển thị | |
| 18 | Vào 12-week system → Settings → "Đồng bộ cloud thủ công" | Dữ liệu pull từ cloud | |
| 19 | Kiểm tra tasks, check-ins, reviews có hiển thị | Core data hiển thị. Một số metadata plan có thể thiếu. | |
| 20 | Ghi chú bất kỳ dữ liệu nào bị thiếu so với thiết bị A | | |

### Session 4: Conflict handling (10 phút, cần 2 thiết bị)

| # | Task | Expected result | Tester notes |
|---|------|----------------|-------------|
| 21 | Thiết bị A: tick task X hoàn thành. CHƯA sync. | Task completed local | |
| 22 | Thiết bị B: tick task X khác đi (hoặc untick). Sync. | Sync thành công | |
| 23 | Thiết bị A: nhấn "Đồng bộ cloud thủ công" | Conflict panel hiển thị | |
| 24 | Đọc conflict details | Hiểu được vấn đề gì | |
| 25 | Thử "Xuất bản sao local" | File backup tải về | |
| 26 | Thử "Giữ bản local" | Giữ dữ liệu local, đóng conflict | |
| 27 | Sync lại → thử "Dùng bản cloud" (với confirm) | Dữ liệu cloud ghi đè local (sau khi confirm rõ) | |

## 3. Bug Report Template

Khi gặp lỗi, tester gửi report theo mẫu này:

```markdown
### Bug Report

**Tester:** [tên/email]
**Ngày:** [ngày]
**Thiết bị:** [browser + OS]
**Beta URL:** [URL]

**Bước thực hiện:**
1. [Bước 1]
2. [Bước 2]
3. ...

**Kết quả mong đợi:**
[Mô tả ngắn]

**Kết quả thực tế:**
[Mô tả ngắn]

**Screenshot/video:**
[Đính kèm nếu có]

**Console errors (nếu biết cách):**
[Mở DevTools → Console → copy lỗi]

**Mức nghiêm trọng:**
- [ ] Blocker — không thể tiếp tục test
- [ ] Major — tính năng không hoạt động
- [ ] Minor — hoạt động nhưng UI/copy khó hiểu
- [ ] Cosmetic — nhỏ, không ảnh hưởng function
```

## 4. Trust and Confidence Rating

Sau mỗi session, tester đánh giá:

```markdown
### Trust Rating

**Tester:** [tên]
**Ngày:** [ngày]

Trên thang 1–5 (1 = không tin, 5 = tin tưởng hoàn toàn):

1. Bạn tin rằng dữ liệu không bị mất khi sync? [ /5]
2. Bạn hiểu nút "Đồng bộ cloud thủ công" làm gì? [ /5]
3. Bạn cảm thấy có thể khôi phục nếu xảy ra sự cố? [ /5]
4. Bạn biết dữ liệu nào là local, dữ liệu nào đã lên cloud? [ /5]
5. Nếu thấy conflict, bạn hiểu các lựa chọn không? [ /5]
6. Bạn sẽ dùng sync này cho mục tiêu thật của mình? [ /5]

**Tổng trung bình:** [ /5]

**Nhận xét tự do:**
[Viết gì cũng được]
```

## 5. Data Loss Incident Template

Nếu tester mất dữ liệu hoặc nghi ngờ mất dữ liệu:

```markdown
### Data Loss Incident

**MỨC ĐỘ KHẨN CẤP: CAO**

**Tester:** [tên/email]
**Ngày giờ:** [timestamp chính xác nếu có]
**Thiết bị:** [browser + OS]

**Dữ liệu bị mất:**
- [ ] Tasks (bao nhiêu task?)
- [ ] Daily check-ins (ngày nào?)
- [ ] Weekly reviews (tuần nào?)
- [ ] Toàn bộ plan
- [ ] Khác: [mô tả]

**Bước trước khi mất dữ liệu:**
1. [Bước 1]
2. [Bước 2]
3. ...

**Đã xuất backup trước đó không?**
- [ ] Có — đính kèm file backup
- [ ] Không

**localStorage hiện tại còn dữ liệu không?**
- [ ] Có — DevTools → Application → Local Storage → copy giá trị `visionboard_user_data`
- [ ] Không — localStorage trống
- [ ] Không biết cách kiểm tra

**Screenshot/video:**
[Đính kèm nếu có]

**Hành động đã thử để khôi phục:**
[Mô tả]
```

> **Hướng dẫn cho team:** Nếu nhận được data loss incident, ưu tiên điều tra ngay. Kiểm tra MongoDB collection, mutation queue logs, và merge report trước khi tester xóa browser storage.

## 6. Final Recommendation Format

Sau khi thu thập feedback từ tất cả testers, tổng hợp theo mẫu:

```markdown
### MVP 2 Beta Testing Summary

**Ngày hoàn thành:** [ngày]
**Số tester:** [n]
**Số session:** [n]

#### Trust scores

| Tester | Trust avg | Data persist? | Conflict clear? | Would use for real? |
|--------|----------|--------------|----------------|-------------------|
| T1     | [x/5]   | [Y/N]        | [Y/N/N/A]      | [Y/N]             |
| T2     | [x/5]   | [Y/N]        | [Y/N/N/A]      | [Y/N]             |
| ...    | ...      | ...          | ...            | ...               |

#### Data loss incidents

| # | Tester | Severity | Root cause | Resolved? |
|---|--------|----------|-----------|-----------|
| 1 | [tên]  | [mức]    | [nguyên nhân] | [Y/N] |

#### Top issues

1. [Issue 1]
2. [Issue 2]
3. [Issue 3]

#### Recommendation

- [ ] **Path A:** Polish sync → ship authenticated MVP
- [ ] **Path B:** Continue refactoring → delay ship
- [ ] **Path C:** Ship paid MVP with current sync
- [ ] **Path D:** Pause new features → stabilize core UX

**Reasoning:**
[2–3 câu giải thích lý do chọn path]

#### Next actions

1. [Action 1]
2. [Action 2]
3. [Action 3]
```
