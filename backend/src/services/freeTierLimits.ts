import { BillingSubscriptionModel } from "../models/BillingSubscriptionModel";
import { ApiError } from "../utils/apiError";

export const FREE_TIER_LIMITS = {
  maxActiveGoals: 3,
  max12WeekCycles: 1,
  maxVisionBoards: 1,
} as const;

type LimitName = keyof typeof FREE_TIER_LIMITS;

export async function hasPlusAccess(userId: string): Promise<boolean> {
  const subscription = await BillingSubscriptionModel.findOne({ userId }).sort({ createdAt: -1 }).lean().exec();
  if (!subscription) return false;
  if (subscription.planCode !== "PLUS") return false;
  return subscription.status === "active" || subscription.status === "trialing";
}

export async function assertFreeTierLimit(input: {
  userId: string;
  limitName: LimitName;
  currentCount: number;
  hasPlusAccess?: (userId: string) => Promise<boolean>;
}): Promise<void> {
  const limit = FREE_TIER_LIMITS[input.limitName];
  if (input.currentCount < limit) return;
  const checkPlusAccess = input.hasPlusAccess ?? hasPlusAccess;
  if (await checkPlusAccess(input.userId)) return;

  throw new ApiError(
    403,
    "Free tier limit exceeded.",
    { limitName: input.limitName, limit, currentCount: input.currentCount },
    "PLAN_LIMIT_EXCEEDED",
  );
}
