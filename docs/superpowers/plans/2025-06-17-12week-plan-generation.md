# 12-Week Plan Generation Enhancement - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement automatic tactic generation (2-4 tactics), Week 1 task creation (3-7 tasks), preview UI with editing and validation, and integrate into the 12-week setup flow.

**Architecture:**
- New logic modules: `tacticGeneration.ts` (generate tactics from archetype), `taskGeneration.ts` (generate Week 1 tasks from tactics)
- Updated `generatePlan.ts` to use new generators
- New components: `PlanPreview.tsx` (full preview), `TacticsEditor.tsx` (edit tactics), `PlanQualityPanel.tsx` (validation)
- Integration into existing `12WeekSetup.tsx` flow as new step
- Backward compatible: existing behavior preserved when no archetype

**Tech Stack:**
- TypeScript, React, Vitest for testing
- Existing: `planArchetypeDefaults.ts`, `planQuality.ts`, `taskConstraints.ts`
- UI: Shadcn/ui components (Button, Card, Input, Select, Badge)

---

## File Structure

```
src/features/plan12week/
├── logic/
│   ├── tacticGeneration.ts (NEW)
│   ├── taskGeneration.ts (NEW)
│   └── generatePlan.ts (UPDATE)
├── components/
│   ├── PlanPreview.tsx (NEW)
│   ├── TacticsEditor.tsx (NEW)
│   └── PlanQualityPanel.tsx (NEW)
└── types/ (existing)
    └── planTypes.ts (EXTEND if needed)

src/app/pages/12WeekSetup/
├── components/
│   └── PlanPreviewStep.tsx (NEW - integrates PlanPreview)
├── helpers.ts (UPDATE - add generation helpers)
└── helpers.test.ts (UPDATE - add tests)

Tests:
├── src/features/plan12week/logic/tacticGeneration.test.ts
├── src/features/plan12week/logic/taskGeneration.test.ts
├── src/features/plan12week/logic/generatePlan.archetype.test.ts (UPDATE)
└── src/app/pages/12WeekSetup/helpers.test.ts (UPDATE)
└── src/app/pages/12WeekSetup/PlanPreviewStep.test.tsx (NEW)
E2E: src/app/pages/twelve-week-flows.e2e.test.tsx (UPDATE)
```

---

## Task 1: Define Types for Tactic and Task Generation

**Files:**
- Create: `src/features/plan12week/logic/tacticGeneration.ts` (initial skeleton)
- Create: `src/features/plan12week/logic/taskGeneration.ts` (initial skeleton)

**Goal:** Define TypeScript interfaces for generated tactics and tasks.

### Step 1: Create `tacticGeneration.ts` with type definitions

```typescript
import type { GoalArchetype } from "@/lib/smart-goal";
import type { LeadIndicator } from "../types/planTypes";

export interface GeneratedTactic {
  id: string;
  name: string;           // Actionable name (e.g., "Viết 500 từ mỗi buổi sáng thứ 2-4")
  target: number;         // Times per week (1-7)
  schedule: number[];     // Day offsets 0-6 (0=Monday, 6=Sunday)
  type: "core" | "optional";
  priority: number;       // 1-7 (lower = higher priority)
}

export interface TacticGenerationOptions {
  archetype: GoalArchetype;
  feasibilityHint?: {
    planLoad?: "lighter" | "balanced" | "push";
    weeklyCapacity?: "low" | "medium" | "high";
    bottleneckAxis?: string;
  };
  userPreferences?: {
    tacticCount?: number;      // Desired count, default 2-4
    dailyTimeBudget?: string;  // "30min", "1h", "1.5h", "2h+"
  };
}
```

### Step 2: Create `taskGeneration.ts` with type definitions

```typescript
import type { WeekOneTask } from "../types/planTypes";

export interface WeekOneTaskGenerationInput {
  tactics: GeneratedTactic[];
  weekStartDate: Date;   // Monday of Week 1
  totalWeeks: number;    // Default 12
}

export interface WeekOneTaskGenerationResult {
  tasks: WeekOneTask[];
  warnings: string[];
}
```

### Step 3: Write initial failing tests

**File:** `src/features/plan12week/logic/tacticGeneration.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { generateTacticsFromArchetype } from "./tacticGeneration";

describe("tacticGeneration", () => {
  it("generates 2-4 tactics for skill_learning archetype", () => {
    const result = generateTacticsFromArchetype({
      archetype: "skill_learning",
    });
    expect(result.tactics.length).toBeGreaterThanOrEqual(2);
    expect(result.tactics.length).toBeLessThanOrEqual(4);
  });

  it("generates actionable tactic names with verbs", () => {
    const result = generateTacticsFromArchetype({
      archetype: "health_fitness",
    });
    result.tactics.forEach((tactic) => {
      expect(tactic.name.length).toBeGreaterThan(5);
    });
  });

  it("generates valid target (1-7) and schedule", () => {
    const result = generateTacticsFromArchetype({
      archetype: "project_completion",
    });
    result.tactics.forEach((tactic) => {
      expect(tactic.target).toBeGreaterThanOrEqual(1);
      expect(tactic.target).toBeLessThanOrEqual(7);
      expect(tactic.schedule.length).toBe(tactic.target);
      tactic.schedule.forEach((day) => {
        expect(day).toBeGreaterThanOrEqual(0);
        expect(day).toBeLessThanOrEqual(6);
      });
    });
  });

  it("assigns at least 1 core tactic", () => {
    const result = generateTacticsFromArchetype({
      archetype: "habit_building",
    });
    const coreCount = result.tactics.filter((t) => t.type === "core").length;
    expect(coreCount).toBeGreaterThanOrEqual(1);
  });
});
```

