# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ux-ui-upgrade-responsive.spec.ts >> ux-ui-upgrade · responsive · Dashboard (/) >> viewport 414×900 (mobile) >> layout & touch-target compliance
- Location: e2e\ux-ui-upgrade-responsive.spec.ts:300:9

# Error details

```
Error: Found 26 undersized Touch_Target(s) at 414px on Dashboard:
button "Âm thanh tập trung" 42.0×36.0@(221,14)
button "Đăng ký" 82.8×40.0@(269,12)
button 40.0×40.0@(358,12)
button "📚 Đọc sách" 93.4×29.4@(16,530)
button "🎧 IELTS 7.0" 93.5×29.4@(115,530)
button "🏋️ Gym" 68.7×29.4@(215,530)
button "💻 Portfolio" 91.6×29.4@(290,530)
button "🎨 1. Tầm nhìn" 124.0×31.4@(21,821)
button "⚡ 3. Việc Today" 124.0×31.4@(269,821)
button 40.0×40.0@(358,844)
a "Dear Our Future" 171.5×32.0@(16,4609)
a 36.0×36.0@(16,4749)
a "Trang chính" 83.8×19.0@(16,4859)
a "Tính năng" 70.6×19.0@(16,4892)
a "Gói & thanh toán" 121.9×19.0@(16,4926)
a "Hỏi đáp thanh toán" 139.0×19.0@(16,4960)
a "Trung tâm trợ giúp" 133.9×19.0@(16,4993)
a "Về Dear Our Future" 137.9×19.0@(16,5090)
a "Liên hệ" 51.8×19.0@(16,5123)
a "Điều khoản dịch vụ" 136.8×19.0@(16,5220)
a "Chính sách bảo mật" 144.8×19.0@(16,5253)
a "Chính sách hoàn tiền" 150.6×19.0@(16,5287)
button "Ẩn lộ trình" 106.3×40.0@(33,1051)
button "Để sau" 82.6×40.0@(33,1003)
button "Mở Trang chính" 162.8×40.0@(124,1003)
button "Close" 32.0×32.0@(357,71)

expect(received).toEqual(expected) // deep equality

- Expected  -   1
+ Received  + 340

- Array []
+ Array [
+   Object {
+     "bottom": 50,
+     "height": 36,
+     "index": 6,
+     "left": 221.234375,
+     "parentSig": "div.md:hidden.flex",
+     "right": 263.234375,
+     "role": null,
+     "tag": "button",
+     "text": "Âm thanh tập trung",
+     "top": 14,
+     "width": 42,
+   },
+   Object {
+     "bottom": 52,
+     "height": 40,
+     "index": 8,
+     "left": 269.234375,
+     "parentSig": "div.md:hidden.flex",
+     "right": 352,
+     "role": null,
+     "tag": "button",
+     "text": "Đăng ký",
+     "top": 12,
+     "width": 82.765625,
+   },
+   Object {
+     "bottom": 52,
+     "height": 40,
+     "index": 9,
+     "left": 358,
+     "parentSig": "div.md:hidden.flex",
+     "right": 398,
+     "role": null,
+     "tag": "button",
+     "text": "",
+     "top": 12,
+     "width": 40,
+   },
+   Object {
+     "bottom": 559.75,
+     "height": 29.390625,
+     "index": 10,
+     "left": 16,
+     "parentSig": "div.flex.flex-wrap",
+     "right": 109.390625,
+     "role": null,
+     "tag": "button",
+     "text": "📚 Đọc sách",
+     "top": 530.359375,
+     "width": 93.390625,
+   },
+   Object {
+     "bottom": 559.75,
+     "height": 29.390625,
+     "index": 11,
+     "left": 115.390625,
+     "parentSig": "div.flex.flex-wrap",
+     "right": 208.90625,
+     "role": null,
+     "tag": "button",
+     "text": "🎧 IELTS 7.0",
+     "top": 530.359375,
+     "width": 93.515625,
+   },
+   Object {
+     "bottom": 559.75,
+     "height": 29.390625,
+     "index": 12,
+     "left": 214.90625,
+     "parentSig": "div.flex.flex-wrap",
+     "right": 283.578125,
+     "role": null,
+     "tag": "button",
+     "text": "🏋️ Gym",
+     "top": 530.359375,
+     "width": 68.671875,
+   },
+   Object {
+     "bottom": 559.75,
+     "height": 29.390625,
+     "index": 13,
+     "left": 289.578125,
+     "parentSig": "div.flex.flex-wrap",
+     "right": 381.140625,
+     "role": null,
+     "tag": "button",
+     "text": "💻 Portfolio",
+     "top": 530.359375,
+     "width": 91.5625,
+   },
+   Object {
+     "bottom": 852.265625,
+     "height": 31.390625,
+     "index": 16,
+     "left": 21,
+     "parentSig": "div.flex.md:hidden",
+     "right": 145,
+     "role": null,
+     "tag": "button",
+     "text": "🎨 1. Tầm nhìn",
+     "top": 820.875,
+     "width": 124,
+   },
+   Object {
+     "bottom": 852.265625,
+     "height": 31.390625,
+     "index": 18,
+     "left": 269,
+     "parentSig": "div.flex.md:hidden",
+     "right": 393,
+     "role": null,
+     "tag": "button",
+     "text": "⚡ 3. Việc Today",
+     "top": 820.875,
+     "width": 124,
+   },
+   Object {
+     "bottom": 884,
+     "height": 40,
+     "index": 24,
+     "left": 358,
+     "parentSig": "div.fixed.bottom-4",
+     "right": 398,
+     "role": null,
+     "tag": "button",
+     "text": "",
+     "top": 844,
+     "width": 40,
+   },
+   Object {
+     "bottom": 4641.4375,
+     "height": 32,
+     "index": 25,
+     "left": 16,
+     "parentSig": "div",
+     "right": 187.484375,
+     "role": null,
+     "tag": "a",
+     "text": "Dear Our Future",
+     "top": 4609.4375,
+     "width": 171.484375,
+   },
+   Object {
+     "bottom": 4785.03125,
+     "height": 36,
+     "index": 26,
+     "left": 16,
+     "parentSig": "div.mt-4.flex",
+     "right": 52,
+     "role": null,
+     "tag": "a",
+     "text": "",
+     "top": 4749.03125,
+     "width": 36,
+   },
+   Object {
+     "bottom": 4877.875,
+     "height": 19,
+     "index": 27,
+     "left": 16,
+     "parentSig": "li",
+     "right": 99.84375,
+     "role": null,
+     "tag": "a",
+     "text": "Trang chính",
+     "top": 4858.875,
+     "width": 83.84375,
+   },
+   Object {
+     "bottom": 4911.46875,
+     "height": 19,
+     "index": 28,
+     "left": 16,
+     "parentSig": "li",
+     "right": 86.59375,
+     "role": null,
+     "tag": "a",
+     "text": "Tính năng",
+     "top": 4892.46875,
+     "width": 70.59375,
+   },
+   Object {
+     "bottom": 4945.0625,
+     "height": 19,
+     "index": 29,
+     "left": 16,
+     "parentSig": "li",
+     "right": 137.859375,
+     "role": null,
+     "tag": "a",
+     "text": "Gói & thanh toán",
+     "top": 4926.0625,
+     "width": 121.859375,
+   },
+   Object {
+     "bottom": 4978.65625,
+     "height": 19,
+     "index": 30,
+     "left": 16,
+     "parentSig": "li",
+     "right": 155,
+     "role": null,
+     "tag": "a",
+     "text": "Hỏi đáp thanh toán",
+     "top": 4959.65625,
+     "width": 139,
+   },
+   Object {
+     "bottom": 5012.25,
+     "height": 19,
+     "index": 31,
+     "left": 16,
+     "parentSig": "li",
+     "right": 149.875,
+     "role": null,
+     "tag": "a",
+     "text": "Trung tâm trợ giúp",
+     "top": 4993.25,
+     "width": 133.875,
+   },
+   Object {
+     "bottom": 5108.6875,
+     "height": 19,
+     "index": 32,
+     "left": 16,
+     "parentSig": "li",
+     "right": 153.90625,
+     "role": null,
+     "tag": "a",
+     "text": "Về Dear Our Future",
+     "top": 5089.6875,
+     "width": 137.90625,
+   },
+   Object {
+     "bottom": 5142.28125,
+     "height": 19,
+     "index": 33,
+     "left": 16,
+     "parentSig": "li",
+     "right": 67.828125,
+     "role": null,
+     "tag": "a",
+     "text": "Liên hệ",
+     "top": 5123.28125,
+     "width": 51.828125,
+   },
+   Object {
+     "bottom": 5238.71875,
+     "height": 19,
+     "index": 34,
+     "left": 16,
+     "parentSig": "li",
+     "right": 152.78125,
+     "role": null,
+     "tag": "a",
+     "text": "Điều khoản dịch vụ",
+     "top": 5219.71875,
+     "width": 136.78125,
+   },
+   Object {
+     "bottom": 5272.3125,
+     "height": 19,
+     "index": 35,
+     "left": 16,
+     "parentSig": "li",
+     "right": 160.78125,
+     "role": null,
+     "tag": "a",
+     "text": "Chính sách bảo mật",
+     "top": 5253.3125,
+     "width": 144.78125,
+   },
+   Object {
+     "bottom": 5305.90625,
+     "height": 19,
+     "index": 36,
+     "left": 16,
+     "parentSig": "li",
+     "right": 166.609375,
+     "role": null,
+     "tag": "a",
+     "text": "Chính sách hoàn tiền",
+     "top": 5286.90625,
+     "width": 150.609375,
+   },
+   Object {
+     "bottom": 1091.21875,
+     "height": 40,
+     "index": 37,
+     "left": 33,
+     "parentSig": "div.flex.flex-wrap",
+     "right": 139.25,
+     "role": null,
+     "tag": "button",
+     "text": "Ẩn lộ trình",
+     "top": 1051.21875,
+     "width": 106.25,
+   },
+   Object {
+     "bottom": 1043.21875,
+     "height": 40,
+     "index": 38,
+     "left": 33,
+     "parentSig": "div.flex.flex-wrap",
+     "right": 115.59375,
+     "role": null,
+     "tag": "button",
+     "text": "Để sau",
+     "top": 1003.21875,
+     "width": 82.59375,
+   },
+   Object {
+     "bottom": 1043.21875,
+     "height": 40,
+     "index": 39,
+     "left": 123.59375,
+     "parentSig": "div.flex.flex-wrap",
+     "right": 286.34375,
+     "role": null,
+     "tag": "button",
+     "text": "Mở Trang chính",
+     "top": 1003.21875,
+     "width": 162.75,
+   },
+   Object {
+     "bottom": 103,
+     "height": 32,
+     "index": 40,
+     "left": 357,
+     "parentSig": "div#radix-:r8:[role=dialog].bg-card.text-card-foreground",
+     "right": 389,
+     "role": null,
+     "tag": "button",
+     "text": "Close",
+     "top": 71,
+     "width": 32,
+   },
+ ]
```

