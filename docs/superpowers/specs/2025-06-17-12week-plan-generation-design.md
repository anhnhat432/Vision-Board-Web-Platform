# 12-Week Plan Generation Enhancement - Design Spec

**Ngày:** 2025-06-17  
**Tác động:** MVP1 - Cải thiện tính khả dụng và chất lượng kế hoạch 12 tuần

---

## 1. Overview

Mục tiêu: Tạo kế hoạch 12 tuần **tự động có chất lượng cao** từ SMART goal + archetype, với:

- **2-4 recurring tactics** (việc lặp lại) actionable, measurable, time-bound
- **Week 1** có 3-7 tasks cụ thể, có thể làm ngay
- **Preview UX** cho phép user xem trước và chỉnh sửa trước khi finalize
- **Validation** tự động cảnh báo khi kế hoạch không đạt quality thresholds

---

## 2. Current State

### Vấn đề hiện tại

1. `generate12WeekPlan()` chỉ tạo 12 weeks trống với defaults từ archetype
2. User phải nhập tactics thủ công trong UI (theo test: `twelve-week-flows.e2e.test.tsx`)
3. Không có preview rõ ràng trước khi tạo plan
4. Chưa tự động sinh tasks cho Week 1

### Code liên quan

- `src/features/plan12week/logic/generatePlan.ts` - plan generation entry point
- `src/features/plan12week/logic/planArchetypeDefaults.ts` - archetype templates
- `src/features/plan12week/logic/planQuality.ts` - quality evaluation
- `src/features/plan12week/logic/taskConstraints.ts` - task count limits
- `src/app/utils/storage-twelve-week.ts` - task instance building (hỗ trợ)

---

## 3. Proposed Architecture

### Thêm mới

```
src/features/plan12week/
├── logic/
│   ├── generatePlan.ts (UPDATED)
│   ├── tacticGeneration.ts (NEW) - sinh tactics từ archetype
│   └── taskGeneration.ts (NEW) - sinh Week 1 tasks từ tactics
├── components/
│   ├── PlanPreview.tsx (NEW) - preview + edit UI
│   └── TacticsEditor.tsx (NEW) - edit tactics trong preview
└── hooks/
    └── usePlanGeneration.ts (NEW) - orchestrate generation flow
```

---

## 4. Core Logic

### 4.1 `generateTacticsFromArchetype()`

**Input:**
```typescript
{
  archetype: GoalArchetype,
  feasibilityHint?: GeneratePlanFeasibilityHint,
  userPreferences?: {
    tacticCount?: number, // 2-4
    dailyTimeBudget?: string,
  }
}
```

**Output:**
```typescript
type GeneratedTactic = {
  id: string;
  name: string;           // Actionable: "Write 500 words every weekday"
  target: number;         // Lần/tuần: 1-7
  schedule: number[];     // [0,1,2,3,4] = Mon-Fri
  type: "core" | "optional";
  priority: number;       // 1-7
}
```

**Logic:**
1. Lấy `leadIndicatorSuggestions` từ archetype defaults (2-3 suggestions)
2. Nếu `userPreferences.tacticCount` undefined, chọn random 2-4 (ưu tiên 3)
3. Với mỗi suggestion:
   - Tạo name actionable (thêm verb + measure + time-bound)
   - target: 1-3 lần/tuần (lower nếu feasibility low)
   - schedule: phân bổ đều theo target (ví dụ 3 lần → Mon, Wed, Fri)
   - type: 1-2 core, còn lại optional
   - priority: theo thứ tự importance
4. Validate: total tactics ∈ [2,4]

**Ví dụ output:**
```typescript
[
  {
    id: "tactic_1",
    name: "Viết 500 từ mỗi buổi sáng thứ 2-4",
    target: 3,
    schedule: [1, 2, 3], // Mon, Tue, Wed
    type: "core",
    priority: 1
  },
  {
    id: "tactic_2",
    name: "Review code từ đồng nghiệp 1 lần/tuần",
    target: 1,
    schedule: [4], // Thu
    type: "optional",
    priority: 2
  }
]
```

---

### 4.2 `generateWeekOneTasks()`

**Input:**
```typescript
{
  tactics: GeneratedTactic[],
  weekStartDate: Date, // Monday of Week 1
  totalWeeks: number = 12
}
```

