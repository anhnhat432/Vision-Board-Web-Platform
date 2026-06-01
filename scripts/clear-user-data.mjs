import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/vision_board";
const TARGET_USER_ID = "uFmoWjtUdlhQyAMtHL9h9FyDz0F2";

async function main() {
  console.log(`Connecting to MongoDB at ${MONGODB_URI}...`);
  await mongoose.connect(MONGODB_URI);
  console.log("Connected successfully.");

  const collections = [
    "goals",
    "tasks",
    "dailycheckins",
    "weeks",
    "weekreviews",
    "visionboards",
  ];

  const db = mongoose.connection.db;

  for (const name of collections) {
    try {
      const collection = db.collection(name);
      console.log(`Clearing records for userId "${TARGET_USER_ID}" in collection "${name}"...`);
      const result = await collection.deleteMany({ userId: TARGET_USER_ID });
      console.log(`Deleted ${result.deletedCount} documents from "${name}".`);
    } catch (error) {
      console.error(`Failed to clear collection "${name}":`, error);
    }
  }

  // Cập nhật trường onboardingCompleted thành false trong collection users
  try {
    const usersCollection = db.collection("users");
    console.log(`Resetting user status for "${TARGET_USER_ID}"...`);
    // Trong model backend, user _id có thể là chuỗi uFmoWjtUdlhQyAMtHL9h9FyDz0F2 hoặc Object
    await usersCollection.updateOne(
      { $or: [{ _id: TARGET_USER_ID }, { id: TARGET_USER_ID }, { firebaseUid: TARGET_USER_ID }] },
      { $set: { onboardingCompleted: false, currentWheelOfLife: [] } }
    );
    console.log("Reset user profile onboarding state.");
  } catch (error) {
    console.error("Failed to reset user status:", error);
  }

  await mongoose.disconnect();
  console.log("Disconnected from MongoDB. Cleanup complete!");
}

main().catch(console.error);
