import type {
  CoachRecommendation,
  PersonalCoachContext,
} from "@shared/personalCoachSchema";
import { validateCoachRecommendation } from "@shared/personalCoachSchema";
import { post } from "@/lib/api/apiClient";

interface PersonalCoachApiResponse {
  recommendation: unknown;
}

function createInvalidResponseError(): Error & { errorCode: string } {
  const error = new Error("Coach trả về dữ liệu không hợp lệ.") as Error & {
    errorCode: string;
  };
  error.errorCode = "COACH_INVALID_RESPONSE";
  return error;
}

export async function requestPersonalCoachRecommendation(
  context: PersonalCoachContext,
  signal?: AbortSignal,
): Promise<CoachRecommendation> {
  const response = await post<PersonalCoachApiResponse, { context: PersonalCoachContext }>(
    "/ai/personal-coach",
    { context },
    { signal },
  );
  const validation = validateCoachRecommendation(response?.recommendation, context);
  if (!validation.ok) throw createInvalidResponseError();
  return validation.value;
}
