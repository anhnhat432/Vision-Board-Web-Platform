# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ux-ui-upgrade-responsive.spec.ts >> ux-ui-upgrade · responsive · Onboarding (/onboarding) >> viewport 767×900 (mobile) >> layout & touch-target compliance
- Location: e2e\ux-ui-upgrade-responsive.spec.ts:300:9

# Error details

```
Error: Found 2 undersized Touch_Target(s) at 767px on Onboarding:
a "Bỏ qua điều hướng" 142.7×25.6@(-9999,0)
button "Hướng dẫn" 124.9×36.0@(618,44)

expect(received).toEqual(expected) // deep equality

- Expected  -  1
+ Received  + 28

- Array []
+ Array [
+   Object {
+     "bottom": 25.59375,
+     "height": 25.59375,
+     "index": 0,
+     "left": -9999,
+     "parentSig": "div.app-shell.min-h-screen",
+     "right": -9856.28125,
+     "role": null,
+     "tag": "a",
+     "text": "Bỏ qua điều hướng",
+     "top": 0,
+     "width": 142.71875,
+   },
+   Object {
+     "bottom": 79.84375,
+     "height": 36,
+     "index": 1,
+     "left": 618.125,
+     "parentSig": "div.pointer-events-none.sticky",
+     "right": 743,
+     "role": null,
+     "tag": "button",
+     "text": "Hướng dẫn",
+     "top": 43.84375,
+     "width": 124.875,
+   },
+ ]
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e3]:
    - link "Bỏ qua điều hướng" [ref=e4] [cursor=pointer]:
      - /url: "#main-content"
    - note [ref=e5]:
      - img [ref=e6]
      - text: Bản demo · Dữ liệu lưu trên trình duyệt này.
    - main "Nội dung trang" [ref=e8]:
      - button "Mở hướng dẫn sử dụng" [ref=e9] [cursor=pointer]:
        - img
        - generic [ref=e13]: Hướng dẫn
      - generic [ref=e16]:
        - 'button "Hướng dẫn nhanh: Bắt đầu từ bức tranh hiện tại" [expanded] [ref=e18] [cursor=pointer]':
          - img
          - text: Cách dùng màn này
        - generic [ref=e19]:
          - generic [ref=e20]:
            - region "Tiến độ đường chính" [ref=e21]:
              - generic [ref=e22]:
                - paragraph [ref=e23]: Bước 1 / 6 · CÂN BẰNG
                - button "Quay lại Trang chính — tiến độ đã nhập tự lưu trên thiết bị này" [ref=e24] [cursor=pointer]: Thoát →
              - 'progressbar "Tiến độ đường chính: bước 1 trên 6" [ref=e25]'
              - paragraph [ref=e32]: Chấm điểm các lĩnh vực quan trọng để biết nên ưu tiên nơi nào trước.
            - status [ref=e34]:
              - img [ref=e35]
              - text: Đã lưu cục bộ
          - status [ref=e38]:
            - img [ref=e40]
            - generic [ref=e43]:
              - generic [ref=e44]: Cập nhật điểm hiện tại.
              - text: Điểm cũ đã được tải sẵn, bạn chỉ điều chỉnh phần thay đổi, không tạo lại từ đầu.
          - generic [ref=e45]:
            - generic [ref=e46]:
              - generic [ref=e47]:
                - generic [ref=e48]: Bước 1 / 3 · Atlas cuộc sống · 3 phút
                - generic [ref=e49]:
                  - heading "Mở bản đồ cuộc sống 12 tuần của bạn" [level=1] [ref=e50]
                  - paragraph [ref=e51]: Rà 8 lĩnh vực để nhìn ra nơi cần chăm sóc đầu tiên, rồi chuyển thành Life Insight rõ ràng.
              - generic [ref=e52]:
                - generic [ref=e53]:
                  - generic [ref=e54]: "01"
                  - heading "Đánh giá" [level=2] [ref=e55]
                  - paragraph [ref=e56]: Chấm 8 lĩnh vực đủ thật.
                - generic [ref=e57]:
                  - generic [ref=e58]: "02"
                  - heading "Trọng tâm" [level=2] [ref=e59]
                  - paragraph [ref=e60]: Nhìn ra nơi cần chăm sóc trước.
                - generic [ref=e61]:
                  - generic [ref=e62]: "03"
                  - heading "Kế hoạch" [level=2] [ref=e63]
                  - paragraph [ref=e64]: Biến insight thành nhịp 12 tuần.
              - button "Life Insight sẽ được tạo thế nào?" [ref=e66] [cursor=pointer]:
                - generic [ref=e67]: Life Insight sẽ được tạo thế nào?
                - img [ref=e68]
              - generic [ref=e70]:
                - button "Mở bản đồ cuộc sống - Bắt đầu rà 8 lĩnh vực" [ref=e71] [cursor=pointer]:
                  - text: Mở bản đồ cuộc sống
                  - generic [ref=e72]: "- Bắt đầu rà 8 lĩnh vực"
                  - img [ref=e73]
                - button "Tập thở thư giãn" [ref=e75] [cursor=pointer]
                - button "Để sau" [ref=e76] [cursor=pointer]
            - region "Bản đồ cuộc sống 8 vùng" [ref=e77]:
              - generic [ref=e78]:
                - generic [ref=e79]:
                  - generic [ref=e80]:
                    - paragraph [ref=e81]: Atlas gấp mở
                    - heading "Bản đồ cuộc sống của bạn" [level=2] [ref=e82]
                  - generic [ref=e83]: 8 vùng
                - img "Atlas cuộc sống gồm 8 vùng, vùng đã chấm được tô rõ hơn" [ref=e85]:
                  - generic [ref=e117]: LIFE
                  - generic [ref=e118]: "6.5"
                - generic [ref=e123]:
                  - generic [ref=e124]:
                    - strong [ref=e125]: 1. Rà 8 vùng
                    - text: Chọn điểm đủ thật.
                  - generic [ref=e126]:
                    - strong [ref=e127]: 2. Thấy insight
                    - text: Biết nơi nên chăm trước.
                  - generic [ref=e128]:
                    - strong [ref=e129]: 3. Lập kế hoạch
                    - text: Đi tiếp 12 tuần.
      - region "Notifications alt+T"
  - dialog "Bắt đầu từ bức tranh hiện tại" [ref=e131]:
    - generic [ref=e132]:
      - generic [ref=e133]:
        - img [ref=e135]
        - generic [ref=e137]:
          - heading "Bắt đầu từ bức tranh hiện tại" [level=2] [ref=e138]
          - paragraph [ref=e139]: Chọn nhanh điều đang ổn và điều cần chăm để biết bước tiếp theo.
      - list [ref=e140]:
        - listitem [ref=e141]:
          - generic [ref=e142]: "1"
          - generic [ref=e143]:
            - strong [ref=e144]: Chấm nhanh
            - text: Cho điểm thật cho 8 lĩnh vực, chưa cần hoàn hảo.
        - listitem [ref=e145]:
          - generic [ref=e146]: "2"
          - generic [ref=e147]:
            - strong [ref=e148]: Xem điểm lệch
            - text: Nhìn lĩnh vực thấp nhất để biết nơi nên ưu tiên trước.
        - listitem [ref=e149]:
          - generic [ref=e150]: "3"
          - generic [ref=e151]:
            - strong [ref=e152]: Đi tới insight
            - text: App sẽ gợi ý một trọng tâm rõ cho 12 tuần tới.
      - paragraph [ref=e153]: Điểm được lưu tự động, bạn có thể quay lại chỉnh bất cứ lúc nào.
    - generic [ref=e154]:
      - button "Xem insight" [active] [ref=e155] [cursor=pointer]
      - button "Tôi đã hiểu" [ref=e156] [cursor=pointer]:
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
      |               ^ Error: Found 2 undersized Touch_Target(s) at 767px on Onboarding:
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