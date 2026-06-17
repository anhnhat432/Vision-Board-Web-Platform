# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ux-ui-upgrade-responsive.spec.ts >> ux-ui-upgrade · responsive · LifeBalance (/life-balance) >> viewport 414×900 (mobile) >> layout & touch-target compliance
- Location: e2e\ux-ui-upgrade-responsive.spec.ts:300:9

# Error details

```
Error: Found 23 undersized Touch_Target(s) at 414px on LifeBalance:
button "Âm thanh tập trung" 42.0×36.0@(221,14)
button "Đăng ký" 82.8×40.0@(269,12)
button 40.0×40.0@(358,12)
button[role=tab] "Hiện tại" 88.7×35.3@(21,817)
button[role=tab] "Trọng tâm" 134.2×35.3@(114,817)
button[role=tab] "Lịch sử" 84.0×35.3@(252,817)
a "Làm lại khảo sát toàn diện →" 184.3×18.8@(193,2527)
a "Dear Our Future" 171.5×32.0@(16,2776)
a 36.0×36.0@(16,2916)
a "Trang chính" 83.8×19.0@(16,3026)
a "Tính năng" 70.6×19.0@(16,3059)
a "Gói & thanh toán" 121.9×19.0@(16,3093)
a "Hỏi đáp thanh toán" 139.0×19.0@(16,3126)
a "Trung tâm trợ giúp" 133.9×19.0@(16,3160)
a "Về Dear Our Future" 137.9×19.0@(16,3256)
a "Liên hệ" 51.8×19.0@(16,3290)
a "Điều khoản dịch vụ" 136.8×19.0@(16,3387)
a "Chính sách bảo mật" 144.8×19.0@(16,3420)
a "Chính sách hoàn tiền" 150.6×19.0@(16,3454)
button "Ẩn lộ trình" 106.3×40.0@(33,1051)
button "Để sau" 82.6×40.0@(33,1003)
button "Mở Trang chính" 162.8×40.0@(124,1003)
button "Close" 32.0×32.0@(357,71)

expect(received).toEqual(expected) // deep equality

- Expected  -   1
+ Received  + 301

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
+     "bottom": 852,
+     "height": 35.25,
+     "index": 11,
+     "left": 21,
+     "parentSig": "div[role=tablist].inline-flex.max-w-full",
+     "right": 109.65625,
+     "role": "tab",
+     "tag": "button",
+     "text": "Hiện tại",
+     "top": 816.75,
+     "width": 88.65625,
+   },
+   Object {
+     "bottom": 852,
+     "height": 35.25,
+     "index": 12,
+     "left": 113.65625,
+     "parentSig": "div[role=tablist].inline-flex.max-w-full",
+     "right": 247.84375,
+     "role": "tab",
+     "tag": "button",
+     "text": "Trọng tâm",
+     "top": 816.75,
+     "width": 134.1875,
+   },
+   Object {
+     "bottom": 852,
+     "height": 35.25,
+     "index": 13,
+     "left": 251.84375,
+     "parentSig": "div[role=tablist].inline-flex.max-w-full",
+     "right": 335.84375,
+     "role": "tab",
+     "tag": "button",
+     "text": "Lịch sử",
+     "top": 816.75,
+     "width": 84,
+   },
+   Object {
+     "bottom": 2546.21875,
+     "height": 18.84375,
+     "index": 15,
+     "left": 192.703125,
+     "parentSig": "div.mt-4.pt-4",
+     "right": 377,
+     "role": null,
+     "tag": "a",
+     "text": "Làm lại khảo sát toàn diện →",
+     "top": 2527.375,
+     "width": 184.296875,
+   },
+   Object {
+     "bottom": 2808.21875,
+     "height": 32,
+     "index": 16,
+     "left": 16,
+     "parentSig": "div",
+     "right": 187.484375,
+     "role": null,
+     "tag": "a",
+     "text": "Dear Our Future",
+     "top": 2776.21875,
+     "width": 171.484375,
+   },
+   Object {
+     "bottom": 2951.8125,
+     "height": 36,
+     "index": 17,
+     "left": 16,
+     "parentSig": "div.mt-4.flex",
+     "right": 52,
+     "role": null,
+     "tag": "a",
+     "text": "",
+     "top": 2915.8125,
+     "width": 36,
+   },
+   Object {
+     "bottom": 3044.65625,
+     "height": 19,
+     "index": 18,
+     "left": 16,
+     "parentSig": "li",
+     "right": 99.84375,
+     "role": null,
+     "tag": "a",
+     "text": "Trang chính",
+     "top": 3025.65625,
+     "width": 83.84375,
+   },
+   Object {
+     "bottom": 3078.25,
+     "height": 19,
+     "index": 19,
+     "left": 16,
+     "parentSig": "li",
+     "right": 86.59375,
+     "role": null,
+     "tag": "a",
+     "text": "Tính năng",
+     "top": 3059.25,
+     "width": 70.59375,
+   },
+   Object {
+     "bottom": 3111.84375,
+     "height": 19,
+     "index": 20,
+     "left": 16,
+     "parentSig": "li",
+     "right": 137.859375,
+     "role": null,
+     "tag": "a",
+     "text": "Gói & thanh toán",
+     "top": 3092.84375,
+     "width": 121.859375,
+   },
+   Object {
+     "bottom": 3145.4375,
+     "height": 19,
+     "index": 21,
+     "left": 16,
+     "parentSig": "li",
+     "right": 155,
+     "role": null,
+     "tag": "a",
+     "text": "Hỏi đáp thanh toán",
+     "top": 3126.4375,
+     "width": 139,
+   },
+   Object {
+     "bottom": 3179.03125,
+     "height": 19,
+     "index": 22,
+     "left": 16,
+     "parentSig": "li",
+     "right": 149.875,
+     "role": null,
+     "tag": "a",
+     "text": "Trung tâm trợ giúp",
+     "top": 3160.03125,
+     "width": 133.875,
+   },
+   Object {
+     "bottom": 3275.46875,
+     "height": 19,
+     "index": 23,
+     "left": 16,
+     "parentSig": "li",
+     "right": 153.90625,
+     "role": null,
+     "tag": "a",
+     "text": "Về Dear Our Future",
+     "top": 3256.46875,
+     "width": 137.90625,
+   },
+   Object {
+     "bottom": 3309.0625,
+     "height": 19,
+     "index": 24,
+     "left": 16,
+     "parentSig": "li",
+     "right": 67.828125,
+     "role": null,
+     "tag": "a",
+     "text": "Liên hệ",
+     "top": 3290.0625,
+     "width": 51.828125,
+   },
+   Object {
+     "bottom": 3405.5,
+     "height": 19,
+     "index": 25,
+     "left": 16,
+     "parentSig": "li",
+     "right": 152.78125,
+     "role": null,
+     "tag": "a",
+     "text": "Điều khoản dịch vụ",
+     "top": 3386.5,
+     "width": 136.78125,
+   },
+   Object {
+     "bottom": 3439.09375,
+     "height": 19,
+     "index": 26,
+     "left": 16,
+     "parentSig": "li",
+     "right": 160.78125,
+     "role": null,
+     "tag": "a",
+     "text": "Chính sách bảo mật",
+     "top": 3420.09375,
+     "width": 144.78125,
+   },
+   Object {
+     "bottom": 3472.6875,
+     "height": 19,
+     "index": 27,
+     "left": 16,
+     "parentSig": "li",
+     "right": 166.609375,
+     "role": null,
+     "tag": "a",
+     "text": "Chính sách hoàn tiền",
+     "top": 3453.6875,
+     "width": 150.609375,
+   },
+   Object {
+     "bottom": 1091.21875,
+     "height": 40,
+     "index": 28,
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
+     "index": 29,
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
+     "index": 30,
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
+     "index": 31,
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
          - status: Cân bằng cuộc sống
          - generic:
            - generic:
              - generic:
                - generic:
                  - 'button "Hướng dẫn nhanh: Xem bản đồ cân bằng cuộc sống" [expanded]':
                    - img
                    - text: Cách dùng màn này
                - generic:
                  - generic:
                    - paragraph: Bánh xe cuộc sống
                    - heading "Bức tranh hiện tại của bạn" [level=1]
                    - paragraph: Nhìn 8 lĩnh vực để biết bạn đang mạnh ở đâu, mỏng ở đâu.
                    - generic:
                      - generic: "Cập nhật lần cuối: 15/06/2026 lúc 03:44"
                      - generic: 3 lần ghi nhận
                      - status:
                        - img
                        - text: Đã lưu cục bộ
                  - generic:
                    - generic:
                      - paragraph: Trung bình
                      - paragraph:
                        - generic: 6,5
                        - text: /10
                    - generic:
                      - paragraph: Lĩnh vực mạnh nhất
                      - paragraph:
                        - generic: "8"
                        - text: /10
                      - paragraph: Học tập
                    - generic:
                      - paragraph: Lĩnh vực cần ưu tiên
                      - paragraph:
                        - generic: "5"
                        - text: /10
                      - paragraph: Sức khỏe
                  - generic:
                    - tablist:
                      - tab "Hiện tại" [selected]
                      - tab "Trọng tâm":
                        - img
                        - text: Trọng tâm
                      - tab "Lịch sử"
                    - tabpanel "Hiện tại":
                      - generic:
                        - generic:
                          - generic:
                            - generic:
                              - generic:
                                - heading "Bản đồ Cân bằng cuộc sống" [level=2]
                                - paragraph: Trạng thái hiện tại của 8 khía cạnh cốt lõi
                            - generic:
                              - generic:
                                - img "Biểu đồ radar tổng quan":
                                  - generic:
                                    - generic: Sự nghiệp
                                    - generic: 7/10
                                  - generic:
                                    - generic: Tài chính
                                    - generic: 6/10
                                  - generic:
                                    - generic: Sức khỏe
                                    - generic: 5/10
                                  - generic:
                                    - generic: Học tập
                                    - generic: 8/10
                                  - generic:
                                    - generic: Mối quanhệ
                                    - generic: 7/10
                                  - generic:
                                    - generic: Gia đình
                                    - generic: 8/10
                                  - generic:
                                    - generic: Phát triểnbản thân
                                    - generic: 6/10
                                  - generic:
                                    - generic: Giải trí
                                    - generic: 5/10
                          - generic:
                            - generic:
                              - generic:
                                - img
                              - generic:
                                - heading "Trọng tâm Hành động đề xuất" [level=2]
                                - paragraph: Tìm ra điểm nghẽn cuộc sống
                            - generic:
                              - paragraph:
                                - text: "Khía cạnh cần ưu tiên cải thiện:"
                                - generic: Sức khỏe (5đ)
                              - paragraph: Sức khỏe ở 5/10đ — đây là nền móng của mọi khía cạnh; khi lung lay, hiệu suất và niềm vui đều suy giảm.
                              - generic:
                                - img
                                - paragraph:
                                  - strong: "Hành động đề xuất:"
                                  - text: Đặt 1 mục tiêu siêu nhỏ (ngủ trước 23h hoặc đi bộ 15 phút/ngày) làm tiêu điểm số 1 chu kỳ này.
                        - generic:
                          - generic:
                            - generic:
                              - generic:
                                - text: Check-in Cân bằng
                                - heading "Cập nhật Bánh xe cuộc sống hằng tuần" [level=3]:
                                  - img
                                  - text: Cập nhật Bánh xe cuộc sống hằng tuần
                                - paragraph: Dành 1 phút phản tư nhanh và chấm điểm lại 8 khía cạnh qua 3 chặng tương tác nhẹ để luôn làm chủ nhịp điệu cuộc sống.
                              - button "Bắt đầu Check-in nhanh":
                                - text: Bắt đầu Check-in nhanh
                                - img
                            - generic:
                              - generic:
                                - heading "Điểm số hiện tại của 8 lĩnh vực" [level=3]
                              - generic:
                                - generic:
                                  - generic:
                                    - generic:
                                      - img
                                    - generic: Sự nghiệp
                                  - generic: 7đ
                                - generic:
                                  - generic:
                                    - generic:
                                      - img
                                    - generic: Tài chính
                                  - generic: 6đ
                                - generic:
                                  - generic:
                                    - generic:
                                      - img
                                    - generic: Sức khỏe
                                  - generic: 5đ
                                - generic:
                                  - generic:
                                    - generic:
                                      - img
                                    - generic: Học tập
                                  - generic: 8đ
                                - generic:
                                  - generic:
                                    - generic:
                                      - img
                                    - generic: Mối quan hệ
                                  - generic: 7đ
                                - generic:
                                  - generic:
                                    - generic:
                                      - img
                                    - generic: Gia đình
                                  - generic: 8đ
                                - generic:
                                  - generic:
                                    - generic:
                                      - img
                                    - generic: Phát triển bản thân
                                  - generic: 6đ
                                - generic:
                                  - generic:
                                    - generic:
                                      - img
                                    - generic: Giải trí
                                  - generic: 5đ
                              - generic:
                                - link "Làm lại khảo sát toàn diện →":
                                  - /url: /onboarding
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
      - button "Ẩn lộ trình" [ref=e40] [cursor=pointer]
      - generic [ref=e41]:
        - button "Để sau" [ref=e42] [cursor=pointer]
        - button "Mở Trang chính" [ref=e43] [cursor=pointer]:
          - text: Mở Trang chính
          - img
    - button "Close" [ref=e44] [cursor=pointer]:
      - img
      - generic [ref=e45]: Close
  - dialog "Xem bản đồ cân bằng cuộc sống" [ref=e46]:
    - generic [ref=e47]:
      - generic [ref=e48]:
        - img [ref=e50]
        - generic [ref=e52]:
          - heading "Xem bản đồ cân bằng cuộc sống" [level=2] [ref=e53]
          - paragraph [ref=e54]: Màn này cho bạn thấy chỗ đang ổn và chỗ đang cần thêm năng lượng.
      - list [ref=e55]:
        - listitem [ref=e56]:
          - generic [ref=e57]: "1"
          - generic [ref=e58]:
            - strong [ref=e59]: Nhìn tổng thể
            - text: Đừng nhìn từng điểm lẻ; hãy tìm phần đang hụt rõ nhất.
        - listitem [ref=e60]:
          - generic [ref=e61]: "2"
          - generic [ref=e62]:
            - strong [ref=e63]: Chấm lại nếu cần
            - text: Bạn có thể cập nhật điểm bất cứ lúc nào cuộc sống thay đổi.
        - listitem [ref=e64]:
          - generic [ref=e65]: "3"
          - generic [ref=e66]:
            - strong [ref=e67]: Sang insight
            - text: Bước tiếp theo là chọn một lĩnh vực đáng đầu tư nhất.
      - paragraph [ref=e68]: Điểm thấp không có nghĩa là bạn kém; đó chỉ là nơi cần chăm hơn ở chu kỳ này.
    - generic [ref=e69]:
      - button "Xem insight" [active] [ref=e70] [cursor=pointer]
      - button "Tôi đã hiểu" [ref=e71] [cursor=pointer]:
        - img
        - text: Tôi đã hiểu
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
      |               ^ Error: Found 23 undersized Touch_Target(s) at 414px on LifeBalance:
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