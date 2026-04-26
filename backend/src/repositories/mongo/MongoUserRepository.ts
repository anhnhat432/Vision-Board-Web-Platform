import type { Types } from "mongoose";

import { UserModel } from "../../models/UserModel";
import { ApiError } from "../../utils/apiError";

export interface UserEntity {
  id: string;
  firebaseUid: string;
  email: string;
  displayName: string;
  role: "user" | "admin";
  onboardingCompletedAt: Date | null;
  avatarUrl: string | null;
  locale: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateUserData {
  displayName?: string;
  avatarUrl?: string | null;
  locale?: string;
  onboardingCompletedAt?: Date | null;
}

function getDisplayName(displayName: string, email: string): string {
  const trimmedDisplayName = displayName.trim();
  if (trimmedDisplayName) return trimmedDisplayName;

  const emailName = email.split("@")[0]?.replace(/[._-]+/g, " ").trim();
  return emailName || "User";
}

function mapUser(doc: {
  _id: Types.ObjectId;
  firebaseUid: string;
  email: string;
  displayName: string;
  role: string;
  onboardingCompletedAt?: Date | null;
  avatarUrl?: string | null;
  locale: string;
  createdAt: Date;
  updatedAt: Date;
}): UserEntity {
  return {
    id: doc._id.toString(),
    firebaseUid: doc.firebaseUid,
    email: doc.email,
    displayName: doc.displayName,
    role: doc.role as "user" | "admin",
    onboardingCompletedAt: doc.onboardingCompletedAt ?? null,
    avatarUrl: doc.avatarUrl ?? null,
    locale: doc.locale,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class MongoUserRepository {
  async findOrCreate(uid: string, email: string, displayName: string): Promise<UserEntity> {
    const normalizedEmail = email.toLowerCase().trim();
    const doc = await UserModel.findOneAndUpdate(
      { firebaseUid: uid },
      {
        $setOnInsert: {
          role: "user",
          onboardingCompletedAt: null,
          avatarUrl: null,
          locale: "vi",
        },
        $set: {
          email: normalizedEmail,
          displayName: getDisplayName(displayName, normalizedEmail),
        },
      },
      { upsert: true, new: true, runValidators: true },
    ).lean();

    if (!doc) {
      throw new ApiError(500, "Failed to find or create user.");
    }

    return mapUser(doc);
  }

  async findByFirebaseUid(uid: string): Promise<UserEntity | null> {
    const doc = await UserModel.findOne({ firebaseUid: uid }).lean();
    return doc ? mapUser(doc) : null;
  }

  async updateByFirebaseUid(uid: string, updates: UpdateUserData): Promise<UserEntity | null> {
    const doc = await UserModel.findOneAndUpdate(
      { firebaseUid: uid },
      { $set: updates },
      { new: true, runValidators: true },
    ).lean();
    return doc ? mapUser(doc) : null;
  }
}
