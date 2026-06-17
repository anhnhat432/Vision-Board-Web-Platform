import { writeFileSync } from "node:fs";

import { expect, test } from "vitest";

import { formatViolations, scanCoreFlowScreens } from "./token-scan";

// STEP core-flow screens only (the 6-step sequence + their components).
const STEP_PATHS = [
  "src/app/pages/Onboarding.tsx",
  "src/app/pages/Onboarding",
  "src/app/pages/LifeBalance.tsx",
  "src/app/pages/LifeInsight.tsx",
  "src/app/pages/LifeInsight",
  "src/app/pages/SMARTGoalSetup.tsx",
  "src/app/pages/SMARTGoalSetup",
  "src/app/pages/AspirationalVision.tsx",
  "src/app/pages/FeasibilityCheck.tsx",
  "src/app/pages/FeasibilityCheck",
  "src/app/pages/12WeekSetup",
  "src/features/plan12week/pages",
  "src/app/pages/GoalTracker.tsx",
  "src/app/pages/ReflectionJournal.tsx",
  "src/app/pages/ReflectionJournal",
];

const NEUTRAL_RE =
  /\b(?:[a-z][a-z-]*-)?(?:slate|gray|zinc|neutral|stone)-(?:50|100|200|300|400|500|600|700|800|900|950)\b/;

test("TEMP: dump neutral-only violations on step screens", () => {
  const report = scanCoreFlowScreens(undefined, STEP_PATHS);
  const neutral = report.violations.filter((v) => v.kind === "primitive-palette" && NEUTRAL_RE.test(v.matched));
  const countByFile: Record<string, number> = {};
  for (const v of neutral) {
    countByFile[v.relativePath] = (countByFile[v.relativePath] ?? 0) + 1;
  }
  const out = [
    `=== NEUTRAL VIOLATIONS (step screens): ${neutral.length} ===`,
    JSON.stringify(countByFile, null, 2),
    "",
    formatViolations(neutral),
  ].join("\n");
  writeFileSync("src/test/ux-ui-upgrade/_scan-report.txt", out, "utf8");
  expect(report.scannedFiles.length).toBeGreaterThan(0);
});