# Page snapshot

```yaml
- generic:
  - generic:
    - generic:
      - link:
        - /url: "#main-content"
        - text: Bỏ qua điều hướng
      - generic:
        - banner:
          - generic:
            - generic:
              - generic:
                - button:
                  - img
                  - generic:
                    - generic: Dear Our Future
              - generic:
                - button:
                  - generic:
                    - img
                - button: Đăng ký
                - button:
                  - img
        - main "Nội dung trang":
          - status: Trang chính
          - generic:
            - generic:
              - generic:
                - generic:
                  - generic:
                    - generic:
                      - generic:
                        - generic:
                          - generic:
                            - generic: ✨ DEAR OUR FUTURE
                            - heading "Thiết lập cuộc sống mơ ước qua kế hoạch 12 tuần bền bỉ" [level=1]
                            - paragraph: Nơi mục tiêu lớn được chia nhỏ thành thói quen kỷ luật mỗi ngày. Đánh giá bánh xe cuộc sống, xây dựng mục tiêu SMART và thực thi dứt khoát.
                          - generic:
                            - paragraph: "Hành trình 5 giây gặt hái kết quả:"
                            - generic:
                              - generic:
                                - generic: 🎨
                                - generic: 1. Tầm nhìn
                                - generic: Bảng ước mơ
                              - generic:
                                - generic: 🎯
                                - generic: 2. Mục tiêu
                                - generic: Chuẩn SMART
                              - generic:
                                - generic: 🗓️
                                - generic: 3. Kế hoạch
                                - generic: Lộ trình 12 tuần
                              - generic:
                                - generic: ⚡
                                - generic: 4. Hành động
                                - generic: Việc Today
                          - generic:
                            - paragraph: "Chọn xem ví dụ thực tế:"
                            - generic:
                              - button "📚 Đọc sách" [pressed]
                              - button "🎧 IELTS 7.0"
                              - button "🏋️ Gym"
                              - button "💻 Portfolio"
                          - generic:
                            - button "Thiết lập chu kỳ 12 tuần ngay":
                              - text: Thiết lập chu kỳ 12 tuần ngay
                              - img
                            - button "Xem lộ trình ghim chu kỳ"
                          - generic:
                            - paragraph:
                              - generic: ✦
                              - text: Thiết lập nhanh trong 3 phút để nhận Bánh xe cuộc sống và gợi ý mục tiêu đầu tiên.
                      - generic:
                        - generic:
                          - generic:
                            - button "🎨 1. Tầm nhìn"
                            - button "🎯 2. Chuẩn SMART"
                            - button "⚡ 3. Việc Today"
                          - generic:
                            - generic:
                              - img
                              - generic: Streak +1 Ngày! 🔥
                            - generic:
                              - generic:
                                - generic:
                                  - text: Bảng tầm nhìn
                                  - heading "1. Ước mơ mơ hồ" [level=3]
                                - generic:
                                  - img "Bảng tầm nhìn chi tiết"
                              - generic:
                                - generic: Tiếng gọi tâm hồn
                                - paragraph: "\"Phát triển tri thức\""
                  - region "So sánh trước và sau":
                    - generic:
                      - paragraph:
                        - generic: ✕
                        - text: Trước khi sử dụng
                      - heading "Mục tiêu mơ hồ" [level=3]
                      - list:
                        - listitem:
                          - generic: ✕
                          - generic: "\"Muốn sống khỏe hơn\" — ý muốn mơ hồ không biết bắt đầu từ đâu."
                        - listitem:
                          - generic: ✕
                          - generic: Viết To-do list rồi nhanh chóng quên sạch sau 2 tuần.
                        - listitem:
                          - generic: ✕
                          - generic: Thiếu nhịp điệu cam kết hàng ngày và ngày khóa review tuần.
                    - generic:
                      - paragraph:
                        - generic: ✓
                        - text: Kế hoạch 12 tuần rõ nét
                      - heading "Kỷ luật & Trọng tâm" [level=3]
                      - list:
                        - listitem:
                          - generic: ✓
                          - generic: Có 1 mục tiêu SMART xuất phát từ bảng tầm nhìn rực rỡ.
                        - listitem:
                          - generic: ✓
                          - generic: Chiến thuật 12 tuần chặt chẽ và chỉ số lead hoàn thành.
                        - listitem:
                          - generic: ✓
                          - generic: Mở danh sách việc Today tinh gọn mỗi sáng và hành động dứt khoát.
                  - region "Lộ trình 4 bước chuyển mình rõ nét":
                    - generic:
                      - paragraph: Kiến tạo tương lai
                      - heading "Lộ trình 4 bước chuyển mình rõ nét" [level=2]
                    - generic:
                      - list:
                        - listitem:
                          - generic: "01"
                          - generic:
                            - generic: Bước 1 · Nhìn nhận
                            - heading "Cân bằng cuộc sống" [level=4]
                            - paragraph: Đánh giá 8 khía cạnh cuộc sống để phát hiện điểm lệch nhịp cần cải thiện đầu tiên.
                          - generic:
                            - generic: ● Radar cuộc sống
                            - generic: ≈3 phút
                        - listitem:
                          - generic: "02"
                          - generic:
                            - generic: Bước 2 · Định vị
                            - heading "Đặt mục tiêu SMART" [level=4]
                            - paragraph: Chọn lĩnh vực ưu tiên và đóng gói mong muốn thành mục tiêu SMART đo lường được.
                          - generic:
                            - generic: ● 1 tiêu điểm sắc nét
                            - generic: ≈5 phút
                        - listitem:
                          - generic: "03"
                          - generic:
                            - generic: Bước 3 · Thiết lập
                            - heading "Kế hoạch 12 tuần" [level=4]
                            - paragraph: Xây dựng thói quen lặp lại (tactics) và checkpoint đo lường tiến độ tự động.
                          - generic:
                            - generic: ● Lộ trình 12 tuần
                            - generic: ≈5 phút
                        - listitem:
                          - generic: "04"
                          - generic:
                            - generic: Bước 4 · Thực thi
                            - heading "Hành động mỗi ngày" [level=4]
                            - paragraph: Mở việc Today mỗi sáng, tick hoàn thành và phản tư ngắn vào cuối tuần.
                          - generic:
                            - generic: ● Today & Kỷ luật
                            - generic: 2 phút mỗi ngày
                  - region "Vì sao chọn Dear Our Future":
                    - link "Miễn phí Bắt đầu không tốn xu nào Dữ liệu lưu trên thiết bị, đồng bộ giữa điện thoại và máy tính khi bạn đăng nhập. Tìm hiểu thêm":
                      - /url: /life-balance
                      - generic:
                        - generic:
                          - img
                        - generic:
                          - paragraph: Miễn phí
                          - heading "Bắt đầu không tốn xu nào" [level=2]
                          - paragraph: Dữ liệu lưu trên thiết bị, đồng bộ giữa điện thoại và máy tính khi bạn đăng nhập.
                          - generic:
                            - text: Tìm hiểu thêm
                            - img
                    - link "Đúng thứ tự Không phải trang trắng như Notion Dear Our Future dẫn bạn qua đúng các bước có nghiên cứu sau lưng, không bị rối khi mới bắt đầu. Tìm hiểu thêm":
                      - /url: /12-week-setup
                      - generic:
                        - generic:
                          - img
                        - generic:
                          - paragraph: Đúng thứ tự
                          - heading "Không phải trang trắng như Notion" [level=2]
                          - paragraph: Dear Our Future dẫn bạn qua đúng các bước có nghiên cứu sau lưng, không bị rối khi mới bắt đầu.
                          - generic:
                            - text: Tìm hiểu thêm
                            - img
                    - link "Mobile-ready Đủ nhẹ cho buổi sáng vội Mở Today, tick xong việc, đóng lại. Không cần học UI phức tạp hay setup dài dòng. Tìm hiểu thêm":
                      - /url: /12-week-system?tab=today
                      - generic:
                        - generic:
                          - img
                        - generic:
                          - paragraph: Mobile-ready
                          - heading "Đủ nhẹ cho buổi sáng vội" [level=2]
                          - paragraph: Mở Today, tick xong việc, đóng lại. Không cần học UI phức tạp hay setup dài dòng.
                          - generic:
                            - text: Tìm hiểu thêm
                            - img
                  - region "Kiến tạo phiên bản rực rỡ nhất của bạn":
                    - generic:
                      - generic:
                        - generic:
                          - generic: Gửi lời chào tới tương lai
                          - heading "Kiến tạo phiên bản rực rỡ nhất của bạn" [level=2]
                          - paragraph: Dành 10 phút tĩnh lặng thiết lập chu kỳ hành động 12 tuần của bạn ngay hôm nay để thắp sáng bản đồ mục tiêu.
                        - generic:
                          - button "Thiết lập chu kỳ 12 tuần ngay":
                            - img
                            - text: Thiết lập chu kỳ 12 tuần ngay
                          - paragraph:
                            - generic: ✦
                            - text: Nhận ngay việc làm hôm nay để khởi động
                - generic:
                  - button "Góp ý":
                    - img
          - generic:
            - generic:
              - generic:
                - generic:
                  - link:
                    - /url: /
                    - generic: Dear Our Future
                  - paragraph: Một chỗ tĩnh để lập kế hoạch 12 tuần, nhìn lại tuần sống và sống có chủ đích hơn mỗi ngày.
                  - generic:
                    - link:
                      - /url: https://www.facebook.com/profile.php?id=61589773962146
                      - img
                - generic:
                  - heading [level=3]: Sản phẩm
                  - list:
                    - listitem:
                      - link:
                        - /url: /
                        - text: Trang chính
                    - listitem:
                      - link:
                        - /url: /#features
                        - text: Tính năng
                    - listitem:
                      - link:
                        - /url: /billing/plan
                        - text: Gói & thanh toán
                    - listitem:
                      - link:
                        - /url: /billing/faq
                        - text: Hỏi đáp thanh toán
                    - listitem:
                      - link:
                        - /url: /help
                        - text: Trung tâm trợ giúp
                - generic:
                  - heading [level=3]: Công ty
                  - list:
                    - listitem:
                      - link:
                        - /url: /
                        - text: Về Dear Our Future
                    - listitem:
                      - link:
                        - /url: mailto:dearourfuture123@gmail.com
                        - text: Liên hệ
                - generic:
                  - heading [level=3]: Pháp lý
                  - list:
                    - listitem:
                      - link:
                        - /url: /terms
                        - text: Điều khoản dịch vụ
                    - listitem:
                      - link:
                        - /url: /privacy
                        - text: Chính sách bảo mật
                    - listitem:
                      - link:
                        - /url: /refund-policy
                        - text: Chính sách hoàn tiền
              - generic:
                - paragraph:
                  - text: © 2026 Dear Our Future. Made with ❤️
                  - generic: tình yêu
                  - text: ở Việt Nam.
                - paragraph: Local-first · Hoạt động trên mọi thiết bị
      - region "Notifications alt+T"
  - dialog "Xem nhanh luồng chính của app theo đúng thứ tự." [ref=e2]:
    - generic [ref=e3]:
      - generic [ref=e4]:
        - img [ref=e5]
        - text: Cách bắt đầu nhanh
      - heading "Xem nhanh luồng chính của app theo đúng thứ tự." [level=2] [ref=e7]
      - paragraph [ref=e8]: Web đã có dữ liệu mẫu sẵn. Đi theo thứ tự này để hiểu luồng thật.
    - generic [ref=e9]: "Luồng chuẩn khi dùng thật: Bánh xe cuộc sống → Chọn trọng tâm → SMART Goal → Kiểm tra khả thi → Chu kỳ 12 tuần."
    - generic [ref=e10]:
      - generic [ref=e12]: 0/4 bước đã xong
      - generic [ref=e13]:
        - generic [ref=e15]:
          - generic [ref=e16]: "1"
          - generic [ref=e17]:
            - paragraph [ref=e18]: Xem Trang chính trước
            - paragraph [ref=e19]: Mở Trang chính để nhìn nhanh cấu trúc web và hiểu một chu kỳ 12 tuần trông như thế nào.
        - generic [ref=e21]:
          - generic [ref=e22]: "2"
          - generic [ref=e23]:
            - paragraph [ref=e24]: Mở một mục tiêu mẫu
            - paragraph [ref=e25]: Vào màn Mục tiêu để xem cách một mục tiêu đã đi qua góc nhìn cuộc sống, mục tiêu SMART và 12 tuần được trình bày ra sao.
        - generic [ref=e27]:
          - generic [ref=e28]: "3"
          - generic [ref=e29]:
            - paragraph [ref=e30]: Thử việc hôm nay
            - paragraph [ref=e31]: "Mở trung tâm 12 tuần và xem cách web trả lời câu hỏi: hôm nay tôi nên làm gì trước."
        - generic [ref=e33]:
          - generic [ref=e34]: "4"
          - generic [ref=e35]:
            - paragraph [ref=e36]: Mở thử review tuần
            - paragraph [ref=e37]: Chuyển sang tab Tuần để xem điểm, phần nhìn lại và cách quyết định tải cho tuần sau.
    - generic [ref=e38]:
      - button "Ẩn lộ trình" [active] [ref=e40] [cursor=pointer]
      - generic [ref=e41]:
        - button "Để sau" [ref=e42] [cursor=pointer]
        - button "Mở Trang chính" [ref=e43] [cursor=pointer]:
          - text: Mở Trang chính
          - img
    - button "Close" [ref=e44] [cursor=pointer]:
      - img
      - generic [ref=e45]: Close
```

