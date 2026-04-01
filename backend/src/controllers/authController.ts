import type { Request, Response } from "express";

import { authService } from "../services/authService";
import { ApiError } from "../utils/apiError";
import { successResponse } from "../utils/apiResponse";
import { requireAuthUser } from "./controllerHelpers";

const FORBIDDEN_PATCH_FIELDS = [
  "role",
  "firebaseUid",
  "email",
  "id",
  "_id",
  "createdAt",
  "updatedAt",
] as const;

export async function bootstrapProfile(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const profile = await authService.findOrCreateUser(user.uid, user.email ?? "", user.name);
  res.status(200).json(successResponse(profile));
}

export async function getProfile(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const profile = await authService.getUserByFirebaseUid(user.uid);
  if (!profile) {
    throw new ApiError(
      404,
      "User profile not found. Call POST /api/auth/profile to bootstrap.",
    );
  }
  res.status(200).json(successResponse(profile));
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const body = req.body as Record<string, unknown>;

  for (const field of FORBIDDEN_PATCH_FIELDS) {
    if (field in body) {
      throw new ApiError(400, `Field '${field}' cannot be updated via this endpoint.`);
    }
  }

  const allowed: {
    displayName?: string;
    avatarUrl?: string | null;
    locale?: string;
    onboardingCompletedAt?: Date | null;
  } = {};

  if ("displayName" in body) {
    const val = body.displayName;
    if (typeof val !== "string") {
      throw new ApiError(400, "displayName must be a string.");
    }
    allowed.displayName = val.trim().slice(0, 100);
  }

  if ("avatarUrl" in body) {
    const val = body.avatarUrl;
    if (val !== null && typeof val !== "string") {
      throw new ApiError(400, "avatarUrl must be a string or null.");
    }
    allowed.avatarUrl = val === null ? null : (val as string).trim().slice(0, 500);
  }

  if ("locale" in body) {
    const val = body.locale;
    if (typeof val !== "string") {
      throw new ApiError(400, "locale must be a string.");
    }
    allowed.locale = val.trim().slice(0, 10);
  }

  if ("onboardingCompletedAt" in body) {
    const val = body.onboardingCompletedAt;
    if (val === null) {
      allowed.onboardingCompletedAt = null;
    } else if (typeof val === "string") {
      const parsed = new Date(val);
      if (Number.isNaN(parsed.getTime())) {
        throw new ApiError(
          400,
          "onboardingCompletedAt must be a valid ISO 8601 date or null.",
        );
      }
      allowed.onboardingCompletedAt = parsed;
    } else {
      throw new ApiError(
        400,
        "onboardingCompletedAt must be a valid ISO 8601 date or null.",
      );
    }
  }

  if (Object.keys(allowed).length === 0) {
    // No recognised updatable fields in the body — return current profile unchanged.
    const profile = await authService.getUserByFirebaseUid(user.uid);
    if (!profile) {
      throw new ApiError(404, "User profile not found.");
    }
    res.status(200).json(successResponse(profile));
    return;
  }

  const profile = await authService.updateUserProfile(user.uid, allowed);
  if (!profile) {
    throw new ApiError(404, "User profile not found.");
  }
  res.status(200).json(successResponse(profile));
}
