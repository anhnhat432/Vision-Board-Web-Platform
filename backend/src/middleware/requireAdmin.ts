import type { NextFunction, Request, Response } from "express";

import { requireAuthUser } from "../controllers/controllerHelpers";
import { UserModel } from "../models/UserModel";
import { ApiError } from "../utils/apiError";

const ADMIN_ROLE_CACHE_TTL_MS = 5 * 60 * 1000;
const ADMIN_ROLE_QUERY_TIMEOUT_MS = 5_000;

type UserRole = "user" | "admin";

interface RoleCacheEntry {
  role: UserRole;
  expiresAt: number;
}

const roleCache = new Map<string, RoleCacheEntry>();

type RoleQueryChain = {
  select?: (fields: string) => RoleQueryChain;
  maxTimeMS?: (ms: number) => RoleQueryChain;
  lean: <T>() => Promise<T>;
};

function getCachedRole(uid: string): UserRole | null {
  const cached = roleCache.get(uid);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    roleCache.delete(uid);
    return null;
  }

  return cached.role;
}

function setCachedRole(uid: string, role: UserRole): void {
  roleCache.set(uid, {
    role,
    expiresAt: Date.now() + ADMIN_ROLE_CACHE_TTL_MS,
  });
}

export function clearAdminRoleCache(uid?: string): void {
  if (uid) {
    roleCache.delete(uid);
    return;
  }

  roleCache.clear();
}

export async function requireAdmin(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authUser = requireAuthUser(req);
    const claimRole = req.firebaseToken?.role ?? req.user?.role;

    if (claimRole === "admin") {
      setCachedRole(authUser.uid, "admin");
      next();
      return;
    }

    const cachedRole = getCachedRole(authUser.uid);
    if (cachedRole === "admin") {
      next();
      return;
    }
    if (cachedRole === "user") {
      next(new ApiError(403, "Forbidden."));
      return;
    }

    let query = UserModel.findOne({ firebaseUid: authUser.uid }) as unknown as RoleQueryChain;
    query = query.select?.("role") ?? query;
    query = query.maxTimeMS?.(ADMIN_ROLE_QUERY_TIMEOUT_MS) ?? query;
    const user = await query.lean<{ role?: UserRole } | null>();
    const role = user?.role === "admin" ? "admin" : "user";
    setCachedRole(authUser.uid, role);

    if (role !== "admin") {
      next(new ApiError(403, "Forbidden."));
      return;
    }

    next();
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
      return;
    }
    next(new ApiError(500, "Internal server error."));
  }
}