**Output:**
```typescript
type WeekOneTask = {
  id: string;
  title: string;
  scheduledDate: string; // ISO date
  tacticId: string;
  isCore: boolean;
}
```

**Logic:**
1. Với mỗi tactic:
   - Tính `slotsPerTactic` = `target` (số lần cần làm trong tuần)
   - Lấy `schedule` offsets (0-6, với 0 = Monday)
   - Với mỗi offset:
     - `date = weekStartDate + offset days`
     - `title = type "core" ? "[CỐT LỖI] {tacticName}" : "{tacticName}"`
       (Ví dụ: "[CỐT LỖI] Viết 500 từ mỗi buổi sáng")
     - `id = generateId(week1, tacticId, slotIndex)`
2. Đảm bảo tổng tasks ∈ [3,7]
   - Nếu < 3: thêm 1-2 core tasks từ tactics có target cao
   - Nếu > 7: reduce by increasing targets (combine some slots)
3. Sort by priority, core first

**Task count validation:**
- Min 3, max 7 (theo `taskConstraints.ts` và `planQuality.ts`)
- Core tasks phải >= 1

---

### 4.3 Updated `generate12WeekPlan()`

```typescript
export function generate12WeekPlan(
  goal: Generate12WeekPlanInput,
  options?: Generate12WeekPlanOptions
): Plan12Week {
  const plan = ...existing logic...

  if (options?.goalArchetype) {
    // Generate tactics
    const tactics = generateTacticsFromArchetype(
      options.goalArchetype,
      options.feasibilityHint,
      options.userPreferences
    );

    // Generate Week 1 tasks
    const week1Start = new Date(plan.startDate);
    const weekOneTasks = generateWeekOneTasks(tactics, week1Start, 12);

    // Populate weeks[0]
    plan.weeks[0].tasks = weekOneTasks;
    plan.weeks[0].leadMetrics = tactics.map(t => ({
      id: t.id,
      name: t.name,
      weeklyTarget: t.target,
      unit: "lần/tuần",
      type: t.type,
      logs: []
    }));
  }

  return plan;
}
```

---

## 5. Preview UI: `PlanPreview.tsx`

### Structure

```tsx
export function PlanPreview({
  plan,
  onEditTactics,    // Open TacticsEditor
  onConfirm,        // Finalize plan
  onBack            // Go back to setup
}: PlanPreviewProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <h2>Xem trước kế hoạch 12 tuần</h2>

      {/* Validation Panel */}
      <PlanQualityPanel plan={plan} />

      {/* Week 1 - Expanded */}
      <section>
        <h3>Tuần 1 (Chi tiết)</h3>
        <WeekOneTasksList tasks={plan.weeks[0].tasks} />
      </section>

      {/* Weeks 2-4 - Summary */}
      <section>
        <h3>Tuần 2-4 (Tóm tắt)</h3>
        <WeeksSummary weeks={plan.weeks.slice(1, 4)} />
      </section>

      {/* Tactics Summary */}
      <section>
        <h3>Các việc lặp lại</h3>
        <TacticsSummary
          tactics={plan.weeks[0].leadMetrics}
          onEdit={onEditTactics}
        />
      </section>

      {/* Actions */}
      <div className="flex gap-4">
        <button onClick={onBack}>Quay lại sửa</button>
        <button onClick={onConfirm}>Xác nhận tạo kế hoạch</button>
      </div>
    </div>
  );
}
```

### `TacticsEditor.tsx`

Modal hoặc inline editor:

```tsx
export function TacticsEditor({
  tactics,
  onChange,
  onClose
}: TacticsEditorProps) {
  return (
    <div className="tactics-editor">
      {tactics.map((tactic, idx) => (
        <div key={tactic.id} className="tactic-card">
          <input
            value={tactic.name}
            onChange={e => updateTactic(idx, { name: e.target.value })}
            placeholder="Tên việc lặp lại"
          />
          <input
            type="number"
            value={tactic.target}
            min={1}
            max={7}
            onChange={e => updateTactic(idx, { target: parseInt(e.target.value) })}
          />
          <DaySelect
            value={tactic.schedule}
            onChange={days => updateTactic(idx, { schedule: days })}
          />
          <select
            value={tactic.type}
            onChange={e => updateTactic(idx, { type: e.target.value as any })}
          >
            <option value="core">Cốt lõi</option>
            <option value="optional">Tùy chọn</option>
          </select>
        </div>
      ))}
      <button onClick={onClose}>Lưu</button>
    </div>
  );
}
```

