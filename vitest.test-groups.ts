export const unitTestPatterns = ["src/**/*.test.ts", "src/**/*.spec.ts"];

export const uiTestPatterns = ["src/**/*.test.tsx", "src/**/*.spec.tsx"];

export const flowTestPatterns = [
  "src/**/*.e2e.test.{ts,tsx}",
  "src/app/pages/**/*flow*.test.{ts,tsx}",
  "src/app/pages/**/*flows*.test.{ts,tsx}",
  "src/features/plan12week/pages/**/*flow*.test.{ts,tsx}",
  "src/features/plan12week/pages/**/*flows*.test.{ts,tsx}",
  "src/features/plan12week/pages/**/*write-safety.test.{ts,tsx}",
  "src/features/plan12week/pages/**/*destructive.test.{ts,tsx}",
];

export const syncTestPatterns = [
  "src/**/*sync*.test.{ts,tsx}",
  "src/**/*Sync*.test.{ts,tsx}",
  "src/**/*roundTrip*.test.{ts,tsx}",
  "src/**/*RoundTrip*.test.{ts,tsx}",
  "src/features/plan12week/persistence/**/*.test.ts",
  "src/app/hooks/useSyncedUserData.test.tsx",
  "src/lib/sync/**/*.test.ts",
  "src/services/syncService.test.ts",
];

export const heavyUiTestPatterns = [
  "src/app/features/assistant/__tests__/AssistantPanel.test.tsx",
  "src/app/pages/VisionBoardEditor.test.tsx",
  "src/app/components/visionBoard/VisionBoardStoryWizard.test.tsx",
];

export const slowTestPatterns = [
  ...uiTestPatterns,
  ...flowTestPatterns,
  ...syncTestPatterns,
  ...heavyUiTestPatterns,
];
