/**
 * Seed 10 fake users into Firebase Auth + MongoDB.
 *
 * Usage:
 *   cd backend
 *   node scripts/seed-fake-users.mjs
 *
 * Each user is created in Firebase Auth (email/password) and upserted into
 * the MongoDB `users` collection. If a user with the same email already exists
 * in Firebase, the script skips creation and reuses the existing UID.
 *
 * Default password for all seeded accounts: FakeUser@2026
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import admin from "firebase-admin";
import dotenv from "dotenv";
import mongoose from "mongoose";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const mongoUri = process.env.MONGODB_URI?.trim();
const firebaseProjectId = process.env.FIREBASE_PROJECT_ID?.trim();
const firebaseClientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
const firebasePrivateKey = process.env.FIREBASE_PRIVATE_KEY?.trim()?.replace(/\\n/g, "\n");

if (!mongoUri) {
  console.error("❌ Missing MONGODB_URI in .env");
  process.exit(1);
}
if (!firebaseProjectId || !firebaseClientEmail || !firebasePrivateKey) {
  console.error("❌ Missing Firebase config (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) in .env");
  process.exit(1);
}

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: firebaseProjectId,
      clientEmail: firebaseClientEmail,
      privateKey: firebasePrivateKey,
    }),
  });
}
const adminAuth = admin.auth();

// ---------------------------------------------------------------------------
// MongoDB User schema (mirrors UserModel.ts)
// ---------------------------------------------------------------------------

const userSchema = new mongoose.Schema(
  {
    firebaseUid: { type: String, required: true, unique: true, index: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    displayName: { type: String, required: true, default: "", trim: true },
    role: { type: String, enum: ["user", "admin"], required: true, default: "user" },
    onboardingCompletedAt: { type: Date, required: false, default: null },
    termsAcceptedAt: { type: Date, required: false, default: null },
    avatarUrl: { type: String, required: false, default: null, trim: true },
    locale: { type: String, required: true, default: "vi", trim: true },
  },
  { timestamps: true },
);

const UserModel = mongoose.models.User || mongoose.model("User", userSchema);

// ---------------------------------------------------------------------------
// 10 Fake users — diverse Vietnamese user profiles
// ---------------------------------------------------------------------------

const DEFAULT_PASSWORD = "Fpt@123456";

const FAKE_USERS = [
  // 1. Sinh viên năm 3 — đã onboarding, dùng tích cực
  {
    email: "pixelnova48@gmail.com",
    displayName: "Nguyễn Quốc Anh",
    avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=An",
    locale: "vi",
    onboardingCompletedAt: new Date("2026-05-01T08:30:00Z"),
    termsAcceptedAt: new Date("2026-05-01T08:25:00Z"),
  },
  // 2. Nữ nhân viên văn phòng — mới đăng ký, chưa onboarding
  {
    email: "orbitlane93@gmail.com",
    displayName: "Trần Thị Mai",
    avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=Mai",
    locale: "vi",
    onboardingCompletedAt: null,
    termsAcceptedAt: new Date("2026-06-10T14:00:00Z"),
  },
  // 3. Freelancer designer — dùng tiếng Anh
  {
    email: "logicmango72@gmail.com",
    displayName: "Lê Minh",
    avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=Minh",
    locale: "en",
    onboardingCompletedAt: new Date("2026-04-15T10:00:00Z"),
    termsAcceptedAt: new Date("2026-04-15T09:55:00Z"),
  },
  // 4. Quản lý dự án — onboarded, dùng thường xuyên
  {
    email: "urbanquartz56@gmail.com",
    displayName: "Phạm Đức Trung",
    avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=Trung",
    locale: "vi",
    onboardingCompletedAt: new Date("2026-03-20T07:00:00Z"),
    termsAcceptedAt: new Date("2026-03-20T06:55:00Z"),
  },
  // 5. Sinh viên mới tốt nghiệp — chưa chấp nhận terms
  {
    email: "emeraldforest97@gmail.com",
    displayName: "Hoàng Thuỳ Linh",
    avatarUrl: null,
    locale: "vi",
    onboardingCompletedAt: null,
    termsAcceptedAt: null,
  },
  // 6. Giáo viên — đã onboarding, có avatar
  {
    email: "forestpearl54@gmail.com",
    displayName: "Võ Thanh Hải",
    avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=Hai",
    locale: "vi",
    onboardingCompletedAt: new Date("2026-05-25T16:30:00Z"),
    termsAcceptedAt: new Date("2026-05-25T16:25:00Z"),
  },
  // 7. Nữ doanh nhân — dùng tiếng Anh, đã onboarding
  {
    email: "bichdnha180992@fpt.edu.vn",
    displayName: "Đặng Ngọc Bích",
    avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=Bich",
    locale: "en",
    onboardingCompletedAt: new Date("2026-02-14T09:00:00Z"),
    termsAcceptedAt: new Date("2026-02-14T08:55:00Z"),
  },
  // 8. Lập trình viên — mới đăng ký hôm nay
  {
    email: "duybui2003@gmail.com",
    displayName: "Bùi Quang Duy",
    avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=Duy",
    locale: "vi",
    onboardingCompletedAt: null,
    termsAcceptedAt: new Date("2026-06-16T07:00:00Z"),
  },
  // 9. Nhiếp ảnh gia — dùng lâu, có avatar custom
  {
    email: "kimchine@gmail.com",
    displayName: "Ngô Thị Kim Chi",
    avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=KimChi",
    locale: "vi",
    onboardingCompletedAt: new Date("2026-01-10T12:00:00Z"),
    termsAcceptedAt: new Date("2026-01-10T11:55:00Z"),
  },
  // 10. Sinh viên quốc tế — locale tiếng Anh, chưa onboarding
  {
    email: "thanhlamxinhiu@gmail.com",
    displayName: "Lý Thanh Lam",
    avatarUrl: null,
    locale: "en",
    onboardingCompletedAt: null,
    termsAcceptedAt: new Date("2026-06-12T20:00:00Z"),
  },
];

// ---------------------------------------------------------------------------
// Seed logic
// ---------------------------------------------------------------------------

async function getOrCreateFirebaseUser(email, password, displayName) {
  try {
    const existingUser = await adminAuth.getUserByEmail(email);
    console.log(`  ↳ Firebase: already exists (uid: ${existingUser.uid})`);
    return existingUser.uid;
  } catch (error) {
    if (error.code !== "auth/user-not-found") {
      throw error;
    }
  }

  const newUser = await adminAuth.createUser({
    email,
    password,
    displayName,
    emailVerified: true,
  });
  console.log(`  ↳ Firebase: created (uid: ${newUser.uid})`);
  return newUser.uid;
}

async function upsertMongoUser(uid, fakeUser) {
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
        role: "user",
      },
    },
    { upsert: true, new: true, runValidators: true },
  );
  console.log(`  ↳ MongoDB: upserted`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║     SEED 10 FAKE USERS                  ║");
  console.log("╚══════════════════════════════════════════╝");
  console.log(`\nPassword cho tất cả accounts: ${DEFAULT_PASSWORD}\n`);

  await mongoose.connect(mongoUri);
  console.log("[mongo] Connected to MongoDB Atlas\n");

  let created = 0;
  let skipped = 0;

  for (let i = 0; i < FAKE_USERS.length; i++) {
    const user = FAKE_USERS[i];
    console.log(`[${i + 1}/${FAKE_USERS.length}] ${user.displayName} <${user.email}>`);

    try {
      const uid = await getOrCreateFirebaseUser(user.email, DEFAULT_PASSWORD, user.displayName);
      await upsertMongoUser(uid, user);
      created++;
      console.log(`  ✅ Done\n`);
    } catch (error) {
      console.error(`  ❌ Failed:`, error.message || error);
      skipped++;
    }
  }

  console.log("╔══════════════════════════════════════════╗");
  console.log(`║  Created/Updated: ${String(created).padEnd(22)}║`);
  console.log(`║  Skipped (errors): ${String(skipped).padEnd(21)}║`);
  console.log(`║  Total:            ${String(FAKE_USERS.length).padEnd(21)}║`);
  console.log("╚══════════════════════════════════════════╝");
}

main()
  .catch((error) => {
    console.error("[seed-fake-users] Fatal error:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