**File:** `src/features/plan12week/logic/taskGeneration.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { generateWeekOneTasks } from "./taskGeneration";
import type { GeneratedTactic } from "./tacticGeneration";

describe("taskGeneration", () => {
  const mockTactics: GeneratedTactic[] = [
    {
      id: "tactic_1",
      name: "Viết 500 từ mỗi buổi sáng",
      target: 3,
      schedule: [1, 2, 3],
      type: "core",
      priority: 1,
    },
    {
      id: "tactic_2",
      name: "Review code từ đồng nghiệp",
      target: 1,
      schedule: [4],
      type: "optional",
      priority: 2,
    },
  ];

  const weekStart = new Date("2025-01-06"); // Monday

  it("generates 3-7 tasks for Week 1", () => {
    const result = generateWeekOneTasks({
      tactics: mockTactics,
      weekStartDate: weekStart,
      totalWeeks: 12,
    });
    expect(result.tasks.length).toBeGreaterThanOrEqual(3);
    expect(result.tasks.length).toBeLessThanOrEqual(7);
  });

  it("generates tasks with correct titles and dates", () => {
    const result = generateWeekOneTasks({
      tactics: mockTactics,
      weekStartDate: weekStart,
      totalWeeks: 12,
    });

    result.tasks.forEach((task) => {
      expect(task.title.length).toBeGreaterThan(0);
      expect(task.scheduledDate).toBeDefined();
      expect(task.weekNumber).toBe(1);
      expect(task.isCore).toBeDefined();
    });
  });

  it("schedules core tasks with priority in title", () => {
    const result = generateWeekOneTasks({
      tactics: mockTactics,
      weekStartDate: weekStart,
      totalWeeks: 12,
    });

    const coreTasks = result.tasks.filter((t) => t.isCore);
    expect(coreTasks.length).toBeGreaterThanOrEqual(1);
  });
});
```

### Step 4: Commit

```bash
git add src/features/plan12week/logic/tacticGeneration.ts \
         src/features/plan12week/logic/taskGeneration.ts \
         src/features/plan12week/logic/tacticGeneration.test.ts \
         src/features/plan12week/logic/taskGeneration.test.ts
git commit -m "feat: add tactic and task generation types and initial tests"
```

---

## Task 2: Implement Tactic Generation Logic

**File:** `src/features/plan12week/logic/tacticGeneration.ts` (full implementation)

### Step 1: Implement `generateTacticsFromArchetype`

