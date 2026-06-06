import type { AssistantAction } from "../parseActions";
import type { AssistantEvalCase, EvalCategory, EvalRoute } from "./assistantEvalCases";

/**
 * G5: rubric chấm chất lượng cho mỗi case.
 * Mỗi tiêu chí là một dimension; case "pass" khi không có failure.
 * Rubric chỉ ánh xạ failure -> dimension để báo cáo điểm yếu theo nhóm,
 * KHÔNG nới lỏng tiêu chí pass/fail vốn có.
 */
export type RubricDimension =
  | "context_grounded" // bám context (shouldContain/shouldNotContain)
  | "no_fabricated_id" // không bịa task/goal ID
  | "asks_when_missing" // hỏi làm rõ khi thiếu dữ liệu
  | "valid_action_schema" // action đúng schema/đúng loại được phép
  | "concise" // ngắn gọn theo coaching style
  | "route_useful"; // hữu ích/đúng theo route hiện tại

export interface RubricScore {
  dimension: RubricDimension;
  passed: boolean;
}

export interface EvalResult {
  caseId: string;
  caseName: string;
  category: EvalCategory;
  route: EvalRoute;
  passed: boolean;
  actualReply: string;
  actualActions: AssistantAction[];
  failures: string[];
  rubric: RubricScore[];
}

export interface GroupBreakdown {
  key: string;
  total: number;
  passed: number;
  failed: number;
  passRate: number; // percentage 0-100
}

export interface EvalSummary {
  total: number;
  passed: number;
  failed: number;
  passRate: number; // percentage 0-100
  results: EvalResult[];
  byCategory: GroupBreakdown[];
  byRoute: GroupBreakdown[];
  /** G5: pass rate riêng cho nhóm safety-critical (phải = 100). */
  safetyCriticalPassRate: number;
  /** G5: tổng hợp số case fail theo từng rubric dimension. */
  rubricFailures: Record<RubricDimension, number>;
}

const ALL_RUBRIC_DIMENSIONS: RubricDimension[] = [
  "context_grounded",
  "no_fabricated_id",
  "asks_when_missing",
  "valid_action_schema",
  "concise",
  "route_useful",
];

/**
 * G5: ánh xạ một failure message sang rubric dimension để báo cáo.
 * Dùng prefix ổn định trong các failure đẩy ra ở dưới.
 */
function dimensionForFailure(failure: string): RubricDimension {
  if (failure.startsWith("[context]")) return "context_grounded";
  if (failure.startsWith("[id]")) return "no_fabricated_id";
  if (failure.startsWith("[clarify]")) return "asks_when_missing";
  if (failure.startsWith("[action]")) return "valid_action_schema";
  if (failure.startsWith("[concise]")) return "concise";
  return "route_useful";
}

function pct(passed: number, total: number): number {
  if (total <= 0) return 100;
  return Math.round((passed / total) * 100);
}

function summarizeGroup<T extends string>(results: EvalResult[], pick: (r: EvalResult) => T): GroupBreakdown[] {
  const map = new Map<string, { total: number; passed: number }>();
  for (const r of results) {
    const key = pick(r);
    const bucket = map.get(key) ?? { total: 0, passed: 0 };
    bucket.total += 1;
    if (r.passed) bucket.passed += 1;
    map.set(key, bucket);
  }
  const out: GroupBreakdown[] = [];
  for (const [key, bucket] of map.entries()) {
    out.push({
      key,
      total: bucket.total,
      passed: bucket.passed,
      failed: bucket.total - bucket.passed,
      passRate: pct(bucket.passed, bucket.total),
    });
  }
  return out.sort((a, b) => b.total - a.total);
}

/**
 * Runs a set of assistant evaluation cases using a reply generator function.
 * Verifies correctness across several dimensions:
 * 1. String inclusion (shouldContain)              -> [context]
 * 2. String exclusion (shouldNotContain)           -> [context]
 * 3. Expected action types (expectedActionTypes)   -> [action]
 * 4. Forbidden action types (forbiddenActionTypes) -> [action]
 * 5. Word count limit (maxWords)                   -> [concise]
 * 6. Clarification behavior                        -> [clarify]
 * 7. Correct task ID referencing                   -> [id]
 *
 * G5: mỗi failure được gắn prefix để map sang rubric dimension, và summary
 * trả về breakdown theo category/route + safety-critical pass rate.
 */
