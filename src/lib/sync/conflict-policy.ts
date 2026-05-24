import type { UserData } from "@/app/utils/storage-types";

/**
 * Returns true when local UserData is an untouched fresh seed:
 * the user has not onboarded, has no goals, no reflections, no
 * wheel-of-life history, no achievements, no vision boards, and
 * was not hydrated from demo data.
 *
 * Used by the cloud sync conflict policy to suppress the
 * "Cần chọn bản dữ liệu" banner on fresh logins, where the
 * local empty seed naturally differs from a populated cloud
 * snapshot but is not a real user-vs-user conflict.
 */
export function isLocalDataUntouchedSeed(data: UserData | null | undefined): boolean {
  if (!data) return false;
  if (data.onboardingCompleted) return false;
  if (data.isHydratedFromDemo === true) return false;
  if (data.goals.length > 0) return false;
  if (data.reflections.length > 0) return false;
  if (data.wheelOfLifeHistory.length > 0) return false;
  if (data.achievements.length > 0) return false;
  if (data.visionBoards.length > 0) return false;
  return true;
}
