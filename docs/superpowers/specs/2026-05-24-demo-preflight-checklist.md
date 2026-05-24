# Pre-flight checklist sáng demo — Lớp Công nghệ phần mềm

> Demo dự kiến: cuối tuần này (Thứ Bảy 30/05/2026 hoặc Chủ Nhật 31/05/2026 — chốt cụ thể với thầy)
> URL: <https://dearourfuture.io.vn/>
> Demo account: `demo+thuyettrinh@gmail.com` (password lưu riêng, KHÔNG ghi vào file này)
> Đi kèm: [`2026-05-24-demo-script-lop.md`](2026-05-24-demo-script-lop.md:1)

---

## Tối hôm trước

- [ ] Verify URL <https://dearourfuture.io.vn/> load được trên cả mobile + laptop.
- [ ] Login demo account, verify data 12-tuần vẫn đầy đủ:
  - [ ] Tab Hôm nay: có 2–3 task hiển thị
  - [ ] Tab Tiến độ: tổng completion ở khoảng 25–35%
  - [ ] Tab Tuần: có ít nhất 1 weekly review đã viết
  - [ ] `/journal`: có reflection auto-sinh từ weekly review
- [ ] Verify `/billing/plan` hiển thị copy production: _"Đang hoàn tất tích hợp hệ thống thanh toán mới — sẵn sàng trong tuần tới"_ (không thấy copy mock).
- [ ] Charge laptop **100%**.
- [ ] Sạc dự phòng + cáp USB-C / HDMI adapter cho vào balo.
- [ ] Test máy chiếu (nếu được phép mượn trước).
- [ ] In sẵn 1 trang giấy có **QR code dẫn về signup** (`https://dearourfuture.io.vn/login?mode=signup`) — phòng khi WiFi/projector hỏng.
- [ ] Chuẩn bị slide QR code + 1 slide kiến trúc (Frontend / Backend / Auth / Payment / Deploy) cho Phần 4 của script.
- [ ] Đọc lại 1 lượt script `2026-05-24-demo-script-lop.md`, gạch chân các câu nhấn mạnh.
- [ ] (Tuỳ chọn) Record 1 video demo backup, lưu vào `qa-artifacts/demo-record.mp4`.

## Sáng demo, 30 phút trước

- [ ] Đến phòng sớm.
- [ ] Kiểm tra cáp / cổng / độ phân giải máy chiếu.
- [ ] Mở **incognito Chrome** trên laptop (không nhầm với profile cá nhân).
- [ ] Login demo account `demo+thuyettrinh@gmail.com`.
- [ ] Mở 3 tab theo thứ tự bên trái → phải:
  1. `https://dearourfuture.io.vn/` (PublicVisitorView)
  2. `https://dearourfuture.io.vn/12-week-system`
  3. `https://dearourfuture.io.vn/journal`
- [ ] Set font size browser readable từ cuối lớp (Ctrl/Cmd + dấu cộng 1–2 lần, target zoom 110–125%).
- [ ] Tắt notification toàn hệ thống:
  - [ ] Windows: Focus Assist → "Alarms only"
  - [ ] macOS: Do Not Disturb → On
- [ ] Đóng Slack, Discord, Outlook/email, Telegram.
- [ ] Verify mic + audio (nếu có demo video backup).
- [ ] Lấy 1 ngụm nước, hít thở sâu 3 nhịp.

## Ngay trước khi nói

- [ ] Tab 1 (`/`) đang ở vị trí scroll đầu trang, zoom level OK.
- [ ] Verify mạng còn: chạy `ping dearourfuture.io.vn` trong terminal — nhìn thấy reply là OK.
- [ ] Để điện thoại ở chế độ im lặng, mở app Đồng hồ làm timer 7 phút.
- [ ] Đặt slide QR code mời đăng ký mở sẵn ở cửa sổ riêng (Window 2 hoặc 1 tab thứ 4).
- [ ] Hít thở. Mỉm cười. Bắt đầu Phần 1.

## Sau demo

- [ ] Cảm ơn thầy + lớp.
- [ ] Hiện QR code trong 30s cuối, đọc rõ địa chỉ web nếu QR không quét được.
- [ ] Thu thập feedback ngay tại lớp (1–2 câu hỏi mở: "thầy/bạn thấy phần nào nhớ nhất?", "có chỗ nào confusing không?").
- [ ] Note feedback vào notebook hoặc app ngay khi vừa rời bục.
- [ ] **Logout demo account** khỏi máy phòng (nếu dùng máy chung của trường).
- [ ] (Tuỳ chọn) Gửi email/Zalo cho lớp link signup + slide kiến trúc trong vòng 24h.

---

## Quick reference khi gặp sự cố

| Sự cố                       | Hành động                                                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Mạng chập chờn              | Switch sang hotspot điện thoại; nếu vẫn fail → mở video backup                                                            |
| Vercel/domain down          | Chạy local: `npm run dev`, mở `http://localhost:5173`                                                                     |
| Projector không nhận laptop | Đổi cổng / restart laptop / nhờ bạn cầm điện thoại quay lại màn hình laptop                                               |
| Quên mật khẩu demo          | Reset qua "Quên mật khẩu" — cần truy cập inbox `demo+thuyettrinh@gmail.com`                                               |
| Lỡ tick task / tick nhầm    | Bình tĩnh, untick lại; coi như "demo cũng có thể quay lại như user thật"                                                  |
| Hết 7 phút mà chưa xong     | Bỏ Phần 4 (kiến trúc), chuyển thẳng Phần 5 — kiến trúc trả lời ở Q&A                                                      |
| Lớp im lặng không hỏi       | Chủ động gợi: "Nếu thầy hoặc bạn nào quan tâm phần kỹ thuật, em sẵn sàng nói thêm về local-first sync hoặc Firebase Auth" |

---

## Thông tin liên hệ khẩn

- Support email production: `support@dearourfuture.com`
- Repo: local trên laptop (`C:\Users\admin\Downloads\Vision Board Web Platform\`)
- Backend health check: `https://<render-backend-url>/health` (nhớ địa chỉ thật trước demo)
