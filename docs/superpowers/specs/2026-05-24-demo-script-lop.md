# Script demo Dear Our Future — Trước lớp Công nghệ phần mềm

> **Bối cảnh demo**
>
> - Môn: Công nghệ phần mềm
> - Thời lượng: 7 phút (co/dãn 6–8 phút)
> - Focus: Product + Tech (lớp Khoa CNPM nên có 60s riêng cho kiến trúc)
> - Demo dự kiến: cuối tuần này (Thứ Bảy 30/05/2026 hoặc Chủ Nhật 31/05/2026 — chốt cụ thể với thầy)
> - URL production: <https://dearourfuture.io.vn/>
> - Demo account: `demo+thuyettrinh@gmail.com` (password lưu riêng, KHÔNG ghi vào file này)

---

## Tổng thời lượng: 7 phút

| Phần     | Thời lượng  | Nội dung chính                          |
| -------- | ----------- | --------------------------------------- |
| 1        | 60s         | Mở đầu + Vấn đề                         |
| 2        | 45s         | Sản phẩm đã sống thật trên domain riêng |
| 3        | 3 phút      | Demo flow với data đã chuẩn bị sẵn      |
| 4        | 60s         | Kiến trúc kỹ thuật (cho lớp CNPM)       |
| 5        | 45s         | Kết + Mời lớp dùng                      |
| **Tổng** | **~7 phút** |                                         |

---

## Setup trước khi nói (1 phút trước demo)

- Mở **incognito Chrome** trên laptop, đăng nhập demo account `demo+thuyettrinh@gmail.com`.
- Mở sẵn 3 tab theo thứ tự bên trái → phải:
  1. `https://dearourfuture.io.vn/` (PublicVisitorView)
  2. `https://dearourfuture.io.vn/12-week-system` (đã login)
  3. `https://dearourfuture.io.vn/journal` (đã login — backup khi nói về phản tư)
- Tắt notification: Windows Focus Assist hoặc macOS Do Not Disturb.
- Đóng các tab khác, đóng Slack/Discord/email.
- Mở slide QR code mời đăng ký ở cửa sổ riêng (chuẩn bị trước).

---

## Phần 1 — Mở đầu + Vấn đề (60 giây)

> "Chào thầy và các bạn. Em xin demo sản phẩm tên **Dear Our Future** — một web app giúp người dùng biến mục tiêu mơ hồ thành kế hoạch 12 tuần và việc làm mỗi ngày.
>
> Vấn đề thực tế bọn em nhìn thấy: rất nhiều người có mục tiêu, nhưng đặt xong rồi để đó. Không ai chia mục tiêu lớn thành những việc nhỏ làm mỗi ngày. Apps như Notion hay Todoist chỉ là trang trắng — user phải tự nghĩ ra structure, mà phần lớn người dùng không biết structure thế nào là đúng. Dear Our Future giải quyết đúng khoảng trống này: **dẫn user qua structure dựa trên framework "12 Week Year"**."

**Trên màn hình**: Show PublicVisitorView (tab 1). Để 5 giây cho lớp đọc heading.

---

## Phần 2 — Sản phẩm đã sống thật (45 giây)

> "Sản phẩm bọn em đã deploy lên domain riêng [dearourfuture.io.vn](https://dearourfuture.io.vn) — bất kỳ ai trong lớp đều có thể vào đăng ký dùng ngay sau buổi demo. Không phải prototype, không phải Figma — backend MongoDB thật, Firebase Auth thật, Vercel + Render đang chạy 24/7."

**Trên màn hình**: scroll xuống section "Cách hoạt động" 4 bước. Đọc nhanh từng bước.

> "App có 4 bước chính: Soi cuộc sống, Đặt mục tiêu SMART, Dựng chu kỳ 12 tuần, và mỗi ngày mở Today để biết hôm nay làm gì. Tổng thời gian setup khoảng 20 phút, sau đó mỗi ngày chỉ tốn 1–2 phút."

---

## Phần 3 — Demo flow đã có sẵn data (3 phút)

