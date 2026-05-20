# QA Report — 12-week-setup-lab

## Commands run
- `npm run typecheck` — PASS
- `npm run build` — PASS
- `npm run test:run -- 12Week` — PASS, 46 files / 514 tests passed; stderr có warning mock bulkSyncPlan trong test nhưng exit code 0.
- `npm run dev -- --host 127.0.0.1` — PASS, served http://127.0.0.1:5173/
- `set VITE_APP_MODE=demo && npm run dev -- --host 127.0.0.1 --port 5174` — PASS, served http://127.0.0.1:5174/

## Viewports tested
- Mobile: 375 x 812
- Tablet: 768 x 1024
- Desktop: 1440 x 900

## Flow tested
- Seeded localStorage using existing keys: `visionboard_user_data`, `selected_focus_area`, `pending_smart_goal`, `pending_feasibility_result`.
- Completed `/12-week-setup-lab` Step 1 → Step 4 with requested sample data.
- Checked Step 4 preview for outcome, lag metric, why, start date/review day, scorecard explanation, 3 recurring actions, Week 1.
- Checked `/12-week-setup` as comparison route.

## Screenshots created
- `step-1-mobile.png`
- `step-2-mobile.png`
- `step-3-mobile.png`
- `step-4-mobile.png`
- `step-4-desktop.png`
- `route-old-12-week-setup.png`
- `debug-current-route.png`

## Bugs found
- Không phát hiện blocker trong phạm vi automation này.

## UX issues found
- Không phát hiện issue nghiêm trọng: không thấy tràn ngang, CTA chính khả dụng, details/collapsible không bung quá nhiều mặc định trong các viewport đã test.

## Console errors
- console.error: Không ghi nhận.
- uncaught exception: Không ghi nhận.
- failed network request: [
  {
    "url": "http://127.0.0.1:5174/@fs/C:/Users/admin/Downloads/Vision%20Board%20Web%20Platform/src/app/utils/feature-entitlements.ts",
    "failure": "net::ERR_ABORTED"
  },
  {
    "url": "http://127.0.0.1:5174/@fs/C:/Users/admin/Downloads/Vision%20Board%20Web%20Platform/src/app/hooks/useUpgradeDialog.ts",
    "failure": "net::ERR_ABORTED"
  },
  {
    "url": "http://127.0.0.1:5174/@fs/C:/Users/admin/Downloads/Vision%20Board%20Web%20Platform/src/app/hooks/usePlanEntitlements.ts",
    "failure": "net::ERR_ABORTED"
  },
  {
    "url": "http://127.0.0.1:5174/@fs/C:/Users/admin/Downloads/Vision%20Board%20Web%20Platform/src/app/components/UpgradePaywallDialog.tsx",
    "failure": "net::ERR_ABORTED"
  },
  {
    "url": "http://127.0.0.1:5174/@fs/C:/Users/admin/Downloads/Vision%20Board%20Web%20Platform/src/features/dashboard/hooks/useDashboardPlanLink.ts",
    "failure": "net::ERR_ABORTED"
  },
  {
    "url": "http://127.0.0.1:5174/@fs/C:/Users/admin/Downloads/Vision%20Board%20Web%20Platform/src/app/utils/twelve-week-system-ui.ts",
    "failure": "net::ERR_ABORTED"
  },
  {
    "url": "http://127.0.0.1:5174/@fs/C:/Users/admin/Downloads/Vision%20Board%20Web%20Platform/src/features/plan12week/hooks/index.ts",
    "failure": "net::ERR_ABORTED"
  },
  {
    "url": "http://127.0.0.1:5174/@fs/C:/Users/admin/Downloads/Vision%20Board%20Web%20Platform/src/app/hooks/usePageTour.ts",
    "failure": "net::ERR_ABORTED"
  },
  {
    "url": "http://127.0.0.1:5174/@fs/C:/Users/admin/Downloads/Vision%20Board%20Web%20Platform/src/features/dashboard/helpers/dashboardSections.ts",
    "failure": "net::ERR_ABORTED"
  },
  {
    "url": "http://127.0.0.1:5174/@fs/C:/Users/admin/Downloads/Vision%20Board%20Web%20Platform/src/app/components/ui/skeleton.tsx",
    "failure": "net::ERR_ABORTED"
  },
  {
    "url": "http://127.0.0.1:5174/@fs/C:/Users/admin/Downloads/Vision%20Board%20Web%20Platform/src/app/utils/text.ts",
    "failure": "net::ERR_ABORTED"
  },
  {
    "url": "http://127.0.0.1:5174/@fs/C:/Users/admin/Downloads/Vision%20Board%20Web%20Platform/src/app/components/SpotlightTour.tsx",
    "failure": "net::ERR_ABORTED"
  },
  {
    "url": "http://127.0.0.1:5174/@fs/C:/Users/admin/Downloads/Vision%20Board%20Web%20Platform/src/app/components/FeedbackDialog.tsx",
    "failure": "net::ERR_ABORTED"
  },
  {
    "url": "http://127.0.0.1:5174/@fs/C:/Users/admin/Downloads/Vision%20Board%20Web%20Platform/src/app/hooks/useBreakpoint.ts",
    "failure": "net::ERR_ABORTED"
  },
  {
    "url": "http://127.0.0.1:5174/@fs/C:/Users/admin/Downloads/Vision%20Board%20Web%20Platform/src/features/dashboard/helpers/dashboardNavigation.ts",
    "failure": "net::ERR_ABORTED"
  },
  {
    "url": "http://127.0.0.1:5174/node_modules/.vite/deps/recharts.js?v=79533b23",
    "failure": "net::ERR_ABORTED"
  }
]
- warnings quan trọng: Không ghi nhận warning ảnh hưởng UX.

