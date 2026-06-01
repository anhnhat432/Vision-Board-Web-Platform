import type { TwelveWeekTaskInstance, UserData } from "@/app/utils/storage-types";
import type { AssistantAction } from "./parseActions";

const STORAGE_KEY = "userData";

function loadUserData(): UserData | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserData;
  } catch {
    return null;
  }
}

function saveUserData(data: UserData): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

export interface ActionExecutionResult {
  success: boolean;
  message: string;
}

export async function executeAction(action: AssistantAction): Promise<ActionExecutionResult> {
  try {
    switch (action.type) {
      case "navigate_to": {
        const { route } = action.payload as { route: string };
        window.location.assign(route);
        return { success: true, message: `Đang chuyển đến ${route}` };
      }

      case "create_task": {
        const payload = action.payload as { title: string; scheduledDate: string; isCore: boolean };
        const { title, isCore } = payload;

        const data = loadUserData();
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

        const data = loadUserData();
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

      default:
        return { success: false, message: `Unknown action type: ${action.type}` };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, message: `Lỗi: ${errorMessage}` };
  }
}