> "Em đã chuẩn bị sẵn 1 tài khoản với mục tiêu sức khỏe — đang ở tuần 2 trên 12."

**Switch sang tab 2** (`/12-week-system` đã login).

> "Đây là màn hình chính — Hệ thống 12 tuần. Mục tiêu hiện tại là _'Tập thể dục đều đặn 4 buổi mỗi tuần để cải thiện sức khỏe và năng lượng học tập.'_ App cho biết em đang ở tuần 2, tiến độ chu kỳ khoảng 30%."

(Đợi 3–5 giây cho lớp nhìn)

> "Mỗi ngày em mở tab **Hôm nay** — app đã tự gợi ý hôm nay làm gì, dựa trên các tactic em set ban đầu."

**Tick 1 task chưa tick.** Để thấy progress bar tăng.

> "Tick xong, số liệu tự cập nhật. Dữ liệu lưu vừa local vừa lên cloud — em mở điện thoại sẽ thấy ngay. Đây là điểm bọn em ưu tiên: **local-first**, mất mạng vẫn dùng được, có mạng tự sync."

**Mở tab Tuần.**

> "Cuối tuần em ngồi 5 phút làm review — viết vài dòng phản tư về tuần đã qua. App sẽ tự tạo bản ghi vào Nhật ký để em xem lại sau."

**Mở tab Tiến độ.**

> "Tab Tiến độ cho cái nhìn 12 tuần — biết tuần nào đang chậm, tuần nào đang vượt kế hoạch. Có cả milestone tuần 4, tuần 8, tuần 12 để check-in dài hạn."

---

## Phần 4 — Kiến trúc kỹ thuật (60 giây — dành riêng cho lớp CNPM)

> "Vì đây là lớp Công nghệ phần mềm, em xin nói nhanh về tech stack và kiến trúc.
>
> **Frontend**: React 18 + Vite + TypeScript, Tailwind + Radix primitives. Build là SPA, deploy lên Vercel.
>
> **Backend**: Express + TypeScript, MongoDB qua Mongoose, deploy lên Render. Firebase Admin SDK cho protected routes.
>
> **Auth**: Firebase Authentication — email/password + Google OAuth.
>
> **Payment**: PayOS đã tích hợp xong webhook, nhưng đội ngũ giữ tắt cho giai đoạn pilot.
>
> **Pattern quan trọng nhất** bọn em chọn là **local-first với Last-Write-Wins sync**: mọi mutation lưu local trước, sau đó push lên backend qua outbox queue. Khi conflict giữa nhiều thiết bị, dùng timestamp để resolve. Có Playwright E2E test cho 3 case: local wins, cloud wins, tombstone wins.
>
> Cả 2 mode `demo` và `real` được gate qua biến `VITE_APP_MODE` — preview branch chạy demo mode không cần backend, production chạy real mode đầy đủ."

---

## Phần 5 — Kết + Mời dùng (45 giây)

> "Dear Our Future hiện tại đã sẵn sàng cho người dùng thật. Em có cho cả lớp một link để tham gia luôn."

**Hiện slide QR code** dẫn về `https://dearourfuture.io.vn/login?mode=signup`.

> "Bọn em đang trong giai đoạn pilot — feedback từ thầy và các bạn rất quý. Cảm ơn thầy và các bạn đã lắng nghe."

---

## Q&A — Câu hỏi có thể gặp

### Câu hỏi sản phẩm

- **"Dữ liệu lưu ở đâu?"**
  → Local trong browser (IndexedDB + localStorage) làm primary, đồng thời sync lên cloud MongoDB Atlas. User tự sở hữu, có thể export hoặc xoá account bất kỳ lúc nào trong Settings.

- **"Free hay phải trả tiền?"**
  → Free hoàn toàn cho core 12-tuần. Plus 99k/tháng mở thêm template & insight nâng cao.

