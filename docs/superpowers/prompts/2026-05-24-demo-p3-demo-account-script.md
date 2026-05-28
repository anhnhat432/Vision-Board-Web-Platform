# P3 — Tạo demo account có data sẵn + script demo cho lớp

> Tiếp theo của P2. Demo trước thầy và các bạn ngày X, sản phẩm đã production.
> Mục tiêu P3: chuẩn bị 1 account "demo presenter" có data 12-tuần đẹp sẵn, viết script đọc 5-7 phút và pre-flight checklist sáng demo.

---

## Bối cảnh

- URL production: https://dearourfuture.io.vn/
- Repo root: `C:\Users\admin\Downloads\Vision Board Web Platform\`
- Đọc trước: `CLAUDE.md`, `qa-artifacts/p1-audit/REPORT.md` (output P1)

## Phạm vi

P3 là **người làm chính** chứ không phải AI sửa code. Output là:

1. 1 demo account đã setup full data (manual).
2. 1 file script demo bằng tiếng Việt.
3. 1 file checklist pre-flight sáng demo.

**KHÔNG sửa code.** Chỉ tạo file docs + thao tác trên production.

## Phase 3.1 — Tạo demo account

### Yêu cầu setup

Hỏi user 2 thứ:

1. **Email + password cho demo account** — khuyến nghị dạng `demo+lopxxx@dearourfuture.com` hoặc bất kỳ email user sở hữu inbox. Có thể dùng Gmail alias `name+demo@gmail.com`.
2. **Bối cảnh demo**: thầy + lớp bao nhiêu người, môn gì, demo bao lâu (5/7/10 phút), focus vào product/tech/UX?

### Quy trình tạo account demo

Trên https://dearourfuture.io.vn/ (browser sạch):

1. Đăng ký account với email + password user cấp.
2. Đi từ Bước 1 → Bước 6 trong onboarding, **dùng nội dung sau** (đã chọn lọc để demo lớp dễ hiểu + phù hợp môn học):

   - **Life Balance**:
     - Sự nghiệp: 6 — Tài chính: 5 — Sức khỏe: 4 — Học tập: 7 — Mối quan hệ: 7 — Gia đình: 8 — Phát triển bản thân: 5 — Giải trí: 4
     - (Cố tình thấp ở Sức khỏe + Giải trí để Life Insight gợi ý ưu tiên Sức khỏe — dễ relate với sinh viên)
   - **Life Insight focus**: chọn "Sức khỏe", mục đích: "Cải thiện sức khỏe".
   - **SMART Goal**:
     - Specific: "Tập thể dục đều đặn 4 buổi mỗi tuần để cải thiện sức khỏe và năng lượng học tập."
     - Measurable: "Mỗi buổi 30 phút, đi bộ nhanh hoặc tập gym."
     - Achievable: "Mức cam kết: Vừa phải" (chọn middle option).
     - Relevant: "Vì tôi đang là sinh viên, cần năng lượng để học và làm dự án; sức khỏe tốt giúp tôi tỉnh táo và tập trung lâu hơn."
     - Time-bound: "12 tuần — kết thúc vào [ngày + 84 ngày]"
   - **Feasibility check**: bấm qua các slider/score, để ở mức "Thực tế" (xanh).
   - **12-week Setup**:
     - Chọn template "Sức khỏe & vận động" hoặc tự tạo.
     - 3 tactic tuần:
       - "Tập gym thứ 2/4/6 — 30 phút mỗi buổi"
       - "Đi bộ 30 phút mỗi sáng cuối tuần (thứ 7 + chủ nhật)"
       - "Ghi nhật ký năng lượng cuối ngày"
     - Milestone Tuần 4: "Đi tập đủ 12 buổi"
     - Milestone Tuần 8: "Tăng cường độ — thêm 1 buổi/tuần"
     - Milestone Tuần 12: "Đánh giá lại + thiết lập chu kỳ mới"
     - Review day: thứ Chủ Nhật
     - Start date: chọn thứ 2 tuần này (hoặc tuần trước, để đã ở Tuần 2-3 lúc demo)
3. Sau khi setup xong, vào `/12-week-system`, tick **30% tasks** đã qua (để Progress tab có data đẹp 25-35%).
4. Vào tab Tuần, viết 1 weekly review ngắn (3-4 dòng) cho tuần đã qua. Ví dụ:
   > "Tuần này đi tập được 3/4 buổi. Sáng cuối tuần ngủ nướng nên skip 1 buổi đi bộ. Cảm giác sau buổi tập khá tỉnh táo — học bài hiệu quả hơn. Tuần sau sẽ đặt báo thức sớm 30 phút."
5. Vào `/journal`, verify reflection đã sinh từ weekly review.
6. (Optional) Vào `/billing/plan` xem trạng thái hiện tại: phải hiển thị copy **"Đang hoàn tất tích hợp hệ thống thanh toán mới — sẵn sàng trong tuần tới"** (do B3 polish). Nút "Nâng cấp Plus" hiện ở dạng disabled hoặc link tới email support. **Đây là chủ ý** — PayOS đã được cấu hình backend nhưng đội ngũ giữ tắt cho giai đoạn pilot. KHÔNG bấm mua, chỉ note để khi lớp hỏi có câu trả lời chuẩn.

### Verify demo account

- Logout → login lại → tất cả data vẫn còn.
- Tab Progress hiển thị 25-35% completion.
- Tab Hôm nay hiển thị 2-3 task của hôm nay.
- Goal title đọc tự nhiên trên màn hình lớn (chiếu).

## Phase 3.2 — Viết file script demo

Tạo file `docs/superpowers/specs/2026-05-24-demo-script-lop.md` với cấu trúc dưới đây. **Customize** các dấu `…` theo bối cảnh demo (môn học, thời lượng) user đã cung cấp.

```markdown
# Script demo Dear Our Future — Trước lớp [tên môn] ngày [ngày]

