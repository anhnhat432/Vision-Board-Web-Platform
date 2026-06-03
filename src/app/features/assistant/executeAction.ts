import { buildResult } from "@/app/pages/FeasibilityCheck/helpers";
import { APP_STORAGE_KEYS, addGoal, addReflection, getUserData, saveUserData } from "@/app/utils/storage";
import { toggleTwelveWeekTaskInData } from "@/app/utils/storage-goal-ops";
import { buildDerivedScoreboard, getDefaultScoreboard } from "@/app/utils/storage-twelve-week";
import type { TwelveWeekTaskInstance } from "@/app/utils/storage-types";
import type { AssistantAction } from "./parseActions";

export interface ActionExecutionResult {
  success: boolean;
  message: string;
}

export interface AuditLogEntry {
  timestamp: string;
  type: string;
  label: string;
  success: boolean;
  message: string;
}

function writeAuditLog(actionType: string, label: string, success: boolean, message: string): void {
  if (typeof localStorage === "undefined") return;
  try {
    const raw = localStorage.getItem("assistant.action_audit_log");
    const logs: AuditLogEntry[] = raw ? JSON.parse(raw) : [];

    logs.unshift({
      timestamp: new Date().toISOString(),
      type: actionType,
      label,
      success,
      message,
    });

    const trimmedLogs = logs.slice(0, 50);
    localStorage.setItem("assistant.action_audit_log", JSON.stringify(trimmedLogs));
  } catch {}
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

async function runAction(action: AssistantAction): Promise<ActionExecutionResult> {
  switch (action.type) {
    case "navigate_to": {
      const { route } = action.payload as { route: string };
      window.location.assign(route);
      return { success: true, message: `Đang chuyển đến ${route}` };
    }

    case "create_task": {
      const payload = action.payload as { title: string; scheduledDate: string; isCore: boolean };
      const { title, isCore } = payload;

      const data = getUserData();
      if (!data?.goals || data.goals.length === 0) {
        return { success: false, message: "Không tìm thấy mục tiêu nào. Hãy tạo mục tiêu trước." };
      }

      const goal = data.goals[0];
      const system = goal.twelveWeekSystem;
      if (!system) {
        return { success: false, message: "Chưa có 12-week plan. Hãy tạo plan trước." };
      }

      const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const newTask: TwelveWeekTaskInstance = {
        id: taskId,
        title,
        weekNumber: system.currentWeek || 1,
        scheduledDate: new Date().toISOString().slice(0, 10),
        leadIndicatorName: title,
        isCore: isCore || false,
        completed: false,
        lastModifiedAt: Date.now(),
      };

      system.taskInstances = [...(system.taskInstances || []), newTask];

      saveUserData(data);
      return { success: true, message: `Đã tạo task: ${title}` };
    }

    case "mark_task_done": {
      const payload = action.payload as { taskId: string; done: boolean };
      const { taskId } = payload;

      const data = getUserData();
      if (!data?.goals || data.goals.length === 0) {
        return { success: false, message: "Không tìm thấy dữ liệu." };
      }

      const goal = data.goals[0];
      const system = goal.twelveWeekSystem;
      if (!system) {
        return { success: false, message: "Chưa có 12-week plan." };
      }

      const task = system.taskInstances?.find((t) => t.id === taskId);
      if (!task) {
        return { success: false, message: "Không tìm thấy task." };
      }

      if (task.completed) {
        return { success: false, message: "Task đã được đánh dấu hoàn thành rồi." };
      }

      const taskIndex = system.taskInstances.findIndex((t) => t.id === taskId);
      if (taskIndex === -1) {
        return { success: false, message: "Không tìm thấy task." };
      }

      system.taskInstances[taskIndex] = {
        ...task,
        completed: true,
        completedAt: new Date().toISOString(),
        lastModifiedAt: Date.now(),
      };

      saveUserData(data);
      return { success: true, message: `Đã đánh dấu xong: ${task.title}` };
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
      return { success: true, message: `Đã tạo mục tiêu: ${title}` };
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
      return { success: true, message: `Đã cập nhật review tuần ${weekNumber} thành công.` };
    }

    case "reschedule_task": {
      const { taskId, scheduledDate } = action.payload as { taskId: string; scheduledDate: string };

      const data = getUserData();
      if (!data?.goals) {
        return { success: false, message: "Không tìm thấy dữ liệu người dùng." };
      }

      let taskFound = false;
      for (const goal of data.goals) {
        const system = goal.twelveWeekSystem;
        if (system?.taskInstances) {
          const tIndex = system.taskInstances.findIndex((t) => t.id === taskId);
          if (tIndex !== -1) {
            const task = system.taskInstances[tIndex];
            let newDate = scheduledDate;
            if (scheduledDate === "tomorrow") {
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              newDate = tomorrow.toISOString().slice(0, 10);
            }
            system.taskInstances[tIndex] = {
              ...task,
              rescheduledFrom: task.scheduledDate,
              scheduledDate: newDate,
              lastModifiedAt: Date.now(),
            };
            taskFound = true;
            break;
          }
        }
      }

      if (!taskFound) {
        return { success: false, message: "Không tìm thấy task tương ứng." };
      }

      saveUserData(data);
      return { success: true, message: `Đã dời lịch task sang ngày ${scheduledDate}.` };
    }

    case "update_task_status": {
      const { taskId, completed } = action.payload as { taskId: string; completed: boolean };

      const data = getUserData();
      if (!data?.goals) {
        return { success: false, message: "Không tìm thấy dữ liệu người dùng." };
      }

      let targetGoalId = "";
      for (const goal of data.goals) {
        if (goal.twelveWeekSystem?.taskInstances?.some((t) => t.id === taskId)) {
          targetGoalId = goal.id;
          break;
        }
      }

      if (!targetGoalId) {
        return { success: false, message: "Không tìm thấy task tương ứng." };
      }

      toggleTwelveWeekTaskInData(data, targetGoalId, taskId, completed);
      saveUserData(data);

      return {
        success: true,
        message: completed ? "Đã đánh dấu hoàn thành nhiệm vụ." : "Đã bỏ đánh dấu hoàn thành nhiệm vụ.",
      };
    }

    default:
      return { success: false, message: `Unknown action type: ${action.type}` };
  }
}

export async function executeAction(action: AssistantAction): Promise<ActionExecutionResult> {
  try {
    const result = await runAction(action);
    writeAuditLog(action.type, action.label, result.success, result.message);
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const result = { success: false, message: `Lỗi: ${errorMessage}` };
    writeAuditLog(action.type, action.label, result.success, result.message);
    return result;
  }
}
