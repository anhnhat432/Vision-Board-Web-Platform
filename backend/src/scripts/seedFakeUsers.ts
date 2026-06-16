/**
 * Seed 10 fake users into Firebase Auth + MongoDB.
 *
 * Usage:
 *   cd backend
 *   npx ts-node src/scripts/seedFakeUsers.ts
 *
 * Each user is created in Firebase Auth (email/password) and upserted into
 * the MongoDB `users` collection. If a user with the same email already exists
 * in Firebase, the script skips creation and reuses the existing UID.
 *
 * Default password for all seeded accounts: FakeUser@2026
 */

import mongoose from "mongoose";

import { adminAuth } from "../config/firebase";
import { connectMongo } from "../config/mongo";
import { UserModel } from "../models/UserModel";

// ---------------------------------------------------------------------------
// Fake user data — 10 diverse Vietnamese users
// ---------------------------------------------------------------------------

interface FakeUser {
  email: string;
  displayName: string;
  password: string;
  avatarUrl: string | null;
  locale: string;
  /** If set, the user has completed onboarding at this date */
  onboardingCompletedAt: Date | null;
  /** If set, the user accepted the terms at this date */
  termsAcceptedAt: Date | null;
  role: "user" | "admin";
}

const DEFAULT_PASSWORD = "Fpt@123456";

const FAKE_USERS: FakeUser[] = [
  // 1. Sinh viên năm 3 — đã onboarding, dùng tích cực
  {
    email: "pixelnova48@gmail.com",
    displayName: "Nguyễn Quốc Anh",
    password: DEFAULT_PASSWORD,
    avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=An",
    locale: "vi",
    onboardingCompletedAt: new Date("2026-05-01T08:30:00Z"),
    termsAcceptedAt: new Date("2026-05-01T08:25:00Z"),
    role: "user",
  },
  // 2. Nữ nhân viên văn phòng — mới đăng ký, chưa onboarding
  {
    email: "orbitlane93@gmail.com",
    displayName: "Trần Thị Mai",
    password: DEFAULT_PASSWORD,
    avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=Mai",
    locale: "vi",
    onboardingCompletedAt: null,
    termsAcceptedAt: new Date("2026-06-10T14:00:00Z"),
    role: "user",
  },
  // 3. Freelancer designer — dùng tiếng Anh
  {
    email: "logicmango72@gmail.com",
    displayName: "Lê Minh",
    password: DEFAULT_PASSWORD,
    avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=Minh",
    locale: "en",
    onboardingCompletedAt: new Date("2026-04-15T10:00:00Z"),
    termsAcceptedAt: new Date("2026-04-15T09:55:00Z"),
    role: "user",
  },
  // 4. Quản lý dự án — onboarded, dùng thường xuyên
  {
    email: "phamductrung.fake@gmail.com",
    displayName: "Phạm Đức Trung",
    password: DEFAULT_PASSWORD,
    avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=Trung",
    locale: "vi",
    onboardingCompletedAt: new Date("2026-03-20T07:00:00Z"),
    termsAcceptedAt: new Date("2026-03-20T06:55:00Z"),
    role: "user",
  },
  // 5. Sinh viên mới tốt nghiệp — chưa chấp nhận terms
  {
    email: "hoangthuylinh.fake@gmail.com",
    displayName: "Hoàng Thuỳ Linh",
    password: DEFAULT_PASSWORD,
    avatarUrl: null,
    locale: "vi",
    onboardingCompletedAt: null,
    termsAcceptedAt: null,
    role: "user",
  },
  // 6. Giáo viên — đã onboarding, có avatar
  {
    email: "vothanhhai.fake@gmail.com",
    displayName: "Võ Thanh Hải",
    password: DEFAULT_PASSWORD,
    avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=Hai",
    locale: "vi",
    onboardingCompletedAt: new Date("2026-05-25T16:30:00Z"),
    termsAcceptedAt: new Date("2026-05-25T16:25:00Z"),
    role: "user",
  },
  // 7. Nữ doanh nhân — dùng tiếng Anh, đã onboarding
  {
    email: "dangngocbich.fake@gmail.com",
    displayName: "Đặng Ngọc Bích",
    password: DEFAULT_PASSWORD,
    avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=Bich",
    locale: "en",
    onboardingCompletedAt: new Date("2026-02-14T09:00:00Z"),
    termsAcceptedAt: new Date("2026-02-14T08:55:00Z"),
    role: "user",
  },
  // 8. Lập trình viên — mới đăng ký hôm nay
  {
    email: "buiquangduy.fake@gmail.com",
    displayName: "Bùi Quang Duy",
    password: DEFAULT_PASSWORD,
    avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=Duy",
    locale: "vi",
    onboardingCompletedAt: null,
    termsAcceptedAt: new Date("2026-06-16T07:00:00Z"),
    role: "user",
  },
  // 9. Nhiếp ảnh gia — dùng lâu, có avatar custom
  {
    email: "ngothikimchi.fake@gmail.com",
    displayName: "Ngô Thị Kim Chi",
    password: DEFAULT_PASSWORD,
    avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=KimChi",
    locale: "vi",
    onboardingCompletedAt: new Date("2026-01-10T12:00:00Z"),
    termsAcceptedAt: new Date("2026-01-10T11:55:00Z"),
    role: "user",
  },
  // 10. Sinh viên quốc tế — locale tiếng Anh, chưa onboarding
  {
    email: "lythanhlam.fake@gmail.com",
    displayName: "Lý Thanh Lam",
    password: DEFAULT_PASSWORD,
    avatarUrl: null,
    locale: "en",
    onboardingCompletedAt: null,
    termsAcceptedAt: new Date("2026-06-12T20:00:00Z"),
    role: "user",
  },
];