export async function runAssistantEvals(
  cases: AssistantEvalCase[],
  generateReply: (
    input: string,
    context: AssistantEvalCase["context"],
  ) => Promise<{ content: string; actions: AssistantAction[] }>,
  options?: { safetyCriticalCategories?: EvalCategory[] },
): Promise<EvalSummary> {
  const safetyCriticalCategories = new Set(options?.safetyCriticalCategories ?? []);
  const results: EvalResult[] = [];
  let passedCount = 0;
  let failedCount = 0;

  for (const c of cases) {
    const failures: string[] = [];
    try {
      const { content, actions } = await generateReply(c.input, c.context);
      const normalizedContent = content.toLowerCase();

      // 1. shouldContain check
      if (c.expected.shouldContain) {
        for (const word of c.expected.shouldContain) {
          if (!normalizedContent.includes(word.toLowerCase())) {
            failures.push(`[context] Reply does not contain expected text: "${word}"`);
          }
        }
      }

      // 2. shouldNotContain check
      if (c.expected.shouldNotContain) {
        for (const word of c.expected.shouldNotContain) {
          if (normalizedContent.includes(word.toLowerCase())) {
            failures.push(`[context] Reply contains forbidden text: "${word}"`);
          }
        }
      }

      // 3. expectedActionTypes check
      if (c.expected.expectedActionTypes) {
        for (const type of c.expected.expectedActionTypes) {
          const hasAction = actions.some((a) => a.type === type);
          if (!hasAction) {
            failures.push(`[action] Expected action type "${type}" was not generated`);
          }
        }
      }

      // 4. forbiddenActionTypes check
      if (c.expected.forbiddenActionTypes) {
        for (const type of c.expected.forbiddenActionTypes) {
          const hasAction = actions.some((a) => a.type === type);
          if (hasAction) {
            failures.push(`[action] Forbidden action type "${type}" was generated`);
          }
        }
      }

      // 5. maxWords check
      if (c.expected.maxWords) {
        const words = content.trim().split(/\s+/).filter(Boolean).length;
        if (words > c.expected.maxWords) {
          failures.push(`[concise] Word count ${words} exceeded max limit of ${c.expected.maxWords}`);
        }
      }

      // 6. mustAskClarifyingQuestion check
      if (c.expected.mustAskClarifyingQuestion) {
        const normalizedReply = content
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase();
        const hasClarification =
          content.includes("?") ||
          normalizedReply.includes("vui long") ||
          normalizedReply.includes("chon") ||
          normalizedReply.includes("khong thay") ||
          normalizedReply.includes("nao") ||
          normalizedReply.includes("cu the");
        if (!hasClarification) {
          failures.push("[clarify] Expected AI to ask a clarifying question, but reply did not seem to contain one");
        }
      }

      // 7. mustUseExistingTaskId check
      if (c.expected.mustUseExistingTaskId) {
        const existingTaskIds = new Set<string>();

        if (c.context.todayTasks && Array.isArray(c.context.todayTasks)) {
          for (const t of c.context.todayTasks) {
            if (t.id) existingTaskIds.add(t.id);
          }
        }
        if (c.context.stuckSignals?.overdueTasks && Array.isArray(c.context.stuckSignals.overdueTasks)) {
          for (const t of c.context.stuckSignals.overdueTasks) {
            if (t.id) existingTaskIds.add(t.id);
          }
        }

        for (const action of actions) {
          const taskId = action.payload?.taskId;
          if (typeof taskId === "string" && !existingTaskIds.has(taskId)) {
            failures.push(`[id] Action used non-existent taskId: "${taskId}"`);
          }
        }
      }

      const passed = failures.length === 0;
      if (passed) passedCount++;
      else failedCount++;

      results.push({
        caseId: c.id,
        caseName: c.name,
        category: c.category,
        route: c.route,
        passed,
        actualReply: content,
        actualActions: actions,
        failures,
        rubric: buildRubric(failures),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      failedCount++;
      const errFailures = [`[action] Error running case: ${message}`];
      results.push({
        caseId: c.id,
        caseName: c.name,
        category: c.category,
        route: c.route,
        passed: false,
        actualReply: "",
        actualActions: [],
        failures: errFailures,
        rubric: buildRubric(errFailures),
      });
    }
  }

  const rubricFailures = aggregateRubricFailures(results);
  const safetyResults = results.filter((r) => safetyCriticalCategories.has(r.category));
  const safetyPassed = safetyResults.filter((r) => r.passed).length;

  return {
    total: cases.length,
    passed: passedCount,
    failed: failedCount,
    passRate: pct(passedCount, cases.length),
    results,
    byCategory: summarizeGroup(results, (r) => r.category),
    byRoute: summarizeGroup(results, (r) => r.route),
    safetyCriticalPassRate: pct(safetyPassed, safetyResults.length),
    rubricFailures,
  };
}

/**
 * G5: dựng rubric cho 1 case. Dimension nào có failure tương ứng thì coi là không đạt.
 * Dimension không bị đụng tới mặc định coi là đạt (passed=true).
 */
function buildRubric(failures: string[]): RubricScore[] {
  const failedDimensions = new Set<RubricDimension>();
  for (const f of failures) {
    failedDimensions.add(dimensionForFailure(f));
  }
  return ALL_RUBRIC_DIMENSIONS.map((dimension) => ({
    dimension,
    passed: !failedDimensions.has(dimension),
  }));
}

function aggregateRubricFailures(results: EvalResult[]): Record<RubricDimension, number> {
  const counts = {
    context_grounded: 0,
    no_fabricated_id: 0,
    asks_when_missing: 0,
    valid_action_schema: 0,
    concise: 0,
    route_useful: 0,
  } satisfies Record<RubricDimension, number>;

  for (const r of results) {
    for (const score of r.rubric) {
      if (!score.passed) counts[score.dimension] += 1;
    }
  }
  return counts;
}

/**
 * G5: format summary thành text dễ đọc cho CI log / báo cáo release.
 */
export function formatEvalSummary(summary: EvalSummary): string {
  const lines: string[] = [];
  lines.push(`Assistant Eval Summary: ${summary.passed}/${summary.total} passed (${summary.passRate}%)`);
  lines.push(`Safety-critical pass rate: ${summary.safetyCriticalPassRate}%`);

  lines.push("By category:");
  for (const g of summary.byCategory) {
    lines.push(`  - ${g.key}: ${g.passed}/${g.total} (${g.passRate}%)`);
  }

  lines.push("By route:");
  for (const g of summary.byRoute) {
    lines.push(`  - ${g.key}: ${g.passed}/${g.total} (${g.passRate}%)`);
  }

  lines.push("Rubric failures:");
  for (const dimension of ALL_RUBRIC_DIMENSIONS) {
    lines.push(`  - ${dimension}: ${summary.rubricFailures[dimension]}`);
  }

  if (summary.failed > 0) {
    lines.push("Failed cases:");
    for (const r of summary.results) {
      if (r.passed) continue;
      lines.push(`  - [${r.caseId}] ${r.caseName}`);
      for (const f of r.failures) {
        lines.push(`      ${f}`);
      }
    }
  }

  return lines.join("\n");
}