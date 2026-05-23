import type {
  ImportedDailyCheckInEntity,
  ImportedGoalEntity,
  ImportedLeadMetricEntity,
  ImportedPlanEntity,
  ImportedTaskEntity,
  ImportedWeekEntity,
  ImportedWeeklyReviewEntity,
} from "./types";

interface MongoDocWithId {
  _id: { toString(): string } | string;
}

export interface MongoGoalDoc extends MongoDocWithId {
  userId: string;
  clientGoalId?: string | null;
}

export interface MongoPlanDoc extends MongoDocWithId {
  userId: string;
  clientPlanId?: string | null;
}

export interface MongoWeekDoc extends MongoDocWithId {
  planId: { toString(): string } | string;
  clientWeekId?: string | null;
  weekNumber: number;
}

export interface MongoTaskDoc extends MongoDocWithId {
  weekId: { toString(): string } | string;
  clientTaskId?: string | null;
}

export interface MongoLeadMetricDoc extends MongoDocWithId {
  weekId: { toString(): string } | string;
  clientMetricId?: string | null;
}

export interface MongoDailyCheckInDoc extends MongoDocWithId {
  planId: { toString(): string } | string;
  weekId: { toString(): string } | string;
  clientCheckInId?: string | null;
}

export interface MongoWeeklyReviewDoc extends MongoDocWithId {
  weekId: { toString(): string } | string;
  clientReviewId?: string | null;
}

export function getDocId(doc: MongoDocWithId): string {
  return doc._id.toString();
}

export function mapGoalDoc(doc: MongoGoalDoc): ImportedGoalEntity {
  return {
    id: getDocId(doc),
    userId: doc.userId,
    clientGoalId: doc.clientGoalId ?? "",
  };
}

export function mapPlanDoc(doc: MongoPlanDoc): ImportedPlanEntity {
  return {
    id: getDocId(doc),
    userId: doc.userId,
    clientPlanId: doc.clientPlanId ?? "",
  };
}

export function mapWeekDoc(doc: MongoWeekDoc): ImportedWeekEntity {
  return {
    id: getDocId(doc),
    planId: doc.planId.toString(),
    clientWeekId: doc.clientWeekId ?? "",
    weekNumber: doc.weekNumber,
  };
}

export function mapTaskDoc(doc: MongoTaskDoc): ImportedTaskEntity {
  return {
    id: getDocId(doc),
    weekId: doc.weekId.toString(),
    clientTaskId: doc.clientTaskId ?? "",
  };
}

export function mapLeadMetricDoc(doc: MongoLeadMetricDoc): ImportedLeadMetricEntity {
  return {
    id: getDocId(doc),
    weekId: doc.weekId.toString(),
    clientMetricId: doc.clientMetricId ?? "",
  };
}

export function mapDailyCheckInDoc(doc: MongoDailyCheckInDoc): ImportedDailyCheckInEntity {
  return {
    id: getDocId(doc),
    planId: doc.planId.toString(),
    weekId: doc.weekId.toString(),
    clientCheckInId: doc.clientCheckInId ?? "",
  };
}

export function mapWeeklyReviewDoc(doc: MongoWeeklyReviewDoc): ImportedWeeklyReviewEntity {
  return {
    id: getDocId(doc),
    weekId: doc.weekId.toString(),
    clientReviewId: doc.clientReviewId ?? "",
  };
}