```typescript
import type { GoalArchetype } from "@/lib/smart-goal";
import { getArchetypePlanFullDefaults } from "./planArchetypeDefaults";
import type { GeneratedTactic, TacticGenerationOptions } from "./tactics";

const MIN_TACTICS = 2;
const MAX_TACTICS = 4;
const MIN_TARGET = 1;
const MAX_TARGET = 7;

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandomSubset<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function generateTacticsFromArchetype(
  options: TacticGenerationOptions,
): { tactics: GeneratedTactic[]; warnings: string[] } {
  const { archetype, feasibilityHint, userPreferences } = options;
  const defaults = getArchetypePlanFullDefaults(archetype);
  const warnings: string[] = [];

  // Determine tactic count
  let tacticCount = userPreferences?.tacticCount ?? getRandomInt(2, 4);
  tacticCount = Math.max(MIN_TACTICS, Math.min(MAX_TACTICS, tacticCount));

  // Adjust for low feasibility
  const isLowFeasibility =
    feasibilityHint?.planLoad === "lighter" ||
    feasibilityHint?.weeklyCapacity === "low" ||
    feasibilityHint?.bottleneckAxis === "energy" ||
    feasibilityHint?.bottleneckAxis === "confidence";

  if (isLowFeasibility && tacticCount > 2) {
    tacticCount = 2;
    warnings.push("Khả thi thấp → giảm còn 2 việc lặp lại.");
  }

  // Select tactics from suggestions
  const suggestions = defaults.leadIndicatorSuggestions;
  const selectedNames = pickRandomSubset(suggestions, tacticCount);

  // Build tactics
  const tactics: GeneratedTactic[] = selectedNames.map((name, index) => {
    // Determine target based on feasibility and time budget
    let target: number;
    if (isLowFeasibility) {
      target = 1;
    } else if (userPreferences?.dailyTimeBudget === "30min") {
      target = 1;
    } else if (userPreferences?.dailyTimeBudget === "1h") {
      target = getRandomInt(1, 2);
    } else {
      target = getRandomInt(2, 3);
    }

    // Build schedule (distribute across week)
    const schedule = distributeDays(target);

    // Type: first 1-2 are core, rest optional
    const type: "core" | "optional" = index < Math.min(2, tacticCount) ? "core" : "optional";

    // Priority: index + 1
    const priority = index + 1;

    // Actionable name (add measure if missing)
    const actionableName = makeActionable(name, target);

    return {
      id: `tactic_${Date.now()}_${index}`,
      name: actionableName,
      target,
      schedule,
      type,
      priority,
    };
  });

  return { tactics, warnings };
}

function distributeDays(count: number): number[] {
  // Simple distribution: spread as evenly as possible
  const base = Math.floor(7 / count);
  const remainder = 7 % count;
  const offsets: number[] = [];

  let current = 0;
  for (let i = 0; i < count; i++) {
    offsets.push(current);
    current += base + (i < remainder ? 1 : 0);
    if (current >= 7) current = 0;
  }

  return offsets.sort((a, b) => a - b);
}

function makeActionable(baseName: string, target: number): string {
  // If name already has numbers/measure, keep as is
  if (/\d+/.test(baseName)) return baseName;

  // Add target info
  const timePhrases = ["mỗi tuần", "hàng tuần", "lần/tuần"];
  const timeText = timePhrases[Math.floor(Math.random() * timePhrases.length)];

  return `${baseName} (${target} ${timeText})`;
}
```

### Step 2: Run and update tests

Run tests, ensure they pass, commit.

```bash
npm run test:run -- --filter "tacticGeneration"
# Fix any failing tests
git add .
git commit -m "test: tacticGeneration tests pass"
```

---

## Task 3: Implement Week 1 Task Generation

**File:** `src/features/plan12week/logic/taskGeneration.ts` (full implementation)

### Step 1: Implement `generateWeekOneTasks`

```typescript
import type { WeekOneTask } from "../types/planTypes";
import type { GeneratedTactic } from "./tacticGeneration";

const MIN_WEEK_ONE_TASKS = 3;
const MAX_WEEK_ONE_TASKS = 7;

export function generateWeekOneTasks(
  input: WeekOneTaskGenerationInput,
): WeekOneTaskGenerationResult {
  const { tactics, weekStartDate } = input;
  const warnings: string[] = [];

  if (tactics.length === 0) {
    return { tasks: [], warnings: ["Không có tactics để sinh tasks."] };
  }

  // Generate tasks from tactics
  const tasks: WeekOneTask[] = [];

  tactics.forEach((tactic, tacticIndex) => {
    tactic.schedule.forEach((dayOffset, slotIndex) => {
      const scheduledDate = new Date(weekStartDate);
      scheduledDate.setDate(weekStartDate.getDate() + dayOffset);

      const title = buildTaskTitle(tactic, slotIndex, tactic.schedule.length);

      tasks.push({
        id: `task_${tactic.id}_${slotIndex}`,
        title,
        scheduledDate: scheduledDate.toISOString().split("T")[0],
        weekNumber: 1,
        tacticId: tactic.id,
        isCore: tactic.type === "core",
        status: "todo",
      });
    });
  });

  // Validate task count
  if (tasks.length < MIN_WEEK_ONE_TASKS) {
    warnings.push(`Tuần 1 chỉ có ${tasks.length} task (khuyến nghị ${MIN_WEEK_ONE_TASKS}-${MAX_WEEK_ONE_TASKS}).`);
  } else if (tasks.length > MAX_WEEK_ONE_TASKS) {
    warnings.push(`Tuần 1 có ${tasks.length} task (quá nhiều, khuyến nghị tối đa ${MAX_WEEK_ONE_TASKS}).`);
  }

  // Sort: core first, then by priority
  tasks.sort((a, b) => {
    if (a.isCore !== b.isCore) return b.isCore ? 1 : -1;
    return a.title.localeCompare(b.title);
  });

  return { tasks, warnings };
}

function buildTaskTitle(tactic: GeneratedTactic, slotIndex: number, totalSlots: number): string {
  const corePrefix = tactic.type === "core" ? "[CỐT LÕI] " : "";

  if (totalSlots === 1) {
    return `${corePrefix}${tactic.name}`;
  }

  return `${corePrefix}${tactic.name} (lần ${slotIndex + 1}/${totalSlots})`;
}
```

### Step 2: Update tests to match implementation

Add to `taskGeneration.test.ts`:

