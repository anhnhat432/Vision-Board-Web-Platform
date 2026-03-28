import { MongoPlanRepository } from "../repositories/mongo/MongoPlanRepository";
import { MongoWeekRepository } from "../repositories/mongo/MongoWeekRepository";
import { requirePlanOwnership, requireWeekOwnership } from "./serviceGuards";

export interface UpdateWeekPayload {
  focus?: string;
  expectedOutput?: string;
}

export interface SubmitWeeklyReviewPayload {
  weekNumber?: number;
  executionScore: number;
  reflection?: string;
  adjustments?: string;
}

class WeekService {
  constructor(
    private readonly planRepository: MongoPlanRepository,
    private readonly weekRepository: MongoWeekRepository,
  ) {}

  async getWeeksForPlan(userId: string, planId: string) {
    await requirePlanOwnership(this.planRepository, userId, planId);
    return this.weekRepository.getWeeksByPlanId(planId);
  }

  async updateWeek(userId: string, weekId: string, payload: UpdateWeekPayload) {
    await requireWeekOwnership(this.planRepository, this.weekRepository, userId, weekId);
    return this.weekRepository.updateWeek(weekId, payload);
  }

  async submitWeeklyReview(
    userId: string,
    weekId: string,
    payload: SubmitWeeklyReviewPayload,
  ) {
    const week = await requireWeekOwnership(
      this.planRepository,
      this.weekRepository,
      userId,
      weekId,
    );

    return this.weekRepository.submitWeeklyReview(weekId, {
      weekNumber: payload.weekNumber ?? week.weekNumber,
      executionScore: payload.executionScore,
      reflection: payload.reflection,
      adjustments: payload.adjustments,
    });
  }
}

const planRepository = new MongoPlanRepository();
const weekRepository = new MongoWeekRepository();

export const weekService = new WeekService(planRepository, weekRepository);
