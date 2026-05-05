# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\visual-qa.spec.ts >> Visual QA - Motion Effects Checklist >> Dashboard - Desktop 1440x900
- Location: e2e\visual-qa.spec.ts:15:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: /Mở trung tâm 12 tuần/i })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('button', { name: /Mở trung tâm 12 tuần/i })

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - link "Bỏ qua điều hướng" [ref=e4] [cursor=pointer]:
    - /url: "#main-content"
  - banner [ref=e5]:
    - generic [ref=e7]:
      - button "Về trang chủ Dear Our Future" [ref=e9] [cursor=pointer]:
        - img [ref=e11]
        - heading "Dear Our Future" [level=1] [ref=e14]
      - navigation [ref=e15]:
        - button "Trang chính" [ref=e17] [cursor=pointer]:
          - img
          - generic [ref=e18]: Trang chính
      - generic [ref=e19]:
        - button "Đăng nhập" [ref=e20] [cursor=pointer]
        - button "Đăng ký" [ref=e21] [cursor=pointer]
        - button "Chuyển sang chế độ tối" [ref=e22] [cursor=pointer]:
          - img [ref=e23]
        - button "Hướng dẫn" [ref=e25] [cursor=pointer]:
          - img
          - text: Hướng dẫn
  - main "Nội dung trang" [ref=e26]:
    - status [ref=e27]: Bảng điều khiển
    - generic [ref=e29]:
      - generic [ref=e32]:
        - generic [ref=e33]:
          - generic [ref=e34]:
            - img [ref=e35]
            - text: Trang chính
          - generic [ref=e37]:
            - heading "Biến tầm nhìn thành mục tiêu rõ ràng và kế hoạch 12 tuần có thể làm mỗi ngày." [level=1] [ref=e38]
            - paragraph [ref=e39]: Dùng được ngay, không cần đăng nhập. Chấm cân bằng cuộc sống, chốt mục tiêu SMART, kiểm tra khả thi rồi vào kế hoạch 12 tuần có việc cho từng ngày.
          - generic [ref=e40]:
            - button "Đăng ký miễn phí để lưu" [ref=e41] [cursor=pointer]:
              - img
              - text: Đăng ký miễn phí để lưu
            - button "Tôi đã có tài khoản" [ref=e42] [cursor=pointer]:
              - img
              - text: Tôi đã có tài khoản
        - generic [ref=e43]:
          - paragraph [ref=e44]: Luồng nên đi
          - generic [ref=e45]:
            - generic [ref=e46]:
              - generic [ref=e47]: "1"
              - generic [ref=e48]: Đánh giá cân bằng cuộc sống
              - img [ref=e49]
            - generic [ref=e51]:
              - generic [ref=e52]: "2"
              - generic [ref=e53]: Chọn insight và mục tiêu SMART
              - img [ref=e54]
            - generic [ref=e56]:
              - generic [ref=e57]: "3"
              - generic [ref=e58]: Chạy kế hoạch 12 tuần rồi review
              - img [ref=e59]
      - button "Góp ý demo" [ref=e63] [cursor=pointer]:
        - img
        - text: Góp ý demo
  - region "Notifications alt+T"
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import * as path from 'path';
  3   | import * as fs from 'fs';
  4   | 
  5   | const screenshotDir = path.join(process.cwd(), 'e2e', 'screenshots');
  6   | if (!fs.existsSync(screenshotDir)) {
  7   |   fs.mkdirSync(screenshotDir, { recursive: true });
  8   | }
  9   | 
  10  | test.describe('Visual QA - Motion Effects Checklist', () => {
  11  |   test.beforeEach(async ({ page }) => {
  12  |     await page.goto('http://localhost:5173');
  13  |   });
  14  | 
  15  |   test('Dashboard - Desktop 1440x900', async ({ page }) => {
  16  |     await page.setViewportSize({ width: 1440, height: 900 });
  17  |     await page.goto('http://localhost:5173/');
  18  |     await page.waitForLoadState('networkidle');
  19  |     await page.screenshot({ path: path.join(screenshotDir, 'qa-dashboard-desktop.png'), fullPage: true });
  20  | 
  21  |     const ctaButton = page.getByRole('button', { name: /Mở trung tâm 12 tuần/i });
> 22  |     await expect(ctaButton).toBeVisible();
      |                             ^ Error: expect(locator).toBeVisible() failed
  23  |   });
  24  | 
  25  |   test('Dashboard - Mobile 390x844', async ({ page }) => {
  26  |     await page.setViewportSize({ width: 390, height: 844 });
  27  |     await page.goto('http://localhost:5173/');
  28  |     await page.waitForLoadState('networkidle');
  29  |     await page.screenshot({ path: path.join(screenshotDir, 'qa-dashboard-mobile.png'), fullPage: true });
  30  |   });
  31  | 
  32  |   test('SMARTGoalSetup - Desktop', async ({ page }) => {
  33  |     await page.setViewportSize({ width: 1440, height: 900 });
  34  |     await page.goto('http://localhost:5173/smart-goal-setup');
  35  |     await page.waitForLoadState('networkidle');
  36  |     await page.screenshot({ path: path.join(screenshotDir, 'qa-smart-goal-desktop.png'), fullPage: true });
  37  |   });
  38  | 
  39  |   test('SMARTGoalSetup - Mobile', async ({ page }) => {
  40  |     await page.setViewportSize({ width: 390, height: 844 });
  41  |     await page.goto('http://localhost:5173/smart-goal-setup');
  42  |     await page.waitForLoadState('networkidle');
  43  |     await page.screenshot({ path: path.join(screenshotDir, 'qa-smart-goal-mobile.png'), fullPage: true });
  44  |   });
  45  | 
  46  |   test('Feasibility Result - Desktop', async ({ page }) => {
  47  |     await page.setViewportSize({ width: 1440, height: 900 });
  48  |     await page.goto('http://localhost:5173/feasibility');
  49  |     await page.waitForLoadState('networkidle');
  50  |     await page.screenshot({ path: path.join(screenshotDir, 'qa-feasibility-desktop.png'), fullPage: true });
  51  |   });
  52  | 
  53  |   test('12WeekSetup - Desktop', async ({ page }) => {
  54  |     await page.setViewportSize({ width: 1440, height: 900 });
  55  |     await page.goto('http://localhost:5173/12-week-setup');
  56  |     await page.waitForLoadState('networkidle');
  57  |     await page.screenshot({ path: path.join(screenshotDir, 'qa-12week-setup-desktop.png'), fullPage: true });
  58  |   });
  59  | 
  60  |   test('12WeekSystem Today Tab - Desktop', async ({ page }) => {
  61  |     await page.setViewportSize({ width: 1440, height: 900 });
  62  |     await page.goto('http://localhost:5173/12-week-system');
  63  |     await page.waitForLoadState('networkidle');
  64  |     const todayTab = page.getByRole('tab', { name: /Hôm nay/i });
  65  |     if (await todayTab.isVisible()) {
  66  |       await todayTab.click();
  67  |       await page.waitForTimeout(500);
  68  |     }
  69  |     await page.screenshot({ path: path.join(screenshotDir, 'qa-today-tab-desktop.png'), fullPage: true });
  70  |   });
  71  | 
  72  |   test('12WeekSystem Today Tab - Mobile', async ({ page }) => {
  73  |     await page.setViewportSize({ width: 390, height: 844 });
  74  |     await page.goto('http://localhost:5173/12-week-system');
  75  |     await page.waitForLoadState('networkidle');
  76  |     const todayTab = page.getByRole('tab', { name: /Hôm nay/i });
  77  |     if (await todayTab.isVisible()) {
  78  |       await todayTab.click();
  79  |       await page.waitForTimeout(500);
  80  |     }
  81  |     await page.screenshot({ path: path.join(screenshotDir, 'qa-today-tab-mobile.png'), fullPage: true });
  82  |   });
  83  | 
  84  |   test('12WeekSystem Week Tab - Desktop', async ({ page }) => {
  85  |     await page.setViewportSize({ width: 1440, height: 900 });
  86  |     await page.goto('http://localhost:5173/12-week-system');
  87  |     await page.waitForLoadState('networkidle');
  88  |     const weekTab = page.getByRole('tab', { name: /Tuần/i });
  89  |     if (await weekTab.isVisible()) {
  90  |       await weekTab.click();
  91  |       await page.waitForTimeout(500);
  92  |     }
  93  |     await page.screenshot({ path: path.join(screenshotDir, 'qa-week-tab-desktop.png'), fullPage: true });
  94  |   });
  95  | 
  96  |   test('12WeekSystem Progress Tab - Desktop', async ({ page }) => {
  97  |     await page.setViewportSize({ width: 1440, height: 900 });
  98  |     await page.goto('http://localhost:5173/12-week-system');
  99  |     await page.waitForLoadState('networkidle');
  100 |     const progressTab = page.getByRole('tab', { name: /Tiến độ/i });
  101 |     if (await progressTab.isVisible()) {
  102 |       await progressTab.click();
  103 |       await page.waitForTimeout(500);
  104 |     }
  105 |     await page.screenshot({ path: path.join(screenshotDir, 'qa-progress-tab-desktop.png'), fullPage: true });
  106 |   });
  107 | 
  108 |   test('12WeekSystem Settings Tab - Desktop', async ({ page }) => {
  109 |     await page.setViewportSize({ width: 1440, height: 900 });
  110 |     await page.goto('http://localhost:5173/12-week-system');
  111 |     await page.waitForLoadState('networkidle');
  112 |     const settingsTab = page.getByRole('tab', { name: /Cài đặt/i });
  113 |     if (await settingsTab.isVisible()) {
  114 |       await settingsTab.click();
  115 |       await page.waitForTimeout(500);
  116 |     }
  117 |     await page.screenshot({ path: path.join(screenshotDir, 'qa-settings-tab-desktop.png'), fullPage: true });
  118 |   });
  119 | 
  120 |   test('Reduced Motion - Dashboard', async ({ page }) => {
  121 |     await page.setViewportSize({ width: 1440, height: 900 });
  122 |     await page.emulateMedia({ reducedMotion: 'reduce' });
```