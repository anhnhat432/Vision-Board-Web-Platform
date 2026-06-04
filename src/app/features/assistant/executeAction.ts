import { buildResult } from "@/app/pages/FeasibilityCheck/helpers";
import { APP_STORAGE_KEYS, addGoal, addReflection, getUserData, saveUserData } from "@/app/utils/storage";
import { toggleTwelveWeekTaskInData } from "@/app/utils/storage-goal-ops";
import { buildDerivedScoreboard, getActiveTwelveWeekGoal, getDefaultScoreboard } from "@/app/utils/storage-twelve-week";
import type { Goal, TwelveWeekSystem, TwelveWeekTaskInstance } from "@/app/utils/storage-types";
import type { AssistantAction } from "./parseActions";
import { updateAssistantMemoryFromActionResult } from "./assistantMemory";

export interface ActionExecutionResult {
  success: boolean;
  message: string;
  verified?: boolean;
  alreadyDone?: boolean;
}

export interface AuditLogEntry {
  timestamp: string;
  type: string;
  label: string;
  success: boolean;
  message: string;
  verified?: boolean;
  alreadyDone?: boolean;
}

function writeAuditLog(actionType: string, label: string, result: ActionExecutionResult): void {
  if (typeof localStorage === "undefined") return;
  try {
    const raw = localStorage.getItem("assistant.action_audit_log");
    const logs: AuditLogEntry[] = raw ? JSON.parse(raw) : [];

    logs.unshift({
      timestamp: new Date().toISOString(),
      type: actionType,
      label,
      success: result.success,
      message: result.message,
      verified: result.verified,
      alreadyDone: result.alreadyDone,
    });

    const trimmedLogs = logs.slice(0, 50);
    localStorage.setItem("assistant.action_audit_log", JSON.stringify(trimmedLogs));
  } catch {}
}

function buildVerifiedResult(verified: boolean, successMessage: string, failureMessage: string): ActionExecutionResult {
  return verified
    ? { success: true, verified: true, message: successMessage }
    : { success: false, verified: false, message: failureMessage };
}

function mapFocusAreaToDomain(area: string): "career" | "health" | "finance" | "learning" | "relationship" | "life" {
  const normalized = area.toLowerCase();
  if (normalized.includes("sự nghiệp") || normalized.includes("career")) return "career";
  if (normalized.includes("sức khỏe") || normalized.includes("health")) return "health";
  if (normalized.includes("tài chính") || normalized.includes("finance")) return "finance";
  if (
    normalized.includes("học tập") ||
    normalized.includes("learning") ||
    normalized.includes("education") ||
    normalized.includes("personal growth") ||
    normalized.includes("phát triển")
  )
    return "learning";
  if (normalized.includes("quan hệ") || normalized.includes("relationship")) return "relationship";
  return "life";
}

function getPreferredTwelveWeekGoalId(): string | null {
  if (typeof localStorage === "undefined") return null;

  try {
    return (
      localStorage.getItem(APP_STORAGE_KEYS.latest12WeekSystemGoalId) ||
      localStorage.getItem(APP_STORAGE_KEYS.latest12WeekGoalId)
    );
  } catch {
    return null;
  }
}

function getAssistantActiveTwelveWeekGoal(goals: Goal[]): Goal | null {
  const activeGoal = getActiveTwelveWeekGoal(goals, getPreferredTwelveWeekGoalId());
  if (activeGoal?.twelveWeekSystem) return activeGoal;
  return goals.find((goal) => goal.twelveWeekSystem) ?? null;
}

function getOrderedTwelveWeekGoals(goals: Goal[]): Goal[] {
  const preferredGoalId = getPreferredTwelveWeekGoalId();
  const preferredGoal = preferredGoalId ? goals.find((goal) => goal.id === preferredGoalId) : null;
  const activeGoal = getAssistantActiveTwelveWeekGoal(goals);
  const ordered: Goal[] = [];

  for (const goal of [preferredGoal, activeGoal, ...goals]) {
    if (goal?.twelveWeekSystem && !ordered.some((item) => item.id === goal.id)) {
      ordered.push(goal);
    }
  }

  return ordered;
}

