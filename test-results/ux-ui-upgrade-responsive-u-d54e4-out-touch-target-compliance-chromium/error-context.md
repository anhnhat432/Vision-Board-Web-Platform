# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ux-ui-upgrade-responsive.spec.ts >> ux-ui-upgrade · responsive · Dashboard (/) >> viewport 320×800 (sub-360) >> layout & touch-target compliance
- Location: e2e\ux-ui-upgrade-responsive.spec.ts:300:9

# Error details

```
Error: Sub-360 layout must keep ≥360px content width (got scrollWidth 320)

expect(received).toBeGreaterThanOrEqual(expected)

Expected: >= 360
Received:    320
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
  246 |   minGap = MIN_ADJACENT_GAP_PX,
  247 | ): AdjacencyViolation[] {
  248 |   const grouped = new Map<string, TouchTargetRect[]>();
  249 |   for (const t of targets) {
  250 |     const arr = grouped.get(t.parentSig) ?? [];
  251 |     arr.push(t);
  252 |     grouped.set(t.parentSig, arr);
  253 |   }
  254 | 
  255 |   const violations: AdjacencyViolation[] = [];
  256 |   for (const siblings of grouped.values()) {
  257 |     for (let i = 0; i < siblings.length; i++) {
  258 |       for (let j = i + 1; j < siblings.length; j++) {
  259 |         const a = siblings[i];
  260 |         const b = siblings[j];
  261 | 
  262 |         const horizontalOverlap = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  263 |         const verticalOverlap = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  264 | 
  265 |         if (verticalOverlap > 0 && horizontalOverlap <= 0) {
  266 |           // Side-by-side on a row. Edge-to-edge horizontal distance.
  267 |           const gap = Math.max(a.left, b.left) - Math.min(a.right, b.right);
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
> 346 |             ).toBeGreaterThanOrEqual(MIN_LAYOUT_BREAKPOINT_PX);
      |               ^ Error: Sub-360 layout must keep ≥360px content width (got scrollWidth 320)
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
  368 |             ).toEqual([]);
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