## Route cũ có bị ảnh hưởng không
- `/12-week-setup` vẫn vào được, không bị thay bằng lab UI, không thấy badge LAB.
- Không thấy route lab trong navbar/sidebar/bottom nav.

## Go/No-Go recommendation
- GO cho vòng user testing nội bộ/nhỏ. Không thấy blocker qua typecheck/build/test và browser QA local.

## Raw runtime logs
```json
{
  "errors": [],
  "warnings": [],
  "exceptions": [],
  "failedRequests": [
    {
      "url": "http://127.0.0.1:5174/@fs/C:/Users/admin/Downloads/Vision%20Board%20Web%20Platform/src/app/utils/feature-entitlements.ts",
      "failure": "net::ERR_ABORTED"
    },
    {
      "url": "http://127.0.0.1:5174/@fs/C:/Users/admin/Downloads/Vision%20Board%20Web%20Platform/src/app/hooks/useUpgradeDialog.ts",
      "failure": "net::ERR_ABORTED"
    },
    {
      "url": "http://127.0.0.1:5174/@fs/C:/Users/admin/Downloads/Vision%20Board%20Web%20Platform/src/app/hooks/usePlanEntitlements.ts",
      "failure": "net::ERR_ABORTED"
    },
    {
      "url": "http://127.0.0.1:5174/@fs/C:/Users/admin/Downloads/Vision%20Board%20Web%20Platform/src/app/components/UpgradePaywallDialog.tsx",
      "failure": "net::ERR_ABORTED"
    },
    {
      "url": "http://127.0.0.1:5174/@fs/C:/Users/admin/Downloads/Vision%20Board%20Web%20Platform/src/features/dashboard/hooks/useDashboardPlanLink.ts",
      "failure": "net::ERR_ABORTED"
    },
    {
      "url": "http://127.0.0.1:5174/@fs/C:/Users/admin/Downloads/Vision%20Board%20Web%20Platform/src/app/utils/twelve-week-system-ui.ts",
      "failure": "net::ERR_ABORTED"
    },
    {
      "url": "http://127.0.0.1:5174/@fs/C:/Users/admin/Downloads/Vision%20Board%20Web%20Platform/src/features/plan12week/hooks/index.ts",
      "failure": "net::ERR_ABORTED"
    },
    {
      "url": "http://127.0.0.1:5174/@fs/C:/Users/admin/Downloads/Vision%20Board%20Web%20Platform/src/app/hooks/usePageTour.ts",
      "failure": "net::ERR_ABORTED"
    },
    {
      "url": "http://127.0.0.1:5174/@fs/C:/Users/admin/Downloads/Vision%20Board%20Web%20Platform/src/features/dashboard/helpers/dashboardSections.ts",
      "failure": "net::ERR_ABORTED"
    },
    {
      "url": "http://127.0.0.1:5174/@fs/C:/Users/admin/Downloads/Vision%20Board%20Web%20Platform/src/app/components/ui/skeleton.tsx",
      "failure": "net::ERR_ABORTED"
    },
    {
      "url": "http://127.0.0.1:5174/@fs/C:/Users/admin/Downloads/Vision%20Board%20Web%20Platform/src/app/utils/text.ts",
      "failure": "net::ERR_ABORTED"
    },
    {
      "url": "http://127.0.0.1:5174/@fs/C:/Users/admin/Downloads/Vision%20Board%20Web%20Platform/src/app/components/SpotlightTour.tsx",
      "failure": "net::ERR_ABORTED"
    },
    {
      "url": "http://127.0.0.1:5174/@fs/C:/Users/admin/Downloads/Vision%20Board%20Web%20Platform/src/app/components/FeedbackDialog.tsx",
      "failure": "net::ERR_ABORTED"
    },
    {
      "url": "http://127.0.0.1:5174/@fs/C:/Users/admin/Downloads/Vision%20Board%20Web%20Platform/src/app/hooks/useBreakpoint.ts",
      "failure": "net::ERR_ABORTED"
    },
    {
      "url": "http://127.0.0.1:5174/@fs/C:/Users/admin/Downloads/Vision%20Board%20Web%20Platform/src/features/dashboard/helpers/dashboardNavigation.ts",
      "failure": "net::ERR_ABORTED"
    },
    {
      "url": "http://127.0.0.1:5174/node_modules/.vite/deps/recharts.js?v=79533b23",
      "failure": "net::ERR_ABORTED"
    }
  ]
}
```
