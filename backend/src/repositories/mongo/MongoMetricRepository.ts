import type { Types } from "mongoose";

import { LeadMetricModel } from "../../models/LeadMetricModel";

export interface MetricLogEntity {
  id: string;
  date: Date;
  value: number;
  completed: boolean;
}

export interface MetricEntity {
  id: string;
  weekId: string;
  name: string;
  weeklyTarget: number;
  logs: MetricLogEntity[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMetricData {
  weekId: string;
  name: string;
  weeklyTarget?: number;
}

export interface UpdateMetricData {
  name?: string;
  weeklyTarget?: number;
}

export interface LogMetricData {
  date: Date;
  value: number;
  completed: boolean;
}

type RawMetricDoc = {
  _id: Types.ObjectId;
  weekId: Types.ObjectId;
  name: string;
  weeklyTarget: number;
  logs: Array<{
    _id: Types.ObjectId;
    date: Date;
    value: number;
    completed: boolean;
  }>;
  createdAt: Date;
  updatedAt: Date;
};

function mapMetric(doc: RawMetricDoc): MetricEntity {
  return {
    id: doc._id.toString(),
    weekId: doc.weekId.toString(),
    name: doc.name,
    weeklyTarget: doc.weeklyTarget,
    logs: doc.logs.map((log) => ({
      id: log._id.toString(),
      date: log.date,
      value: log.value,
      completed: log.completed,
    })),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class MongoMetricRepository {
  async createMetric(data: CreateMetricData): Promise<MetricEntity> {
    const doc = await LeadMetricModel.create({
      weekId: data.weekId,
      name: data.name,
      weeklyTarget: data.weeklyTarget ?? 0,
      logs: [],
    });

    return mapMetric(doc.toObject());
  }

  async getMetricById(id: string): Promise<MetricEntity | null> {
    const doc = await LeadMetricModel.findById(id).lean();
    return doc ? mapMetric(doc) : null;
  }

  async getMetricsByWeekId(weekId: string): Promise<MetricEntity[]> {
    const docs = await LeadMetricModel.find({ weekId }).sort({ createdAt: 1 }).lean();
    return docs.map((doc) => mapMetric(doc));
  }

  async logMetric(metricId: string, log: LogMetricData): Promise<MetricEntity | null> {
    const doc = await LeadMetricModel.findByIdAndUpdate(
      metricId,
      {
        $push: {
          logs: {
            date: log.date,
            value: log.value,
            completed: log.completed,
          },
        },
      },
      { new: true, runValidators: true },
    ).lean();

    return doc ? mapMetric(doc) : null;
  }

  async updateMetric(metricId: string, updates: UpdateMetricData): Promise<MetricEntity | null> {
    const doc = await LeadMetricModel.findByIdAndUpdate(
      metricId,
      { $set: updates },
      { new: true, runValidators: true },
    ).lean();

    return doc ? mapMetric(doc) : null;
  }
}
