import mongoose from "mongoose";

import { env } from "./env";

export async function connectMongo(): Promise<void> {
  try {
    await mongoose.connect(env.MONGODB_URI, {
      autoIndex: true,
      maxPoolSize: 20,
      serverSelectionTimeoutMS: 10_000,
    });
    // eslint-disable-next-line no-console
    console.log("[mongo] Connected to MongoDB Atlas");
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[mongo] Failed to connect MongoDB Atlas", error);
    throw error;
  }
}
