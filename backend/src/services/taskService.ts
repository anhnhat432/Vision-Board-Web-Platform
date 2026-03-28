import { MongoPlanRepository } from "../repositories/mongo/MongoPlanRepository";
import {
  MongoTaskRepository,
  type TaskStatus,
} from "../repositories/mongo/MongoTaskRepository";
import { MongoWeekRepository } from "../repositories/mongo/MongoWeekRepository";
import { requireTaskOwnership, requireWeekOwnership } from "./serviceGuards";

export interface AddTaskPayload {
  title: string;
  status?: TaskStatus;
  scheduledDate?: string;
}

class TaskService {
  constructor(
    private readonly planRepository: MongoPlanRepository,
    private readonly weekRepository: MongoWeekRepository,
    private readonly taskRepository: MongoTaskRepository,
  ) {}

  async addTaskToWeek(userId: string, weekId: string, payload: AddTaskPayload) {
    await requireWeekOwnership(this.planRepository, this.weekRepository, userId, weekId);

    return this.taskRepository.addTask({
      weekId,
      title: payload.title,
      status: payload.status ?? "todo",
      scheduledDate: payload.scheduledDate ? new Date(payload.scheduledDate) : undefined,
    });
  }

  async updateTaskStatus(userId: string, taskId: string, status: TaskStatus) {
    await requireTaskOwnership(
      this.planRepository,
      this.weekRepository,
      this.taskRepository,
      userId,
      taskId,
    );

    return this.taskRepository.updateTask(taskId, { status });
  }

  async deleteTask(userId: string, taskId: string) {
    await requireTaskOwnership(
      this.planRepository,
      this.weekRepository,
      this.taskRepository,
      userId,
      taskId,
    );

    return this.taskRepository.deleteTask(taskId);
  }
}

const planRepository = new MongoPlanRepository();
const weekRepository = new MongoWeekRepository();
const taskRepository = new MongoTaskRepository();

export const taskService = new TaskService(planRepository, weekRepository, taskRepository);
