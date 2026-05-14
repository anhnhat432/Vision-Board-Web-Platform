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
  termsAcceptedAt: Date | null;
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
  termsAcceptedAt?: Date | null;
}

function getDisplayName(displayName: string, email: string): string {
  const trimmedDisplayName = displayName.trim();
  if (trimmedDisplayName) return trimmedDisplayName;

  const emailName = email.split("@")[0]?.replace(/[._-]+/g, " ").trim();
  return emailName || "User";
}

function getConfiguredAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? "";
  return new Set(
    raw
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

function isConfiguredAdminEmail(email: string): boolean {
  return getConfiguredAdminEmails().has(email.trim().toLowerCase());
}

function mapUser(doc: {
  _id: Types.ObjectId;
  firebaseUid: string;
  email: string;
  displayName: string;
  role: string;
  onboardingCompletedAt?: Date | null;
  termsAcceptedAt?: Date | null;
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
    termsAcceptedAt: doc.termsAcceptedAt ?? null,
    avatarUrl: doc.avatarUrl ?? null,
    locale: doc.locale,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class MongoUserRepository {
  async findOrCreate(uid: string, email: string, displayName: string): Promise<UserEntity> {
    const normalizedEmail = email.toLowerCase().trim();
    if (!normalizedEmail) {
      throw new ApiError(
        400,
        "Authenticated user email is required to create a profile.",
        undefined,
        "missing_auth_email",
      );
    }

    const shouldPromoteToAdmin = isConfiguredAdminEmail(normalizedEmail);
    const setFields: Record<string, unknown> = {
      email: normalizedEmail,
      displayName: getDisplayName(displayName, normalizedEmail),
    };
    const setOnInsertFields: Record<string, unknown> = {
      onboardingCompletedAt: null,
      termsAcceptedAt: null,
      avatarUrl: null,
      locale: "vi",
    };

    if (shouldPromoteToAdmin) {
      setFields.role = "admin";
    } else {
      setOnInsertFields.role = "user";
    }

    const doc = await UserModel.findOneAndUpdate(
      { firebaseUid: uid },
      {
        $setOnInsert: setOnInsertFields,
        $set: setFields,
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
