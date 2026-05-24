import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { UserProfile } from "@/types/api";

import { clearCachedUserProfile, readCachedUserProfile, writeCachedUserProfile } from "./userProfileCache";

const FIXED_NOW = 1_716_525_000_000;

const sampleProfile: UserProfile = {
  id: "profile_1",
  firebaseUid: "uid-1",
  email: "user@example.com",
  displayName: "User",
  role: "user",
  onboardingCompletedAt: null,
  termsAcceptedAt: null,
  avatarUrl: null,
  locale: "vi",
  createdAt: "2026-05-24T00:00:00.000Z",
  updatedAt: "2026-05-24T00:00:00.000Z",
};

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  window.localStorage.clear();
});

describe("userProfileCache", () => {
  it("returns null when no cache exists", () => {
    expect(readCachedUserProfile("uid-1")).toBeNull();
  });

  it("round-trips a profile and returns it before TTL expires", () => {
    writeCachedUserProfile(sampleProfile, { now: FIXED_NOW });

    const cached = readCachedUserProfile("uid-1", FIXED_NOW + 60_000);
    expect(cached).toEqual(sampleProfile);
  });

  it("returns null and removes the entry when TTL has expired", () => {
    writeCachedUserProfile(sampleProfile, { now: FIXED_NOW, ttlMs: 1_000 });

    const cached = readCachedUserProfile("uid-1", FIXED_NOW + 5_000);
    expect(cached).toBeNull();
    // Entry should be cleaned up
    expect(window.localStorage.getItem("auth:profile-cache:uid-1")).toBeNull();
  });

  it("ignores cache for a different uid", () => {
    writeCachedUserProfile(sampleProfile, { now: FIXED_NOW });

    expect(readCachedUserProfile("uid-2", FIXED_NOW + 60_000)).toBeNull();
  });

  it("ignores corrupted cache entries", () => {
    window.localStorage.setItem("auth:profile-cache:uid-1", "{not json");
    expect(readCachedUserProfile("uid-1")).toBeNull();
  });

  it("ignores cache where envelope shape is wrong", () => {
    window.localStorage.setItem(
      "auth:profile-cache:uid-1",
      JSON.stringify({ profile: sampleProfile }),
    );
    expect(readCachedUserProfile("uid-1")).toBeNull();
  });

  it("does not return cache when firebaseUid mismatches the requested uid", () => {
    writeCachedUserProfile(sampleProfile, { now: FIXED_NOW });
    expect(readCachedUserProfile("uid-other", FIXED_NOW + 1_000)).toBeNull();
  });

  it("clears cache for a given uid", () => {
    writeCachedUserProfile(sampleProfile, { now: FIXED_NOW });
    clearCachedUserProfile("uid-1");
    expect(readCachedUserProfile("uid-1", FIXED_NOW + 1_000)).toBeNull();
  });
});
