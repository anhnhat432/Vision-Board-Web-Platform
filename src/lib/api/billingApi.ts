/**
 * Frontend billing API client for server-authoritative entitlements.
 *
 * In real mode + authenticated: fetches entitlements from the backend
 * GET /api/billing/entitlement endpoint.
 *
 * In demo mode: returns null (caller should use local/mock entitlements).
 *
 * On failure: returns null (caller should NOT unlock premium).
 * This is a security-safe fallback — backend failure = no premium access.
 */

import { apiClient } from "@/lib/api/apiClient";
import { isDemoMode } from "@/app/utils/app-mode";
import type { EntitlementKey, PricingPlanCode } from "@/app/utils/storage-types";

export interface ServerEntitlementSnapshot {
  planCode: PricingPlanCode;
  status: string;
  entitlements: EntitlementKey[];
  source: string;
  currentPeriodEnd?: string | null;
  resolvedAt: string;
}

/**
 * Fetches the server-authoritative entitlement snapshot.
 *
 * @returns The snapshot if successful, or null if:
 *   - App is in demo mode (caller should use local/mock).
 *   - User is not authenticated (no token available).
 *   - Backend request fails (safe fallback = no premium).
 */
export async function fetchServerEntitlement(): Promise<ServerEntitlementSnapshot | null> {
  // Demo mode: never call the backend for entitlements.
  if (isDemoMode()) return null;

  try {
    const data = await apiClient.get<ServerEntitlementSnapshot>("/billing/entitlement");
    if (!data || typeof data !== "object") return null;

    // Validate minimum required fields.
    if (typeof data.planCode !== "string" || !Array.isArray(data.entitlements)) {
      return null;
    }

    return data;
  } catch {
    // Backend failure: do NOT unlock premium.
    // The caller should keep the user on their current local state
    // or default to FREE if no local state exists.
    return null;
  }
}

/**
 * Returns true if the server snapshot indicates active premium access.
 * Returns false if the snapshot is null (demo mode / offline / error).
 */
export function hasServerPremiumAccess(snapshot: ServerEntitlementSnapshot | null): boolean {
  if (!snapshot) return false;
  return snapshot.planCode !== "FREE" && snapshot.entitlements.length > 0;
}

/**
 * Checks if a specific entitlement key is present in the server snapshot.
 * Returns false if the snapshot is null (safe fallback).
 */
export function hasServerEntitlement(snapshot: ServerEntitlementSnapshot | null, key: EntitlementKey): boolean {
  if (!snapshot) return false;
  return snapshot.entitlements.includes(key);
}
