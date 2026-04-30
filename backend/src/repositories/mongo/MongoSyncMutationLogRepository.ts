import type { Types } from "mongoose";

import { SyncMutationLogModel, type SyncMutationLogStatus } from "../../models/SyncMutationLogModel";

export interface SyncMutationLogEntity {
  id: string;
  userId: string;
  mutationId: string;
  idempotencyKey?: string;
  type: string;
  payloadHash: string;
  status: SyncMutationLogStatus;
  clientTimestamp?: Date;
  result?: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSyncMutationLogData {
  userId: string;
  mutationId: string;
  idempotencyKey?: string;
  type: string;
  payloadHash: string;
  status: SyncMutationLogStatus;
  clientTimestamp?: Date;
  result?: unknown;
}

function mapSyncMutationLog(doc: {
  _id: Types.ObjectId;
  userId: string;
  mutationId: string;
  idempotencyKey?: string | null;
  type: string;
  payloadHash: string;
  status: SyncMutationLogStatus;
  clientTimestamp?: Date | null;
  result?: unknown;
  createdAt: Date;
  updatedAt: Date;
}): SyncMutationLogEntity {
  return {
    id: doc._id.toString(),
    userId: doc.userId,
    mutationId: doc.mutationId,
    idempotencyKey: doc.idempotencyKey ?? undefined,
    type: doc.type,
    payloadHash: doc.payloadHash,
    status: doc.status,
    clientTimestamp: doc.clientTimestamp ?? undefined,
    result: doc.result,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class MongoSyncMutationLogRepository {
  async findByUserAndMutationId(userId: string, mutationId: string): Promise<SyncMutationLogEntity | null> {
    const doc = await SyncMutationLogModel.findOne({ userId, mutationId }).lean();
    return doc ? mapSyncMutationLog(doc) : null;
  }

  async createMutationLog(data: CreateSyncMutationLogData): Promise<SyncMutationLogEntity> {
    const doc = await SyncMutationLogModel.create(data);
    return mapSyncMutationLog(doc.toObject());
  }
}