# Test source

```ts
  268 |           if (gap >= 0 && gap < minGap) {
  269 |             violations.push({ a, b, axis: "horizontal", gap });
  270 |           }
  271 |         } else if (horizontalOverlap > 0 && verticalOverlap <= 0) {
  272 |           // Stacked in a column. Edge-to-edge vertical distance.
  273 |           const gap = Math.max(a.top, b.top) - Math.min(a.bottom, b.bottom);
  274 |           if (gap >= 0 && gap < minGap) {
  275 |             violations.push({ a, b, axis: "vertical", gap });
  276 |           }
  277 |         }
  278 |         // Pairs that overlap on both axes (decorative stacks, icon-on-button)
  279 |         // or have no overlap at all (different rows/columns) are skipped.
  280 |       }
  281 |     }
  282 |   }
  283 |   return violations;
  284 | }
  285 | 
  286 | function describeRect(r: TouchTargetRect): string {
  287 |   const idLabel = r.role ? `${r.tag}[role=${r.role}]` : r.tag;
  288 |   const text = r.text ? ` "${r.text}"` : "";
  289 |   return `${idLabel}${text} ${r.width.toFixed(1)}×${r.height.toFixed(1)}@(${r.left.toFixed(0)},${r.top.toFixed(0)})`;
  290 | }
  291 | 
  292 | // ── Tests ─────────────────────────────────────────────────────────
  293 | 
  294 | for (const route of ROUTES) {
  295 |   test.describe(`ux-ui-upgrade · responsive · ${route.label} (${route.path})`, () => {
  296 |     for (const vp of VIEWPORTS) {
  297 |       test.describe(`viewport ${vp.width}×${vp.height} (${vp.bucket})`, () => {
  298 |         test.use({ viewport: { width: vp.width, height: vp.height } });
  299 | 
  300 |         test("layout & touch-target compliance", async ({ page }) => {
  301 |           await gotoRoute(page, route.path);
  302 | 
  303 |           // ── Padding tokens (Requirements 6.2 & 6.3) ──────────────
  304 |           const padding = await readPaddingMetrics(page);
  305 |           expect(padding.cardPaddingDesktopRaw, "--app-card-padding must be defined").not.toBe("");
  306 |           expect(padding.cardPaddingMobileRaw, "--app-card-padding-mobile must be defined").not.toBe("");
  307 |           expect(
  308 |             padding.cardPaddingDesktopRaw,
  309 |             "Mobile and desktop card padding tokens must differ (otherwise Req 6.3 cannot be enforced)",
  310 |           ).not.toBe(padding.cardPaddingMobileRaw);
  311 | 
  312 |           if (vp.bucket === "desktop") {
  313 |             // Req 6.2: ≥768px uses desktop spacing. PageShell scales padding
  314 |             // via `px-4 sm:px-6 lg:px-8` — at ≥768px the effective padding
  315 |             // should be at least the mobile baseline (16px) and grow with
  316 |             // viewport width.
  317 |             expect(padding.shellPaddingLeftPx, "Desktop shell paddingLeft").toBeGreaterThanOrEqual(16);
  318 |             expect(padding.shellPaddingRightPx, "Desktop shell paddingRight").toBeGreaterThanOrEqual(16);
  319 |           } else {
  320 |             // Req 6.3: <768px uses the mobile padding token. We verify the
  321 |             // mobile token resolves to a non-zero length and the shell
  322 |             // padding is non-zero (i.e. content is not flush against the
  323 |             // viewport edge).
  324 |             expect(padding.shellPaddingLeftPx, "Mobile shell paddingLeft").toBeGreaterThan(0);
  325 |             expect(padding.shellPaddingRightPx, "Mobile shell paddingRight").toBeGreaterThan(0);
  326 |           }
  327 | 
  328 |           // ── Horizontal scroll (Requirements 6.1 & 6.6) ───────────
  329 |           const metrics = await readScrollMetrics(page);
  330 | 
  331 |           if (vp.bucket === "mobile") {
  332 |             // Req 6.1: 360–767px → no horizontal scroll. Allow a 1px
  333 |             // sub-pixel rounding tolerance.
  334 |             expect(
  335 |               metrics.scrollWidth,
  336 |               `No horizontal scroll expected at ${vp.width}px (scrollWidth ${metrics.scrollWidth}, clientWidth ${metrics.clientWidth})`,
  337 |             ).toBeLessThanOrEqual(metrics.clientWidth + 1);
  338 |             expect(metrics.overflowX, "html overflow-x must not be 'scroll' in mobile range").not.toBe("scroll");
  339 |           } else if (vp.bucket === "sub-360") {
  340 |             // Req 6.6: <360px → keep the 360px layout. Inner horizontal
  341 |             // scroll is allowed but the layout must not collapse below the
  342 |             // 360px breakpoint.
  343 |             expect(
  344 |               metrics.scrollWidth,
  345 |               `Sub-360 layout must keep ≥${MIN_LAYOUT_BREAKPOINT_PX}px content width (got scrollWidth ${metrics.scrollWidth})`,
  346 |             ).toBeGreaterThanOrEqual(MIN_LAYOUT_BREAKPOINT_PX);
  347 |           } else {
  348 |             // Desktop: no specific horizontal-scroll rule, but content
  349 |             // should still fit without runaway horizontal overflow.
  350 |             expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 2);
  351 |           }
  352 | 
  353 |           // ── Touch_Target sizing (Requirement 6.4) ────────────────
  354 |           const targets = await measureTouchTargets(page, TOUCH_TARGET_SELECTOR);
  355 | 
  356 |           // Desktop viewports may use mouse-class controls; the requirement
  357 |           // is scoped to "khung nhìn cảm ứng" (touch viewports). We still
  358 |           // run the check on mobile/sub-360 viewports where touch is the
  359 |           // expected input.
  360 |           if (vp.bucket !== "desktop") {
  361 |             const undersized = targets.filter(
  362 |               (t) => t.width < MIN_TOUCH_TARGET_PX || t.height < MIN_TOUCH_TARGET_PX,
  363 |             );
  364 |             expect(
  365 |               undersized,
  366 |               `Found ${undersized.length} undersized Touch_Target(s) at ${vp.width}px on ${route.label}:\n` +
  367 |                 undersized.map(describeRect).join("\n"),
> 368 |             ).toEqual([]);
      |               ^ Error: Found 26 undersized Touch_Target(s) at 414px on Dashboard:
  369 |           }
  370 | 
  371 |           // ── Adjacent gap (Requirement 6.5) ───────────────────────
  372 |           if (vp.bucket !== "desktop") {
  373 |             const violations = findAdjacencyViolations(targets, MIN_ADJACENT_GAP_PX);
  374 |             expect(
  375 |               violations,
  376 |               `Found ${violations.length} adjacent Touch_Target gap violation(s) at ${vp.width}px on ${route.label}:\n` +
  377 |                 violations
  378 |                   .map((v) => `  · [${v.axis} gap ${v.gap.toFixed(1)}px] ${describeRect(v.a)} ↔ ${describeRect(v.b)}`)
  379 |                   .join("\n"),
  380 |             ).toEqual([]);
  381 |           }
  382 | 
  383 |           // ── Sub-360 Touch_Target containment (Requirement 6.6) ───
  384 |           if (vp.bucket === "sub-360") {
  385 |             // Targets must remain reachable inside the 360px content area
  386 |             // (no clipping out of the scrollable frame).
  387 |             const clipped = targets.filter(
  388 |               (t) => t.right > metrics.scrollWidth + 1 || t.left < -1,
  389 |             );
  390 |             expect(
  391 |               clipped,
  392 |               `Found ${clipped.length} Touch_Target(s) clipped outside the 360-layout content area at ${vp.width}px:\n` +
  393 |                 clipped.map(describeRect).join("\n"),
  394 |             ).toEqual([]);
  395 |           }
  396 |         });
  397 |       });
  398 |     }
  399 |   });
  400 | }
  401 | 
```