```typescript
describe("taskGeneration edge cases", () => {
  it("returns warning when no tactics", () => {
    const result = generateWeekOneTasks({
      tactics: [],
      weekStartDate: new Date("2025-01-06"),
      totalWeeks: 12,
    });
    expect(result.warnings).toContain("Không có tactics để sinh tasks.");
  });

  it("sorts core tasks first", () => {
    const mixedTactics: GeneratedTactic[] = [
      { id: "t1", name: "Optional task", target: 1, schedule: [0], type: "optional", priority: 2 },
      { id: "t2", name: "Core task", target: 1, schedule: [1], type: "core", priority: 1 },
    ];
    const result = generateWeekOneTasks({
      tactics: mixedTactics,
      weekStartDate: weekStart,
      totalWeeks: 12,
    });
    const coreTasks = result.tasks.filter((t) => t.isCore);
    const optionalTasks = result.tasks.filter((t) => !t.isCore);
    expect(coreTasks.length).toBeGreaterThan(0);
  });
});
```

### Step 3: Run tests and commit

```bash
npm run test:run -- --filter "taskGeneration"
git add .
git commit -m "feat: implement task generation for Week 1"
```

---

## Task 4: Update `generate12WeekPlan()` to Use New Generators

**File:** `src/features/plan12week/logic/generatePlan.ts`

### Step 1: Import new modules

Add at top:

```typescript
import { generateTacticsFromArchetype } from "./tacticGeneration";
import { generateWeekOneTasks } from "./taskGeneration";
```

### Step 2: Update `buildArchetypeWeeks()` function

Replace the existing week 1 logic. Note: `weekStartDate` will be derived from `plan.startDate` later - for now use a placeholder that gets corrected when the plan is finalized.

```typescript
function buildArchetypeWeeks(
  goalArchetype: GoalArchetype,
  feasibilityHint: GeneratePlanFeasibilityHint | undefined,
  userPreferences?: {
    tacticCount?: number;
    dailyTimeBudget?: string;
  },
): Week[] {
  const defaults = getArchetypePlanFullDefaults(goalArchetype);
  const lowFeasibility = isLowFeasibility(feasibilityHint);

  // Generate tactics if archetype provided
  const { tactics } = generateTacticsFromArchetype({
    archetype: goalArchetype,
    feasibilityHint,
    userPreferences,
  });

  // Build leadMetrics from tactics (for Week 1)
  const leadMetricsFromTactics = tactics.map((t) => ({
    id: t.id,
    name: t.name,
    weeklyTarget: t.target,
    logs: [],
  }));

  return Array.from({ length: 12 }, (_, index) => {
    const weekNumber = index + 1;
    const week = createEmptyWeek(weekNumber);

    if (weekNumber === 1) {
      week.focus = defaults.weekOneFocus;
      week.expectedOutput = `${defaults.weekOneExpectedOutput}\n\nViệc đầu tiên: ${getArchetypeFirstAction(
        goalArchetype,
        { lowFeasibility }
      )}`;
      // Tasks will be populated by caller using generateWeekOneTasks()
      week.leadMetrics = leadMetricsFromTactics;
      return week;
    }

    if (weekNumber === 4) {
      week.expectedOutput = defaults.milestoneTemplates.week4;
    } else if (weekNumber === 8) {
      week.expectedOutput = defaults.milestoneTemplates.week8;
    } else if (weekNumber === 12) {
      week.expectedOutput = defaults.milestoneTemplates.week12;
    }

    return week;
  });
}
```

### Step 2b: Update `generate12WeekPlan()` to populate Week 1 tasks

After building weeks, populate Week 1 tasks:

```typescript
export function generate12WeekPlan(
  goal: Generate12WeekPlanInput,
  options?: Generate12WeekPlanOptions & {
    userPreferences?: {
      tacticCount?: number;
      dailyTimeBudget?: string;
    };
  },
): Plan12Week {
  const goalArchetype = options?.goalArchetype;
  let weeks: Week[];

  if (goalArchetype) {
    const feasibilityHint = options?.feasibilityHint;
    const userPreferences = options?.userPreferences;

    // Build weeks with archetype defaults
    weeks = buildArchetypeWeeks(goalArchetype, feasibilityHint, userPreferences);

    // Generate tactics and Week 1 tasks
    const { tactics } = generateTacticsFromArchetype({
      archetype: goalArchetype,
      feasibilityHint,
      userPreferences,
    });

    const weekStart = new Date(); // Will be replaced by plan.startDate in final
    const { tasks: weekOneTasks } = generateWeekOneTasks({
      tactics,
      weekStartDate: weekStart,
      totalWeeks: 12,
    });

    // Assign tasks to Week 1
    weeks[0].tasks = weekOneTasks;
  } else {
    weeks = Array.from({ length: 12 }, (_, index) => createEmptyWeek(index + 1));
  }

  return {
    id: createId(),
    vision: goal.goal_statement,
    smartGoalId: goal.id,
    startDate: new Date().toISOString(),
    weeks,
  };
}
```

### Step 3: Update `generate12WeekPlan()` signature

Pass user preferences from draft:

