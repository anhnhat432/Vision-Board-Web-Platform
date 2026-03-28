import { MongoMetricRepository } from "../repositories/mongo/MongoMetricRepository";
import { MongoPlanRepository } from "../repositories/mongo/MongoPlanRepository";
import { MongoTaskRepository } from "../repositories/mongo/MongoTaskRepository";
import { MongoWeekRepository } from "../repositories/mongo/MongoWeekRepository";
import { requirePlanOwnership } from "./serviceGuards";

export interface CreatePlanPayload {
  vision?: string;
  smartGoalId?: string;
  startDate?: string;
  initializeWeeks?: boolean;
  totalWeeks?: number;
}

class PlanService {
  constructor(
    private readonly planRepository: MongoPlanRepository,
    private readonly weekRepository: MongoWeekRepository,
    private readonly taskRepository: MongoTaskRepository,
    private readonly metricRepository: MongoMetricRepository,
  ) {}

  async createPlanForUser(userId: string, payload: CreatePlanPayload) {
    const plan = await this.planRepository.createPlan({
      userId,
      vision: payload.vision ?? "",
      smartGoalId: payload.smartGoalId,
      startDate: payload.startDate ? new Date(payload.startDate) : new Date(),
    });

    if (payload.initializeWeeks) {
      const totalWeeks = payload.totalWeeks && payload.totalWeeks > 0 ? payload.totalWeeks : 12;
      await Promise.all(
        Array.from({ length: totalWeeks }, (_, index) =>
          this.weekRepository.createWeek({
            planId: plan.id,
            weekNumber: index + 1,
            focus: "",
            expectedOutput: "",
          }),
        ),
      );
    }

    return plan;
  }

  async getUserPlans(userId: string) {
    return this.planRepository.getPlansByUserId(userId);
  }

  async getPlanDetails(userId: string, planId: string) {
    const plan = await requirePlanOwnership(this.planRepository, userId, planId);
    const weeks = await this.weekRepository.getWeeksByPlanId(plan.id);

    const details = await Promise.all(
      weeks.map(async (week) => {
        const [tasks, metrics] = await Promise.all([
          this.taskRepository.getTasksByWeekId(week.id),
          this.metricRepository.getMetricsByWeekId(week.id),
        ]);

        return {
          ...week,
          tasks,
          metrics,
        };
      }),
    );

    return {
      plan,
      weeks: details,
    };
  }
}

const planRepository = new MongoPlanRepository();
const weekRepository = new MongoWeekRepository();
const taskRepository = new MongoTaskRepository();
const metricRepository = new MongoMetricRepository();

export const planService = new PlanService(
  planRepository,
  weekRepository,
  taskRepository,
  metricRepository,
);
