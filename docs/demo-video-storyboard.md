# Kịch bản video demo AI - Vision Board Web Platform

Mục tiêu: tạo video demo chuyên nghiệp 75-90 giây, dùng màn hình app thật làm nguồn hình ảnh, AI hỗ trợ voiceover, subtitle, nhạc nền và cắt dựng.

## Thông số đề xuất

- Tỷ lệ: 16:9
- Độ phân giải: 1920x1080 hoặc 1440x900 upscale khi dựng
- Nhịp dựng: 10-12 cảnh, mỗi cảnh 5-8 giây
- Giọng đọc: tiếng Việt, rõ, chậm vừa, ít quảng cáo
- Bản quay local mặc định dùng `DEMO_VIDEO_APP_MODE=demo` để không cần Firebase session.
- Bản production-bound nên quay trên môi trường `VITE_APP_MODE=real` với tài khoản thật hoặc staging đã đăng nhập. Nếu chưa đăng nhập, các route workspace sẽ chuyển về `/login`.
- Không để lộ mock checkout, demo-only copy hoặc dữ liệu cá nhân thật trong bản dùng để launch.

## Voiceover 90 giây

Bạn có một tầm nhìn lớn cho cuộc sống, nhưng để biến nó thành hành động hằng tuần thì không dễ.

Vision Board Web Platform giúp bạn bắt đầu từ bức tranh tổng thể: nhìn lại tám khía cạnh cuộc sống, tìm vùng đang lệch nhịp, rồi chọn một trọng tâm đáng để cải thiện.

Từ đó, app hướng bạn viết mục tiêu theo khung SMART: kết quả cụ thể, chỉ số đo được, nguồn lực thực tế, lý do đủ mạnh và thời hạn rõ ràng.

Trước khi lập kế hoạch, hệ thống kiểm tra tính khả thi. Bạn sẽ biết mục tiêu đang đủ thực tế chưa, điểm nghẽn nằm ở thời gian, năng lượng, nguồn lực hay độ rõ ràng, và nên đi với nhịp nhẹ, cân bằng hay tăng tốc.

Khi mục tiêu đã chắc, app chia nó thành một chu kỳ 12 tuần: outcome cuối kỳ, chỉ số lag, hành động lead, mốc tuần 4, tuần 8, tuần 12 và ngày review cố định.

Mỗi ngày, bạn mở tab Hôm nay để biết việc quan trọng tiếp theo. Mỗi tuần, bạn review kết quả, ghi lại điều học được và điều chỉnh nhịp tuần sau.

Toàn bộ trải nghiệm được thiết kế local-first để không mất tiến độ khi mạng chập chờn, đồng thời production có đăng nhập, đồng bộ, billing và quản lý dữ liệu tài khoản.

Từ tầm nhìn đến hành động: rõ hơn, thực tế hơn và dễ theo sát hơn trong từng tuần.

## Shot list

| Cảnh | Màn hình | Nội dung hình ảnh | Voiceover chính | Gợi ý caption |
| --- | --- | --- | --- | --- |
| 1 | `/` | Mở app, không gian sản phẩm | Bạn có một tầm nhìn lớn... | Từ tầm nhìn đến hành động |
| 2 | `/onboarding` | Bắt đầu đánh giá 8 khía cạnh | Bắt đầu từ bức tranh tổng thể | Chấm điểm cuộc sống |
| 3 | `/life-balance` | Bánh xe cuộc sống và điểm hiện tại | Tìm vùng đang lệch nhịp | Life Balance |
| 4 | `/life-insight` | Chọn trọng tâm và hướng đi | Chọn một trọng tâm đáng cải thiện | Life Insight |
| 5 | `/smart-goal-setup` | SMART goal wizard | Viết mục tiêu cụ thể, đo được | SMART Goal |
| 6 | `/feasibility` | Kết quả khả thi | Kiểm tra mục tiêu trước khi lập kế hoạch | Feasibility Check |
| 7 | `/12-week-setup` | Thiết lập chu kỳ 12 tuần | Chia mục tiêu thành chu kỳ 12 tuần | 12-Week Plan |
| 8 | `/12-week-system?tab=today` | Việc hôm nay | Biết việc quan trọng tiếp theo | Today |
| 9 | `/12-week-system?tab=week` | Review tuần | Review kết quả và chỉnh nhịp | Weekly Review |
| 10 | `/12-week-system?tab=progress` | Tiến độ chu kỳ | Theo dõi tiến triển tuần qua tuần | Progress |
| 11 | `/journal` | Nhật ký phản tư | Ghi lại điều học được | Reflection |

## Prompt cho AI voiceover

```text
Đọc tiếng Việt giọng tự nhiên, chuyên nghiệp, bình tĩnh, rõ chữ. Tốc độ khoảng 0.92x, không quá quảng cáo, không quá kịch tính. Nhấn nhẹ vào các cụm: SMART goal, kiểm tra tính khả thi, chu kỳ 12 tuần, Hôm nay, review tuần, local-first.
```

## Prompt cho AI edit trong CapCut/Descript

```text
Dựng video demo SaaS/productivity app theo phong cách clean, professional. Giữ giao diện app là trọng tâm. Thêm zoom nhẹ vào CTA, tab Hôm nay, tab Tuần và biểu đồ tiến độ. Subtitle ngắn, tối đa 7 từ mỗi dòng. Nhạc nền ambient nhẹ, âm lượng thấp hơn voiceover. Transition nhanh, không dùng hiệu ứng hào nhoáng.
```

## Chạy automation

```bash
npm run demo:video
```

Lệnh trên chạy local ở `DEMO_VIDEO_APP_MODE=demo` để quay được core flow mà không cần Firebase login.

Output mặc định:

```text
artifacts/demo-video/<timestamp>/
```

Nếu đã có dev server:

```powershell
$env:DEMO_VIDEO_URL="http://localhost:5173"
npm run demo:video
```

Nếu cần ép app mode:

```powershell
$env:DEMO_VIDEO_APP_MODE="demo"
npm run demo:video
```

Nếu quay production-bound ở `real` mode, hãy chạy với một môi trường đã đăng nhập hoặc quay thủ công qua browser profile staging. Không dùng mock checkout/copy demo cho bản launch.