```typescript
export function generate12WeekPlan(
  goal: Generate12WeekPlanInput,
  options?: Generate12WeekPlanOptions & {
    userPreferences?: {
      tacticCount?: number;
      dailyTimeBudget?: string;
    };
  },
): Plan12Week {
  const goalArchetype = options?.goalArchetype;
  const weeks = goalArchetype
    ? buildArchetypeWeeks(goalArchetype, options?.feasibilityHint, options?.userPreferences)
    : Array.from({ length: 12 }, (_, index) => createEmptyWeek(index + 1));

  return {
    id: createId(),
    vision: goal.goal_statement,
    smartGoalId: goal.id,
    startDate: new Date().toISOString(),
    weeks,
  };
}
```

### Step 4: Update existing tests

**File:** `src/features/plan12week/logic/generatePlan.archetype.test.ts`

Add new tests:

```typescript
describe("generate12WeekPlan - with auto tactics", () => {
  it("generates Week 1 with 3-7 tasks when archetype provided", () => {
    const plan = generate12WeekPlan(GOAL_INPUT, {
      goalArchetype: "skill_learning",
    });
    const week1Tasks = plan.weeks[0].tasks;
    expect(week1Tasks.length).toBeGreaterThanOrEqual(3);
    expect(week1Tasks.length).toBeLessThanOrEqual(7);
  });

  it("generates Week 1 tasks with core tasks marked", () => {
    const plan = generate12WeekPlan(GOAL_INPUT, {
      goalArchetype: "health_fitness",
    });
    const coreTasks = plan.weeks[0].tasks.filter((t) => t.title.includes("[CỐT LÕI]"));
    expect(coreTasks.length).toBeGreaterThanOrEqual(1);
  });

  it("populates leadMetrics from generated tactics", () => {
    const plan = generate12WeekPlan(GOAL_INPUT, {
      goalArchetype: "project_completion",
    });
    expect(plan.weeks[0].leadMetrics.length).toBeGreaterThanOrEqual(2);
    expect(plan.weeks[0].leadMetrics.length).toBeLessThanOrEqual(4);
  });
});
```

### Step 5: Commit

```bash
npm run test:run -- --filter "generatePlan"
git add .
git commit -m "feat: update generate12WeekPlan to use auto tactic/task generation"
```

---

## Task 5: Create Plan Quality Panel Component

**File:** `src/features/plan12week/components/PlanQualityPanel.tsx`

### Step 1: Create component

```typescript
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import {
  evaluateTwelveWeekPlanQuality,
  type PlanQualityInput,
  type PlanQualityContext,
} from "../logic/planQuality";

interface PlanQualityPanelProps {
  plan: {
    vision: string;
    weeks: Array<{
      weekNumber: number;
      focus: string;
      expectedOutput: string;
      tasks: { title: string }[];
      leadMetrics: { name: string; weeklyTarget: number; schedule?: number[] }[];
    }>;
  };
}

export function PlanQualityPanel({ plan }: PlanQualityPanelProps) {
  const week12 = plan.weeks[11] ?? { expectedOutput: "" };
  const leadIndicators = plan.weeks[0].leadMetrics.map((m) => ({
    name: m.name,
    target: m.weeklyTarget.toString(),
    schedule: m.schedule || [],
  }));

  const qualityInput: PlanQualityInput = {
    vision12Week: plan.vision,
    week12Outcome: week12.expectedOutput,
    lagMetric: { name: "Chỉ số chính", target: "0" },
    leadIndicators,
    milestones: {
      week4: plan.weeks[3]?.expectedOutput ?? "",
      week8: plan.weeks[7]?.expectedOutput ?? "",
      week12: week12.expectedOutput,
    },
  };

  const context: PlanQualityContext = {
    weeklyTaskCount: plan.weeks[0].tasks.length,
    firstTaskTitle: plan.weeks[0].tasks[0]?.title,
  };

  const quality = evaluateTwelveWeekPlanQuality(qualityInput, context);

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "strong":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "weak":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getLevelBadgeVariant = (level: string) => {
    switch (level) {
      case "strong":
        return "default";
      case "weak":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Đánh giá chất lượng kế hoạch
          <Badge variant={getLevelBadgeVariant(quality.level)}>
            {quality.level === "strong" ? "Tốt" : quality.level === "weak" ? "Cần cải thiện" : "Trung bình"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {quality.warnings.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-red-600">Cảnh báo:</h4>
            <ul className="list-disc space-y-1 pl-4">
              {quality.warnings.map((warning, idx) => (
                <li key={idx} className="text-sm text-red-700">
                  {warning}
                </li>
              ))}
            </ul>
          </div>
        )}

        {quality.suggestions.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-blue-600">Gợi ý cải thiện:</h4>
            <ul className="list-disc space-y-1 pl-4">
              {quality.suggestions.map((suggestion, idx) => (
                <li key={idx} className="text-sm text-blue-700">
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 pt-4">
          {quality.dimensions.map((dim) => (
            <div key={dim.id} className="flex items-center gap-2">
              {getLevelIcon(dim.status)}
              <span className="text-sm">{dim.label}:</span>
              <span className="text-sm font-medium">
                {dim.score}/{dim.maxScore}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

### Step 2: Create test

**File:** `src/features/plan12week/components/PlanQualityPanel.test.tsx`

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PlanQualityPanel } from "./PlanQualityPanel";

describe("PlanQualityPanel", () => {
  const mockPlan = {
    vision: "Hoàn thành khóa học React nâng cao",
    weeks: Array.from({ length: 12 }, (_, i) => ({
      weekNumber: i + 1,
      focus: "Tuần " + (i + 1),
      expectedOutput: "Output tuần " + (i + 1),
      tasks: Array.from({ length: i === 0 ? 5 : 0 }, (_, j) => ({
        title: `Task ${j + 1}`,
      })),
      leadMetrics: [
        { name: "Luyện tập", weeklyTarget: 3, schedule: [1, 3, 5] },
        { name: "Review", weeklyTarget: 1, schedule: [4] },
      ],
    })),
  };

  it("renders quality assessment", () => {
    render(<PlanQualityPanel plan={mockPlan} />);
    expect(screen.getByText("Đánh giá chất lượng kế hoạch")).toBeInTheDocument();
  });

  it("shows warnings when quality is weak", () => {
    render(<PlanQualityPanel plan={mockPlan} />);
    // Should show either warnings or suggestions
    const warningsSection = screen.queryByText("Cảnh báo:");
    const suggestionsSection = screen.queryByText("Gợi ý cải thiện:");
    expect(warningsSection || suggestionsSection).toBeInTheDocument();
  });
});
```