## Tổng thời lượng: 6 phút (có thể co/dãn 5-8 phút)

## Setup trước khi nói (1 phút trước demo):
- Mở incognito Chrome trên laptop, đăng nhập demo account.
- Mở sẵn 2 tab: PublicVisitorView (/) + 12-week-system (/12-week-system).
- Tắt notification, đóng các tab khác.

---

## Phần 1 — Mở đầu + Vấn đề (60 giây)

> "Chào thầy và các bạn. Em xin demo sản phẩm tên **Dear Our Future** — một web app giúp người dùng biến mục tiêu mơ hồ thành kế hoạch 12 tuần và việc làm mỗi ngày.
>
> Vấn đề thực tế bọn em nhìn thấy: rất nhiều người có mục tiêu, nhưng đặt xong rồi để đó. Không ai chia mục tiêu lớn thành những việc nhỏ làm mỗi ngày. Dear Our Future giải quyết đúng khoảng trống này."

**Trên màn hình**: Show PublicVisitorView (tab 1). Để 5 giây cho lớp đọc heading.

---

## Phần 2 — Sản phẩm đã sống thật (45 giây)

> "Sản phẩm bọn em đã deploy lên domain riêng [dearourfuture.io.vn](https://dearourfuture.io.vn) — bất kỳ ai trong lớp đều có thể vào đăng ký dùng ngay sau buổi demo."

**Trên màn hình**: scroll xuống section "Cách hoạt động" 4 bước. Đọc nhanh từng bước.

> "App có 4 bước chính: Soi cuộc sống, Đặt mục tiêu SMART, Dựng chu kỳ 12 tuần, và mỗi ngày mở Today để biết hôm nay làm gì. Tổng thời gian setup khoảng 20 phút, sau đó mỗi ngày chỉ tốn 1-2 phút."

---

## Phần 3 — Demo flow đã có sẵn data (3 phút)

> "Em đã chuẩn bị sẵn 1 tài khoản với mục tiêu sức khỏe — đang ở tuần 3/12."

**Switch sang tab 2** (/12-week-system đã login).

> "Đây là màn hình chính — Hệ thống 12 tuần. Mục tiêu hiện tại là 'Tập thể dục đều đặn 4 buổi mỗi tuần để cải thiện sức khỏe và năng lượng học tập.' App cho biết em đang ở tuần 3, tiến độ chu kỳ khoảng 30%."

(Đợi 3-5 giây cho lớp nhìn)

> "Mỗi ngày em mở tab **Hôm nay** — app đã tự gợi ý hôm nay làm gì."

**Tick 1 task chưa tick.** Để thấy progress bar tăng.

> "Tick xong, số liệu tự cập nhật. Dữ liệu lưu lên cloud, em mở điện thoại sẽ thấy ngay."

**Mở tab Tuần.**

> "Cuối tuần em ngồi 5 phút làm review — viết vài dòng phản tư. App sẽ tự tạo bản ghi vào Nhật ký để em xem lại."

**Mở tab Tiến độ.**

> "Tab Tiến độ cho cái nhìn 12 tuần — biết tuần nào đang chậm, tuần nào đang vượt kế hoạch."

---

## Phần 4 — Kết + Mời dùng (45 giây)

> "Dear Our Future hiện tại đã sẵn sàng cho người dùng thật. Em có cho cả các bạn 1 link tham gia."

**Hiện QR code hoặc link** `https://dearourfuture.io.vn/login?mode=signup` (chuẩn bị trước slide có QR).

> "Bọn em đang trong giai đoạn pilot — feedback từ thầy và các bạn rất quý giá. Cảm ơn thầy và các bạn đã lắng nghe."