function findTwelveWeekTaskTarget(
  goals: Goal[],
  taskIdOrTitle: string,
): { goal: Goal; system: TwelveWeekSystem; task: TwelveWeekTaskInstance } | null {
  const normalizedNeedle = taskIdOrTitle.toLowerCase().trim();
  let titleFallback: { goal: Goal; system: TwelveWeekSystem; task: TwelveWeekTaskInstance } | null = null;

  for (const goal of getOrderedTwelveWeekGoals(goals)) {
    const system = goal.twelveWeekSystem;
    if (!system) continue;

    const taskInstances = system.taskInstances || [];
    const directMatch = taskInstances.find((task) => task.id === taskIdOrTitle);
    if (directMatch) return { goal, system, task: directMatch };

    if (!titleFallback) {
      const titleMatch = taskInstances.find((task) => task.title.toLowerCase().trim() === normalizedNeedle);
      if (titleMatch) {
        titleFallback = { goal, system, task: titleMatch };
      }
    }
  }

  return titleFallback;
}

async function runAction(action: AssistantAction): Promise<ActionExecutionResult> {
  switch (action.type) {
    case "navigate_to": {
      const { route } = action.payload as { route: string };
      window.location.assign(route);
      return { success: true, message: `Đang chuyển đến ${route}` };
    }

    case "create_task": {
      const payload = action.payload as { title: string; scheduledDate: string; isCore: boolean };
      const { title, isCore, scheduledDate: rawDate } = payload;

      const data = getUserData();
      if (!data?.goals || data.goals.length === 0) {
        return { success: false, message: "Không tìm thấy mục tiêu nào. Hãy tạo mục tiêu trước." };
      }

      const activeGoal = getAssistantActiveTwelveWeekGoal(data.goals);

      if (!activeGoal || !activeGoal.twelveWeekSystem) {
        return { success: false, message: "Chưa có 12-week plan. Hãy tạo plan trước." };
      }

      const system = activeGoal.twelveWeekSystem;

      let finalDate = "";
      if (rawDate === "today") {
        finalDate = new Date().toISOString().slice(0, 10);
      } else if (rawDate === "tomorrow") {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        finalDate = tomorrow.toISOString().slice(0, 10);
      } else if (typeof rawDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
        const parsed = Date.parse(rawDate);
        if (Number.isNaN(parsed)) {
          return { success: false, message: "Ngày lập lịch không hợp lệ." };
        }
        finalDate = rawDate;
      } else {
        return { success: false, message: "Ngày lập lịch không hợp lệ hoặc thiếu." };
      }

      const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const newTask: TwelveWeekTaskInstance = {
        id: taskId,
        title,
        weekNumber: system.currentWeek || 1,
        scheduledDate: finalDate,
        leadIndicatorName: title,
        isCore: isCore || false,
        completed: false,
        lastModifiedAt: Date.now(),
      };

      system.taskInstances = [...(system.taskInstances || []), newTask];

      saveUserData(data);

      // Verify state
      const verifyData = getUserData();
      const verifyGoal = verifyData?.goals?.find((g) => g.id === activeGoal.id);
      const verified = verifyGoal?.twelveWeekSystem?.taskInstances?.some((t) => t.id === taskId) ?? false;

      return buildVerifiedResult(
        verified,
        `Đã tạo task: ${title}`,
        `Đã thử tạo task "${title}" nhưng chưa xác minh được task đã được lưu.`,
      );
    }

    case "mark_task_done": {
      const payload = action.payload as { taskId: string; done: boolean };
      const { taskId, done } = payload;

      const data = getUserData();
      if (!data?.goals || data.goals.length === 0) {
        return { success: false, message: "Không tìm thấy dữ liệu." };
      }

      if (done !== true) {
        return { success: false, message: "Action đánh dấu task cần done=true." };
      }

      const target = findTwelveWeekTaskTarget(data.goals, taskId);
      if (!target) {
        if (!data.goals.some((goal) => goal.twelveWeekSystem)) {
          return { success: false, message: "Chưa có 12-week plan." };
        }
        return { success: false, message: "Không tìm thấy task." };
      }

      if (target.task.completed) {
        return { success: true, alreadyDone: true, verified: true, message: `Task "${target.task.title}" đã được hoàn thành từ trước.` };
      }

      const didToggle = toggleTwelveWeekTaskInData(data, target.goal.id, target.task.id, true);
      if (!didToggle) {
        return { success: false, message: "Không thể cập nhật task." };
      }

      saveUserData(data);

      // Verify state
      const verifyData = getUserData();
      const verifyTarget = findTwelveWeekTaskTarget(verifyData?.goals || [], taskId);
      const verified = verifyTarget?.task?.completed === true;

      return buildVerifiedResult(
        verified,
        `Đã đánh dấu xong: ${target.task.title}`,
        `Đã thử đánh dấu "${target.task.title}" nhưng chưa xác minh được task đã hoàn thành.`,
      );
    }

    case "create_goal": {
      const payload = action.payload as { title: string; category: string; description?: string; deadline?: string };
      const { title, category, description, deadline } = payload;

      const data = getUserData();
      if (!data) {
        return { success: false, message: "Không tải được dữ liệu người dùng." };
      }

      let finalDeadline = deadline;
      if (!finalDeadline) {
        const targetDate = new Date(Date.now() + 84 * 24 * 60 * 60 * 1000);
        finalDeadline = targetDate.toISOString().slice(0, 10);
      }

      const goalId = `goal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const newGoal = {
        id: goalId,
        title,
        category: category || "other",
        description: description || "",
        deadline: finalDeadline,
        tasks: [],
        createdAt: new Date().toISOString(),
      };

      data.goals = [...(data.goals || []), newGoal];

      saveUserData(data);

      // Verify state
      const verifyData = getUserData();
      const verified = verifyData?.goals?.some((g) => g.id === goalId) ?? false;

      return buildVerifiedResult(
        verified,
        `Đã tạo mục tiêu: ${title}`,
        `Đã thử tạo mục tiêu "${title}" nhưng chưa xác minh được mục tiêu đã được lưu.`,
      );
    }

    case "create_life_insight_note": {
      const { title, content, mood, entryType } = action.payload as {
        title: string;
        content: string;
        mood?: string;
        entryType: "freeform" | "weekly-review" | "cycleReview";
      };

      addReflection({
        title,
        content,
        mood,
        entryType,
        date: new Date().toISOString(),
      });

      return { success: true, message: `Đã tạo ghi chú phân tích: ${title}` };
    }

    case "create_smart_goal_from_insight": {
      const { title, category, description, deadline, focusArea } = action.payload as {
        title: string;
        category: string;
        description?: string;
        deadline?: string;
        focusArea?: string;
      };

      let finalDeadline = deadline;
      if (!finalDeadline) {
        const targetDate = new Date(Date.now() + 84 * 24 * 60 * 60 * 1000);
        finalDeadline = targetDate.toISOString().slice(0, 10);
      }

      const goalId = addGoal({
        title,
        category,
        description: description || "",
        deadline: finalDeadline,
        tasks: [],
        focusArea,
      });

      if (focusArea) {
        localStorage.setItem(APP_STORAGE_KEYS.selectedFocusArea, focusArea);
      }

      const smartGoalPayload = {
        id: goalId,
        domain: focusArea ? mapFocusAreaToDomain(focusArea) : "life",
        specific: { goal_statement: title },
        measurable: { metric_name: description || "Chỉ số", target_value: 100 },
        achievable: { weekly_time_commitment_hours: 3, required_skills: [], support_resources: [] },
        relevant: { motivation_reason: description || "" },
        time_bound: { target_weeks: 12 },
        created_at: new Date().toISOString(),
      };
      localStorage.setItem(APP_STORAGE_KEYS.pendingSmartGoal, JSON.stringify(smartGoalPayload));

      return { success: true, message: `Đã tạo mục tiêu SMART từ insight: ${title}` };
    }

    case "suggest_feasibility_inputs": {
      const { answers } = action.payload as { answers: Record<number, string> };

      const focusArea = localStorage.getItem(APP_STORAGE_KEYS.selectedFocusArea) || "";
      const data = getUserData();
      if (!data) {
        return { success: false, message: "Không tìm thấy dữ liệu người dùng." };
      }

      let wheelScore = 5;
      if (focusArea) {
        const area = data.currentWheelOfLife?.find((item) => item.name === focusArea);
        if (area && area.score > 0) {
          wheelScore = area.score;
        }
      }

      const result = buildResult(answers, wheelScore);

      const pendingFeasibilityResult = {
        resultType: result.type,
        resultTitle: result.title,
        resultSummary: result.summary,
        recommendation: result.recommendation,
        readinessScore: result.readinessScore,
        adjustedScore: result.adjustedScore,
        wheelScore: result.wheelScore,
        diagnosticScore: result.diagnosticScore,
        maxDiagnosticScore: result.maxDiagnosticScore,
        axisScores: result.axisScores,
        bottleneck: result.bottleneck,
        planLoad: result.planLoad,
        weeklyCapacity: result.weeklyCapacity,
        firstWeekGuidance: result.firstWeekGuidance,
        scopeRecommendation: result.scopeRecommendation,
        smartGoalQualityLevel: result.smartGoalQualityLevel,
        smartGoalQualityNote: result.smartGoalQualityNote,
        savedAt: new Date().toISOString(),
      };

      localStorage.setItem(APP_STORAGE_KEYS.pendingFeasibilityAnswers, JSON.stringify(answers));
      localStorage.setItem(APP_STORAGE_KEYS.pendingFeasibilityResult, JSON.stringify(pendingFeasibilityResult));

      return { success: true, message: `Đã đề xuất các câu trả lời trắc nghiệm khả thi thành công.` };
    }

    case "create_twelve_week_plan_draft": {
      const rawDraft = localStorage.getItem(APP_STORAGE_KEYS.pending12WeekSetupDraft);
      let draft = rawDraft ? JSON.parse(rawDraft) : {};
      draft = { ...draft, ...action.payload };

      localStorage.setItem(APP_STORAGE_KEYS.pending12WeekSetupDraft, JSON.stringify(draft));
      return { success: true, message: `Đã tạo/cập nhật bản nháp kế hoạch 12 tuần thành công.` };
    }

    case "add_weekly_review": {
      const payloadUpdates = action.payload as {
        goalId: string;
        weekNumber: number;
        mainObstacle: string;
        nextWeekPriority: string;
        workloadDecision: "keep same" | "reduce slightly" | "increase slightly" | "";
        biggestOutputThisWeek: string;
        reflection: string;
        adjustments: string;
        disciplineScore?: number;
        progressScore?: number;
      };
      const { goalId, weekNumber } = payloadUpdates;

      const data = getUserData();
      if (!data?.goals) {
        return { success: false, message: "Không tìm thấy dữ liệu người dùng." };
      }

      const goal = data.goals.find((g) => g.id === goalId);
      if (!goal) {
        return { success: false, message: "Không tìm thấy mục tiêu tương ứng." };
      }

      const system = goal.twelveWeekSystem;
      if (!system) {
        return { success: false, message: "Mục tiêu chưa thiết lập hệ thống 12 tuần." };
      }

      system.weeklyReviews = system.weeklyReviews || [];
      const index = system.weeklyReviews.findIndex((r) => r.weekNumber === weekNumber);

      const defaultReview = {
        weekNumber,
        leadCompletionPercent: 0,
        lagProgressValue: "",
        biggestOutputThisWeek: "",
        mainObstacle: "",
        nextWeekPriority: "",
        workloadDecision: "" as const,
        reviewCompleted: true,
        progressScore: 5,
        disciplineScore: 5,
        focusScore: 5,
        improvementScore: 5,
        outputQualityScore: 5,
        lastReviewAt: new Date().toISOString(),
      };

      if (index >= 0) {
        system.weeklyReviews[index] = {
          ...defaultReview,
          ...system.weeklyReviews[index],
          ...payloadUpdates,
        };
      } else {
        system.weeklyReviews.push({
          ...defaultReview,
          ...payloadUpdates,
        });
      }

      system.scoreboard = buildDerivedScoreboard(system, getDefaultScoreboard(system.totalWeeks || 12));

      saveUserData(data);

      // Verify state
      const verifyData = getUserData();
      const verifyGoal = verifyData?.goals?.find((g) => g.id === goalId);
      const verified = verifyGoal?.twelveWeekSystem?.weeklyReviews?.some((r) => r.weekNumber === weekNumber) ?? false;

      return buildVerifiedResult(
        verified,
        `Đã cập nhật review tuần ${weekNumber} thành công.`,
        `Đã thử cập nhật review tuần ${weekNumber} nhưng chưa xác minh được dữ liệu đã lưu.`,
      );
    }

    case "reschedule_task": {
      const { taskId, scheduledDate } = action.payload as { taskId: string; scheduledDate: string };

      const data = getUserData();
      if (!data?.goals || data.goals.length === 0) {
        return { success: false, message: "Không tìm thấy dữ liệu người dùng." };
      }

      const target = findTwelveWeekTaskTarget(data.goals, taskId);
      if (!target) {
        if (!data.goals.some((goal) => goal.twelveWeekSystem)) {
          return { success: false, message: "Chưa có 12-week plan." };
        }
        return { success: false, message: "Không tìm thấy task." };
      }

      let newDate = scheduledDate;
      if (scheduledDate === "tomorrow") {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        newDate = tomorrow.toISOString().slice(0, 10);
      } else if (scheduledDate === "today") {
        newDate = new Date().toISOString().slice(0, 10);
      } else if (typeof scheduledDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(scheduledDate)) {
        const parsed = Date.parse(scheduledDate);
        if (Number.isNaN(parsed)) {
          return { success: false, message: "Ngày lập lịch không hợp lệ." };
        }
        newDate = scheduledDate;
      } else {
        return { success: false, message: "Ngày dời lịch không hợp lệ." };
      }

      const system = target.goal.twelveWeekSystem!;
      const tIndex = system.taskInstances?.findIndex((t) => t.id === target.task.id);
      if (tIndex === undefined || tIndex === -1) {
        return { success: false, message: "Không thể cập nhật task." };
      }

      system.taskInstances![tIndex] = {
        ...target.task,
        rescheduledFrom: target.task.scheduledDate,
        scheduledDate: newDate,
        lastModifiedAt: Date.now(),
      };

      saveUserData(data);

      // Verify state
      const verifyData = getUserData();
      const verifyTarget = findTwelveWeekTaskTarget(verifyData?.goals || [], target.task.id);
      const verified = verifyTarget?.task?.scheduledDate === newDate;

      return buildVerifiedResult(
        verified,
        `Đã dời lịch task sang ngày ${newDate}.`,
        `Đã thử dời lịch "${target.task.title}" nhưng chưa xác minh được ngày mới đã được lưu.`,
      );
    }

    case "update_task_status": {
      const { taskId, completed } = action.payload as { taskId: string; completed: boolean };

      const data = getUserData();
      if (!data?.goals) {
        return { success: false, message: "Không tìm thấy dữ liệu người dùng." };
      }

      const target = findTwelveWeekTaskTarget(data.goals, taskId);
      if (!target) {
        return { success: false, message: "Không tìm thấy task tương ứng." };
      }

      const didToggle = toggleTwelveWeekTaskInData(data, target.goal.id, target.task.id, completed);
      if (!didToggle) {
        return { success: false, message: "Không thể cập nhật task." };
      }

      saveUserData(data);

      // Verify state
      const verifyData = getUserData();
      const verifyTarget = findTwelveWeekTaskTarget(verifyData?.goals || [], taskId);
      const verified = verifyTarget?.task?.completed === completed;

      return buildVerifiedResult(
        verified,
        completed ? "Đã đánh dấu hoàn thành nhiệm vụ." : "Đã bỏ đánh dấu hoàn thành nhiệm vụ.",
        completed
          ? `Đã thử đánh dấu "${target.task.title}" là hoàn thành nhưng chưa xác minh được trạng thái mới.`
          : `Đã thử bỏ đánh dấu "${target.task.title}" nhưng chưa xác minh được trạng thái mới.`,
      );
    }

    default:
      return { success: false, message: `Unknown action type: ${action.type}` };
  }
}

export async function executeAction(action: AssistantAction, userId: string | null = null): Promise<ActionExecutionResult> {
  try {
    const result = await runAction(action);
    writeAuditLog(action.type, action.label, result);
    updateAssistantMemoryFromActionResult(action.type, action.label, result.success, result.message, userId);
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const result: ActionExecutionResult = { success: false, message: `Lỗi: ${errorMessage}` };
    writeAuditLog(action.type, action.label, result);
    updateAssistantMemoryFromActionResult(action.type, action.label, result.success, result.message, userId);
    return result;
  }
}