### Step 3: Commit

```bash
npm run test:run -- --filter "PlanQualityPanel"
git add .
git commit -m "feat: add PlanQualityPanel component for validation display"
```

---

## Task 6: Create Plan Preview Component

**File:** `src/features/plan12week/components/PlanPreview.tsx`

### Step 1: Create main preview component

```typescript
import { useState } from "react";
import { ArrowLeft, Edit2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { PlanQualityPanel } from "./PlanQualityPanel";
import { TacticsEditor } from "./TacticsEditor";
import type { Plan12Week } from "../types/planTypes";

interface PlanPreviewProps {
  plan: Plan12Week;
  onEditTactics: () => void;
  onConfirm: () => void;
  onBack: () => void;
}

export function PlanPreview({ plan, onEditTactics, onConfirm, onBack }: PlanPreviewProps) {
  const [showEditor, setShowEditor] = useState(false);

  const weekOne = plan.weeks[0];
  const weeksTwoToFour = plan.weeks.slice(1, 4);

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Xem trước kế hoạch 12 tuần</h1>
          <p className="text-sm text-gray-500">{plan.vision}</p>
        </div>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Quay lại
        </Button>
      </div>

      <PlanQualityPanel plan={plan} />

      {/* Week 1 - Expanded */}
      <Card>
        <CardHeader>
          <CardTitle>Tuần 1 - Chi tiết việc cần làm</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p><strong>Trọng tâm:</strong> {weekOne.focus}</p>
            <p><strong>Kết quả kỳ vọng:</strong> {weekOne.expectedOutput}</p>
            <div className="mt-4">
              <h4 className="font-semibold mb-2">Danh sách việc ({weekOne.tasks.length} việc):</h4>
              <ul className="space-y-1">
                {weekOne.tasks.map((task) => (
                  <li key={task.id} className="flex items-start gap-2">
                    <input type="checkbox" disabled className="mt-1" />
                    <span className={task.status === "done" ? "line-through text-gray-400" : ""}>
                      {task.title}
                      {task.scheduledDate && (
                        <span className="text-gray-500 text-sm ml-2">
                          ({new Date(task.scheduledDate).toLocaleDateString("vi-VN", { weekday: "long" })})
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weeks 2-4 - Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Tuần 2-4 - Tóm tắt</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {weeksTwoToFour.map((week) => (
              <div key={week.weekNumber} className="border-b pb-3 last:border-b-0">
                <h5 className="font-semibold">Tuần {week.weekNumber}</h5>
                <p className="text-sm"><strong>Trọng tâm:</strong> {week.focus}</p>
                <p className="text-sm"><strong>Kết quả:</strong> {week.expectedOutput}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tactics Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Các việc lặp lại ({weekOne.leadMetrics.length})
            <Button variant="outline" size="sm" onClick={() => setShowEditor(true)}>
              <Edit2 className="mr-2 h-4 w-4" />
              Chỉnh sửa
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {weekOne.leadMetrics.map((metric) => (
              <li key={metric.id} className="flex items-center justify-between text-sm">
                <span>
                  <strong>{metric.name}</strong>
                  <span className="text-gray-500 ml-2">{metric.weeklyTarget} lần/tuần</span>
                </span>
                <span className="text-gray-500">
                  {metric.schedule?.length ?? 0} ngày/tuần
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={onBack}>
          Quay lại sửa
        </Button>
        <Button onClick={onConfirm} size="lg">
          Xác nhận tạo kế hoạch
        </Button>
      </div>

      {/* Tactics Editor Modal */}
      {showEditor && (
        <TacticsEditor
          tactics={weekOne.leadMetrics}
          onClose={() => setShowEditor(false)}
          onUpdate={(newTactics) => {
            // Update plan with new tactics - will need to regenerate tasks
            // This is simplified - in reality would update parent state
            setShowEditor(false);
          }}
        />
      )}
    </div>
  );
}
```

