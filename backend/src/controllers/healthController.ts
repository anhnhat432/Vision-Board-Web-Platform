import type { Request, Response } from "express";
import mongoose from "mongoose";

import { getLastPaymentReconciliationRun, getPaymentReconciliationConsecutiveFailures } from "../jobs/reconciliationJob";
import { successResponse } from "../utils/apiResponse";

const BILLING_RECONCILIATION_STALE_MS = 10 * 60 * 1000;

function hasEnvValue(name: string): boolean {
  return Boolean(process.env[name]?.trim());
}

function getBillingCassoHealth(): "ok" | "degraded" {
  const hasWebhookSecret = [
    "CASSO_WEBHOOK_SECRET",
    "CASSO_WEBHOOK_CHECKSUM_KEY",
    "CASSO_CHECKSUM_KEY",
    "CASSO_SECURE_TOKEN",
  ].some(hasEnvValue);
  const hasBankConfig = ["CASSO_BANK_ACCOUNT", "CASSO_BANK_NAME", "CASSO_ACCOUNT_NAME"].every(hasEnvValue);
  return hasWebhookSecret && hasBankConfig ? "ok" : "degraded";
}

function getBillingReconciliationHealth(): "ok" | "stale" {
  if (!["CASSO_API_KEY", "CASSO_ACCESS_TOKEN"].some(hasEnvValue)) return "stale";
  if (getPaymentReconciliationConsecutiveFailures() > 2) return "stale";

  const lastRun = getLastPaymentReconciliationRun();
  if (!lastRun) return "stale";

  const finishedAt = new Date(lastRun.finishedAt).getTime();
  if (!Number.isFinite(finishedAt)) return "stale";
  return Date.now() - finishedAt <= BILLING_RECONCILIATION_STALE_MS ? "ok" : "stale";
}

function getDbHealth(): "ok" | "degraded" {
  return mongoose.connection.readyState === 1 ? "ok" : "degraded";
}

export function healthController(_req: Request, res: Response): void {
  res.status(200).json(
    successResponse({
      status: "ok",
      service: "vision-board-backend",
      timestamp: new Date().toISOString(),
    }),
  );
}

export function billingHealthController(_req: Request, res: Response): void {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  const payload = {
    casso: getBillingCassoHealth(),
    reconciliation: getBillingReconciliationHealth(),
    db: getDbHealth(),
  };
  const httpStatus = payload.db === "ok" ? 200 : 503;
  res.status(httpStatus).json(payload);
}