---

## 6. Validation: `PlanQualityPanel`

Reuse `evaluateTwelveWeekPlanQuality()`:

```typescript
const quality = evaluateTwelveWeekPlanQuality({
  vision12Week: plan.vision,
  week12Outcome: plan.weeks[11].expectedOutput,
  leadIndicators: plan.weeks[0].leadMetrics.map(m => ({
    name: m.name,
    target: m.weeklyTarget.toString(),
    schedule: m.schedule || []
  })),
  milestones: {
    week4: plan.weeks[3].expectedOutput,
    week8: plan.weeks[7].expectedOutput,
    week12: plan.weeks[11].expectedOutput
  }
}, {
  weeklyTaskCount: plan.weeks[0].tasks.length,
  firstTaskTitle: plan.weeks[0].tasks[0]?.title
});
```

Hiển thị:
- Overall score + level (strong/okay/weak)
- Warnings list (đỏ)
- Suggestions list (xanh)

---

## 7. Integration Into Setup Flow

Current flow (from e2e test):

```
/12-week-setup
  → SMART Goal form
  → Tactics form (Tên việc)
  → [PREVIEW STEP NEW]
  → "Tạo kế hoạch 12 tuần"
```

**Implementation:**
1. Trong `usePlanSetupSync.ts` hoặc hook mới, thêm state `previewPlan`
2. Sau khi user nhập tactics, call `generate12WeekPlan()` với archetype + tactics
3. Show `PlanPreview` component
4. Khi confirm, gửi plan lên backend hoặc lưu local

---

## 8. Edge Cases & Constraints

| Edge case | Handling |
|-----------|----------|
| Archetype = "other" | Không auto-generate tactics → user phải nhập thủ công |
| Feasibility low | target giảm (1-2), chỉ 2 tactics, ưu tiên core |
| Tactics count > 4 | Warning: "Vượt khuyến nghị 2-4 việc" |
| Week 1 tasks > 7 | Warning, suggest regenerate |
| User edits tactic → tasks thay đổi | Re-run `generateWeekOneTasks()` real-time |
| No lead metrics | Không sinh tasks → user nhập thủ công |

---

## 9. Testing Strategy

### Unit Tests

- `tacticGeneration.test.ts`
  - Generates 2-4 tactics
  - Target range 1-7
  - Schedule covers target days
  - Core/optional mix

- `taskGeneration.test.ts`
  - Week 1 tasks count ∈ [3,7]
  - Task titles are actionable
  - Scheduled dates fall in Week 1

- `generatePlan.test.ts` (update)
  - Plan has populated Week 1 tasks & leadMetrics
  - Tasks match tactics

### E2E Tests

Update `twelve-week-flows.e2e.test.tsx`:
- After tactics input, expect preview screen
- Verify Week 1 task count
- Verify edit tactics works
- Verify confirm creates plan

---

## 10. Migration & Backward Compatibility

- Existing plans without auto-generated tactics: vẫn hiển thị đúng (không có Week 1 tasks)
- `generate12WeekPlan()` backward compatible: nếu không có archetype → empty weeks (như cũ)
- LocalStorage shape không đổi: `TwelveWeekSystem` đã có `leadIndicators` + `taskInstances`

---

## 11. Success Criteria

✅ User nhập tactics → Preview tự động hiển thị Week 1 tasks  
✅ Tactics count luôn 2-4 (hoặc user override)  
✅ Week 1 task count 3-7  
✅ Task titles rõ ràng, có action verb  
✅ Validation warnings appear khi plan quality low  
✅ User có thể edit tactics trong preview trước khi confirm  
✅ E2E test pass cho flow mới  

---

## Questions / Open Items

1. Preview có phải là modal hay full page? → Suggest full page step trong flow
2. "Regenerate" button có random variation hay giữ same? → Suggest random shuffle suggestions
3. Có cho phép user add custom tactic ngoài suggestions? → Yes, trong TacticsEditor