---

## Q&A — Câu hỏi có thể gặp

- **"Dữ liệu lưu ở đâu?"** → Local + cloud (MongoDB). User tự sở hữu, có thể xoá account bất kỳ lúc nào.
- **"Free hay phải trả tiền?"** → Free hoàn toàn cho core 12-tuần. Plus 99k/tháng mở thêm template & insight nâng cao.
- **"Có thanh toán Plus được luôn không?"** → "Hiện tại bọn em giữ thanh toán tự động ở chế độ pilot — backend đã tích hợp PayOS xong, nhưng đội ngũ muốn theo dõi thêm sản phẩm trước khi mở rộng. Nếu thầy/bạn nào muốn dùng Plus ngay, email `support@dearourfuture.com` — bọn em mở thủ công trong 24h. Mục tiêu của bọn em hiện tại là chứng minh 12-tuần work tốt, chưa phải đẩy doanh thu."
- **"Có app mobile không?"** → Web responsive, mở trên trình duyệt mobile như app native. PWA roadmap.
- **"Tech stack?"** → React + Vite, Express + MongoDB, Firebase Auth (Firebase email + Google OAuth), PayOS cho payments, deploy Vercel (frontend) + Render (backend).
- **"Khác Notion/Todoist như nào?"** → Notion là trang trắng — user phải tự nghĩ ra structure. Dear Our Future dẫn user qua structure dựa trên "12 Week Year" framework — không cần học, mở là dùng được.

---

## Backup khi mạng lỗi

- Nếu Vercel down hoặc mạng yếu → switch sang laptop chạy `npm run dev` (đã chuẩn bị `.env.development.local` với demo mode).
- Nếu cả 2 đều fail → mở video record (file `qa-artifacts/demo-record.mp4`).
```

## Phase 3.3 — Viết file checklist sáng demo

Tạo file `docs/superpowers/specs/2026-05-24-demo-preflight-checklist.md`:

```markdown
# Pre-flight checklist sáng demo

## Tối hôm trước
- [ ] Verify URL https://dearourfuture.io.vn/ load được (mobile + laptop).
- [ ] Login demo account, verify data vẫn đầy đủ.
- [ ] Charge laptop 100%.
- [ ] Mang sạc + HDMI/USB-C adapter dự phòng.
- [ ] Test máy chiếu (nếu được phép mượn).
- [ ] In sẵn 1 trang giấy có QR code dẫn về signup (phòng khi WiFi/projector hỏng).

## Sáng demo, 30 phút trước
- [ ] Đến phòng sớm.
- [ ] Kiểm tra cáp/cổng máy chiếu.
- [ ] Mở incognito Chrome trên laptop.
- [ ] Login demo account.
- [ ] Mở 2 tab: `/` và `/12-week-system`.
- [ ] Set font size browser ở mức readable từ cuối lớp (Ctrl+Plus 1-2 lần).
- [ ] Tắt notification: Windows Focus Assist / macOS Do Not Disturb.
- [ ] Đóng Slack, Discord, email.
- [ ] Verify mic + audio (nếu có demo video).
- [ ] Lấy 1 ngụm nước, hít thở sâu.

## Ngay trước khi nói
- [ ] Mở tab 1 (/), zoom level OK, không scroll dở.
- [ ] Verify mạng còn: ping nhanh `ping dearourfuture.io.vn` (terminal).
- [ ] Để điện thoại sang side, dùng làm timer.
- [ ] Đặt slide QR code mời đăng ký mở sẵn ở cửa sổ riêng.

## Sau demo
- [ ] Cảm ơn thầy + lớp.
- [ ] Thu thập feedback (1-2 câu hỏi).
- [ ] Note feedback ngay để follow-up.
- [ ] Logout demo account khỏi máy phòng (nếu dùng máy chung).
```

## Phase 3.4 — Commit 2 file docs

```bash
git checkout main
git pull origin main
git add docs/superpowers/specs/2026-05-24-demo-script-lop.md docs/superpowers/specs/2026-05-24-demo-preflight-checklist.md
git commit -m "docs(demo): add class demo script + pre-flight checklist"
```

KHÔNG push tự động, để user duyệt.

## Báo cáo cuối P3

- Email demo account (KHÔNG gửi password trong báo cáo — đưa qua kênh riêng).
- Verify list: 30% tasks ticked, weekly review viết, life balance scores đúng.
- Hash commit của 2 file docs.
- Note nếu cần điều chỉnh script (thời lượng, tone, môn học).

## Quy tắc

- KHÔNG sửa source code trong P3.
- KHÔNG bấm mua Plus thật.
- KHÔNG ghi password account vào file docs.
- Trả lời tiếng Việt.

Bắt đầu Phase 3.1 sau khi có credentials từ user.
