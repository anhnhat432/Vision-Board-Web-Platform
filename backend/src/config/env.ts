import dotenv from "dotenv";

dotenv.config();

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function parsePort(rawPort: string | undefined): number {
  if (!rawPort) return 4000;

  const parsed = Number.parseInt(rawPort, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("PORT must be a positive integer.");
  }

  return parsed;
}

const rawPrivateKey = getRequiredEnv("FIREBASE_PRIVATE_KEY");

export const env = {
  PORT: parsePort(process.env.PORT),
  MONGODB_URI: getRequiredEnv("MONGODB_URI"),
  FIREBASE_PROJECT_ID: getRequiredEnv("FIREBASE_PROJECT_ID"),
  FIREBASE_CLIENT_EMAIL: getRequiredEnv("FIREBASE_CLIENT_EMAIL"),
  FIREBASE_PRIVATE_KEY: rawPrivateKey.replace(/\\n/g, "\n"),
  FRONTEND_ORIGIN: getRequiredEnv("FRONTEND_ORIGIN"),
};

export type Env = typeof env;
