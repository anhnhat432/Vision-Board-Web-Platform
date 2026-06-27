import { Schema, model } from "mongoose";

export type SyncMutationLogStatus = "received" | "accepted" | "applied" | "skipped" | "failed";

const syncMutationLogSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    mutationId: {
      type: String,
      required: true,
      trim: true,
    },
    idempotencyKey: {
      type: String,
      required: false,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
    },
    payloadHash: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["received", "accepted", "applied", "skipped", "failed"],
      required: true,
      default: "received",
    },
    clientTimestamp: {
      type: Date,
      required: false,
    },
    result: {
      type: Schema.Types.Mixed,
      required: false,
    },
  },
  {
    timestamps: true,
  },
);

syncMutationLogSchema.index({ userId: 1, mutationId: 1 }, { unique: true });
// Partial unique index: chỉ áp dụng khi idempotencyKey là chuỗi thực sự.
// Một index sparse cũ vẫn coi nhiều bản ghi idempotencyKey=null là trùng nhau
// (E11000), khiến mutation thứ 2 trở đi của cùng user thất bại. Partial loại bỏ
// hoàn toàn null/absent khỏi index.
syncMutationLogSchema.index(
  { userId: 1, idempotencyKey: 1 },
  {
    unique: true,
    name: "sync_mutation_idempotency_unique",
    partialFilterExpression: { idempotencyKey: { $type: "string" } },
  },
);

export type SyncMutationLogDocument = {
  _id: string;
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
};

export const SyncMutationLogModel = model("SyncMutationLog", syncMutationLogSchema);
