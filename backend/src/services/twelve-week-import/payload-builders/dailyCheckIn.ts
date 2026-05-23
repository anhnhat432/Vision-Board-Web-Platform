import {
  normalizeMood,
  normalizeWeekNumber,
  optionalBoolean,
  optionalNumberRange,
  optionalString,
  requiredDateKey,
  requiredString,
} from "../validators";
import type {
  ImportDailyCheckInData,
  ImportGoalData,
  ImportedWeekEntity,
} from "../types";

export function getDailyCheckInImportData(
  userId: string,
  goalData: ImportGoalData,
  plan: Record<string, unknown>,
  checkIn: Record<string, unknown>,
  backendPlanId: string,
  week: ImportedWeekEntity,
  importId: string,
  now: Date,
): ImportDailyCheckInData {
  const localDate = requiredDateKey(checkIn.localDate ?? checkIn.date, "dailyCheckIn.date");

  return {
    userId,
    planId: backendPlanId,
    weekId: week.id,
    clientGoalId: optionalString(checkIn.clientGoalId, "dailyCheckIn.clientGoalId") ?? goalData.clientGoalId,
    clientPlanId: requiredString(checkIn.clientPlanId ?? plan.clientPlanId, "dailyCheckIn.clientPlanId"),
    clientWeekId: requiredString(checkIn.clientWeekId, "dailyCheckIn.clientWeekId"),
    clientCheckInId: requiredString(checkIn.clientCheckInId, "dailyCheckIn.clientCheckInId"),
    weekNumber: normalizeWeekNumber(checkIn.weekNumber ?? week.weekNumber, "dailyCheckIn.weekNumber"),
    localDate,
    didWorkToday: optionalBoolean(checkIn.didWorkToday, "dailyCheckIn.didWorkToday") ?? false,
    whichLeadIndicatorWorkedOn: optionalString(
      checkIn.whichLeadIndicatorWorkedOn,
      "dailyCheckIn.whichLeadIndicatorWorkedOn",
    ),
    amountDone: optionalString(checkIn.amountDone, "dailyCheckIn.amountDone"),
    outputCreated: optionalString(checkIn.outputCreated, "dailyCheckIn.outputCreated"),
    obstacleOrIssue: optionalString(checkIn.obstacleOrIssue, "dailyCheckIn.obstacleOrIssue"),
    dailySelfRating: optionalNumberRange(checkIn.dailySelfRating, "dailyCheckIn.dailySelfRating", 0, 5),
    optionalNote: optionalString(checkIn.optionalNote, "dailyCheckIn.optionalNote"),
    mood: normalizeMood(checkIn.mood, "dailyCheckIn.mood"),
    importId,
    syncUpdatedAt: now,
  };
}