// ---------------------------------------------------------------------------
// Seed logic
// ---------------------------------------------------------------------------

async function getOrCreateFirebaseUser(
  email: string,
  password: string,
  displayName: string,
): Promise<string> {
  try {
    // Try to get existing user first
    const existingUser = await adminAuth.getUserByEmail(email);
    console.log(`  ↳ Firebase user already exists: ${existingUser.uid}`);
    return existingUser.uid;
  } catch (error: unknown) {
    const code = (error as { code?: string }).code;
    if (code !== "auth/user-not-found") {
      throw error;
    }
  }

  // Create new Firebase Auth user
  const newUser = await adminAuth.createUser({
    email,
    password,
    displayName,
    emailVerified: true,
  });
  console.log(`  ↳ Firebase user created: ${newUser.uid}`);
  return newUser.uid;
}

async function upsertMongoUser(uid: string, fakeUser: FakeUser): Promise<void> {
  await UserModel.findOneAndUpdate(
    { firebaseUid: uid },
    {
      $set: {
        email: fakeUser.email.toLowerCase().trim(),
        displayName: fakeUser.displayName,
        avatarUrl: fakeUser.avatarUrl,
        locale: fakeUser.locale,
        onboardingCompletedAt: fakeUser.onboardingCompletedAt,
        termsAcceptedAt: fakeUser.termsAcceptedAt,
        role: fakeUser.role,
      },
    },
    { upsert: true, new: true, runValidators: true },
  );
  console.log(`  ↳ MongoDB user upserted`);
}

async function seedAllUsers(): Promise<{ created: number; skipped: number }> {
  let created = 0;
  let skipped = 0;

  for (let i = 0; i < FAKE_USERS.length; i++) {
    const fakeUser = FAKE_USERS[i];
    console.log(`\n[${i + 1}/${FAKE_USERS.length}] ${fakeUser.displayName} <${fakeUser.email}>`);

    try {
      const uid = await getOrCreateFirebaseUser(
        fakeUser.email,
        fakeUser.password,
        fakeUser.displayName,
      );
      await upsertMongoUser(uid, fakeUser);
      created++;
      console.log(`  ✓ Done`);
    } catch (error) {
      console.error(`  ✗ Failed:`, error);
      skipped++;
    }
  }

  return { created, skipped };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("=== Seed Fake Users ===");
  console.log(`Password for all accounts: ${DEFAULT_PASSWORD}\n`);

  await connectMongo();

  const { created, skipped } = await seedAllUsers();

  console.log(`\n=== Summary ===`);
  console.log(`  Created/Updated: ${created}`);
  console.log(`  Skipped (errors): ${skipped}`);
  console.log(`  Total: ${FAKE_USERS.length}`);
}

const isMain = require.main === module;
if (isMain) {
  main()
    .catch((error) => {
      console.error("[seed-fake-users] Fatal error:", error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await mongoose.disconnect();
    });
}

export { FAKE_USERS, seedAllUsers };