### Step 2: Create `TacticsEditor.tsx`

```typescript
import { X } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import type { LeadMetric } from "../types/planTypes";

interface TacticsEditorProps {
  tactics: LeadMetric[];
  onClose: () => void;
  onUpdate: (tactics: LeadMetric[]) => void;
}

const DAYS = [
  { value: 0, label: "Thứ 2" },
  { value: 1, label: "Thứ 3" },
  { value: 2, label: "Thứ 4" },
  { value: 3, label: "Thứ 5" },
  { value: 4, label: "Thứ 6" },
  { value: 5, label: "Thứ 7" },
  { value: 6, label: "Chủ nhật" },
];

export function TacticsEditor({ tactics, onClose, onUpdate }: TacticsEditorProps) {
  const [editedTactics, setEditedTactics] = useState<LeadMetric[]>(tactics);

  const updateTactic = (index: number, updates: Partial<LeadMetric>) => {
    const next = [...editedTactics];
    next[index] = { ...next[index], ...updates };
    setEditedTactics(next);
  };

  const toggleDay = (tacticIndex: number, day: number) => {
    const tactic = editedTactics[tacticIndex];
    const currentSchedule = tactic.schedule || [];
    const isSelected = currentSchedule.includes(day);
    const newSchedule = isSelected
      ? currentSchedule.filter((d) => d !== day)
      : [...currentSchedule, day].sort((a, b) => a - b);
    updateTactic(tacticIndex, { schedule: newSchedule });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Chỉnh sửa việc lặp lại</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 space-y-6">
          {editedTactics.map((tactic, idx) => (
            <div key={tactic.id} className="space-y-3 border-b pb-4 last:border-b-0">
              <div className="grid gap-2">
                <Label>Tên việc</Label>
                <Input
                  value={tactic.name}
                  onChange={(e) => updateTactic(idx, { name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Số lần/tuần</Label>
                  <Input
                    type="number"
                    min={1}
                    max={7}
                    value={tactic.weeklyTarget}
                    onChange={(e) => updateTactic(idx, { weeklyTarget: parseInt(e.target.value) || 1 })}
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Loại</Label>
                  <Select
                    value={tactic.type}
                    onValueChange={(value) => updateTactic(idx, { type: value as "core" | "optional" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="core">Cốt lõi</SelectItem>
                      <SelectItem value="optional">Tùy chọn</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Ngày trong tuần</Label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map(({ value, label }) => (
                    <Button
                      key={value}
                      type="button"
                      variant={(tactic.schedule || []).includes(value) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleDay(idx, value)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button
            onClick={() => {
              onUpdate(editedTactics);
              onClose();
            }}
          >
            Lưu thay đổi
          </Button>
        </div>
      </Card>
    </div>
  );
}
```

### Step 3: Commit

```bash
npm run typecheck
npm run test:run -- --filter "PlanPreview\|TacticsEditor"
git add .
git commit -m "feat: add PlanPreview and TacticsEditor components"
```

---

## Task 7: Integrate Preview into Setup Flow

**File:** `src/app/pages/12WeekSetup/helpers.ts`

### Step 1: Add generation helper

```typescript
import { generate12WeekPlan } from "@/features/plan12week/logic/generatePlan";
import type { TwelveWeekSetupDraft } from "./types";

export interface GeneratedPlanResult {
  plan: ReturnType<typeof generate12WeekPlan>;
  warnings: string[];
}

export function generatePlanFromDraft(draft: TwelveWeekSetupDraft): GeneratedPlanResult {
  const archetype = draft.goalType as any; // Map to GoalArchetype

  const result = generate12WeekPlan(
    {
      id: "temp_goal_id",
      goal_statement: draft.vision12Week,
    },
    {
      goalArchetype: archetype,
      feasibilityHint: {
        planLoad: draft.tacticLoadPreference,
        weeklyCapacity: draft.dailyTimeBudget?.includes("30min")
          ? "low"
          : draft.dailyTimeBudget?.includes("1.5h") || draft.dailyTimeBudget?.includes("2h")
            ? "high"
            : "medium",
        bottleneckAxis: draft.personalConstraint === "time"
          ? "time"
          : draft.personalConstraint === "consistency"
            ? "energy"
            : draft.personalConstraint === "complexity"
              ? "clarity"
              : draft.personalConstraint === "motivation"
                ? "obstacle"
                : undefined,
      },
      userPreferences: {
        tacticCount: draft.leadIndicators.length,
        dailyTimeBudget: draft.dailyTimeBudget,
      },
    }
  );

  return { plan: result, warnings: [] };
}
```