- **"Có thanh toán Plus được luôn không?"**
  → "Hiện tại bọn em giữ thanh toán tự động ở chế độ pilot — backend đã tích hợp PayOS xong, nhưng đội ngũ muốn theo dõi thêm sản phẩm trước khi mở rộng. Nếu thầy/bạn nào muốn dùng Plus ngay, email `support@dearourfuture.com` — bọn em mở thủ công trong 24h. Mục tiêu của bọn em hiện tại là chứng minh 12-tuần work tốt, chưa phải đẩy doanh thu."

- **"Có app mobile không?"**
  → Web responsive, mở trên trình duyệt mobile như app native. PWA roadmap.

- **"Khác Notion/Todoist như nào?"**
  → Notion là trang trắng, user phải tự nghĩ ra structure. Dear Our Future dẫn user qua structure dựa trên "12 Week Year" framework — không cần học, mở là dùng được.

### Câu hỏi kỹ thuật (lớp CNPM thường hỏi)

- **"Tech stack chi tiết?"**
  → Frontend: React 18 + Vite 6 + TypeScript + Tailwind + Radix + Lucide. Backend: Express + TypeScript + Mongoose. Auth: Firebase. DB: MongoDB Atlas. Payment: PayOS. Deploy: Vercel (FE) + Render (BE). Test: Vitest + Testing Library + Playwright. Lint: Biome.

- **"Tại sao chọn local-first thay vì server-first?"**
  → 3 lý do: (1) UX trải nghiệm tức thời, không spinner; (2) mất mạng vẫn dùng được, quan trọng cho mobile yếu; (3) giảm tải backend trong giai đoạn pilot, một mutation chỉ cần 1 lần round-trip qua outbox queue.

- **"Sync conflict resolution?"**
  → Last-Write-Wins dựa trên timestamp client. Có outbox queue để retry khi mất mạng. Tombstone cho delete để tránh resurrect bug. Đã test 3 scenario qua Playwright E2E.

- **"Tại sao Firebase Auth thay vì tự build?"**
  → Tiết kiệm thời gian + an toàn. Firebase đã giải bài toán email verification, password reset, Google OAuth, rate limit brute force. Backend dùng Firebase Admin để verify ID token thay vì tự issue JWT.

- **"Code có open source không?"**
  → Hiện tại private. Sau pilot cân nhắc open source phần frontend + một số module độc lập (12-week engine, SMART goal scoring).

- **"CI/CD?"**
  → Vercel + Render auto deploy từ branch `main`. Pre-merge chạy `typecheck`, `lint`, `test:run`, `build` qua GitHub Actions. Có Sentry cho error monitoring, env validation script chạy trước khi boot backend.

- **"Test coverage?"**
  → Unit test cho domain logic (SMART goal scoring, feasibility check, 12-week sync), component test cho UI flow, E2E test cho LWW sync. Chưa đo coverage % nhưng các path critical đều có test.

---

## Backup khi mạng/projector lỗi

- **Mạng yếu / Vercel down** → switch sang laptop chạy local: đã chuẩn bị `.env.development.local`, chạy `npm run dev`.
- **Cả mạng + local đều fail** → mở video record demo (chuẩn bị trước file `qa-artifacts/demo-record.mp4` nếu có).
- **Projector không nhận laptop** → in sẵn 1 trang giấy có QR code dẫn về signup, kể nhanh story 2 phút thay vì demo trực tiếp.
- **Quên mật khẩu demo account** → dùng "Quên mật khẩu" trên login page, reset qua email `demo+thuyettrinh@gmail.com` (cần truy cập inbox sẵn).

---

## Ghi chú co/dãn thời lượng

- **Nếu bị cắt còn 5 phút**: bỏ Phần 4 (kiến trúc), trả lời câu hỏi tech ở Q&A.
- **Nếu được nới lên 10 phút**: thêm 90s deep-dive vào tab Nhật ký + show flow viết weekly review trực tiếp.
- **Nếu thầy hỏi "demo onboarding luôn được không?"**: không nên — onboarding 6 bước dài, sẽ vỡ thời lượng. Trả lời "Em có chuẩn bị video onboarding 90 giây, gửi link sau buổi demo".
