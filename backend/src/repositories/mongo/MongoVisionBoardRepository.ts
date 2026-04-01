import { VisionBoardModel } from "../../models/VisionBoardModel";

export interface VisionBoardItemEntity {
  id: string;
  type: "image" | "quote" | "icon";
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VisionBoardEntity {
  id: string;
  userId: string;
  name: string;
  year: string;
  items: VisionBoardItemEntity[];
  goalId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateVisionBoardData {
  userId: string;
  name: string;
  year: string;
  items: Omit<VisionBoardItemEntity, "id">[];
  goalId?: string;
}

export interface UpdateVisionBoardData {
  name?: string;
  year?: string;
  items?: Omit<VisionBoardItemEntity, "id">[];
  goalId?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mongoose lean/toObject output is loosely typed
function mapItem(doc: any): VisionBoardItemEntity {
  return {
    id: doc._id.toString(),
    type: doc.type,
    content: doc.content,
    x: doc.x,
    y: doc.y,
    width: doc.width,
    height: doc.height,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mongoose lean/toObject output is loosely typed
function mapVisionBoard(doc: any): VisionBoardEntity {
  return {
    id: doc._id.toString(),
    userId: doc.userId,
    name: doc.name,
    year: doc.year,
    items: (doc.items ?? []).map(mapItem),
    goalId: doc.goalId ?? undefined,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class MongoVisionBoardRepository {
  async createVisionBoard(data: CreateVisionBoardData): Promise<VisionBoardEntity> {
    const doc = await VisionBoardModel.create({
      userId: data.userId,
      name: data.name,
      year: data.year,
      items: data.items,
      goalId: data.goalId,
    });

    return mapVisionBoard(doc.toObject());
  }

  async getVisionBoardById(id: string): Promise<VisionBoardEntity | null> {
    const doc = await VisionBoardModel.findById(id).lean();
    return doc ? mapVisionBoard(doc) : null;
  }

  async getVisionBoardsByUserId(userId: string): Promise<VisionBoardEntity[]> {
    const docs = await VisionBoardModel.find({ userId }).sort({ createdAt: -1 }).lean();
    return docs.map(mapVisionBoard);
  }

  async updateVisionBoard(id: string, updates: UpdateVisionBoardData): Promise<VisionBoardEntity | null> {
    const doc = await VisionBoardModel.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true },
    ).lean();

    return doc ? mapVisionBoard(doc) : null;
  }

  async deleteVisionBoard(id: string): Promise<boolean> {
    const result = await VisionBoardModel.findByIdAndDelete(id).lean();
    return result !== null;
  }
}