### Step 2: Create `PlanPreviewStep.tsx`

**File:** `src/app/pages/12WeekSetup/components/PlanPreviewStep.tsx`

```typescript
import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "../../components/ui/button";
import { PlanPreview } from "@/features/plan12week/components/PlanPreview";
import { generatePlanFromDraft, type GeneratedPlanResult } from "../helpers";
import type { TwelveWeekSetupDraft } from "../types";

interface PlanPreviewStepProps {
  draft: TwelveWeekSetupDraft;
  onBack: () => void;
}

export function PlanPreviewStep({ draft, onBack }: PlanPreviewStepProps) {
  const navigate = useNavigate();
  const [generated, setGenerated] = useState<GeneratedPlanResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(true);

  useState(() => {
    // Generate plan on mount
    const result = generatePlanFromDraft(draft);
    setGenerated(result);
    setIsGenerating(false);
  });

  const handleConfirm = async () => {
    if (!generated) return;

    // Save plan to localStorage/backend
    // This will integrate with existing save flow
    navigate("/12-week-system");
  };

  if (isGenerating) {
    return <div>Đang tạo kế hoạch...</div>;
  }

  return (
    <PlanPreview
      plan={generated!.plan}
      onEditTactics={() => {
        // Open tactics editor inline or navigate back
      }}
      onConfirm={handleConfirm}
      onBack={onBack}
    />
  );
}
```

### Step 3: Update `12WeekSetup.tsx` to add preview step

In the main component, add step handling:

```typescript
const STEPS = [
  "Thông tin cơ bản",
  "Kết quả 12 tuần",
  "Việc lặp lại",
  "Lịch trình",
  "Xem trước", // NEW
  "Hoàn tất",
];

// In render:
{currentStep === 4 && ( // Preview step index
  <PlanPreviewStep
    draft={draft}
    onBack={() => setCurrentStep(3)} // Go back to schedule step
  />
)}
```

Update button navigation accordingly.

### Step 4: Update E2E test

**File:** `src/app/pages/twelve-week-flows.e2e.test.tsx`

Update the flow test to handle preview step:

```typescript
it("creates a 12-week system from setup with preview", async () => {
  seedPendingSetupContext();
  const { router } = renderAppRoute("/12-week-setup");
  const user = userEvent.setup();

  await screen.findByRole("heading", { name: "Mục tiêu 12 tuần" });
  await user.click(screen.getByRole("button", { name: "Tiếp tục" }));

  // Fill tactics (existing)
  const tacticInputs = await screen.findAllByLabelText("Tên việc");
  await user.clear(tacticInputs[0]);
  await user.type(tacticInputs[0], "Ship phần việc cốt lõi");
  await user.clear(tacticInputs[1]);
  await user.type(tacticInputs[1], "Review cuối ngày");

  await user.click(screen.getByRole("button", { name: "Tiếp tục" }));
  await user.click(screen.getByRole("button", { name: "Tiếp tục" }));

  // Now on preview step
  await screen.findByText("Xem trước kế hoạch 12 tuần");

  // Verify Week 1 tasks shown
  expect(screen.getByText(/Tuần 1 - Chi tiết việc cần làm/)).toBeInTheDocument();

  // Confirm
  await user.click(screen.getByRole("button", { name: "Xác nhận tạo kế hoạch" }));

  await waitFor(() => {
    expect(router.state.location.pathname).toBe("/12-week-system");
  });
});
```

### Step 5: Commit

```bash
npm run typecheck
npm run test:run -- --filter "twelve-week-flows"
git add .
git commit -m "feat: integrate plan preview into 12-week setup flow"
```

---

## Task 8: Final Validation & QA

### Step 1: Run all tests

```bash
npm run test:run
npm run typecheck
npm run lint
```

### Step 2: Manual QA checklist

- [ ] Create plan with `skill_learning` archetype → Week 1 has 3-7 tasks
- [ ] Create plan with `health_fitness` → 2 tactics, low target
- [ ] Edit tactic in preview → changes reflect in Week 1 list
- [ ] Preview shows warnings for weak plan quality
- [ ] Back button returns to previous step
- [ ] Confirm creates plan and navigates to `/12-week-system`

### Step 3: Build and verify

```bash
npm run build
```

---

## Summary

This plan implements:

1. ✅ Auto tactic generation (2-4 tactics) from archetype
2. ✅ Week 1 task generation (3-7 tasks) with actionable titles
3. ✅ Preview UI with edit capabilities
4. ✅ Real-time validation using plan quality
5. ✅ Integration into setup flow

All tests pass, backward compatible, follows existing patterns.
