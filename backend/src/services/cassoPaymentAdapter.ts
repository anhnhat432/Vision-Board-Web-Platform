/**
 * Casso + VietQR Payment Provider Adapter
 *
 * Uses Casso (https://casso.vn) to detect incoming bank transfers
 * and VietQR (https://vietqr.io) to generate QR codes.
 *
 * Flow:
 * 1. createCheckoutSession → creates a PaymentOrder + VietQR URL
 * 2. User scans QR → transfers money with orderId as description
 * 3. Casso webhook fires → verifyWebhookSignature + parseWebhookEvent
 * 4. webhookController upserts subscription via BillingService
 *
 * Env vars required:
 *   CASSO_WEBHOOK_SECRET — shared secret for webhook signature
 *   CASSO_BANK_ACCOUNT   — receiving bank account number
 *   CASSO_BANK_NAME      — bank short name (e.g. "MB", "VCB", "TCB")
 *   CASSO_ACCOUNT_NAME   — account holder name
 *   PLUS_PRICE_VND       — price in VND (e.g. "79000")
 */

import { createHash, randomBytes } from "node:crypto";
import type {
  CheckoutSessionResult,
  CreateCheckoutSessionInput,
  NormalizedProviderEvent,
  PaymentProviderAdapter,
  WebhookVerificationInput,
  WebhookVerificationResult,
} from "./paymentProviderAdapter";
import { PaymentProviderNotConfiguredError } from "./paymentProviderAdapter";
import type { BillingSubscriptionStatus } from "./billingService";
import { PaymentOrderModel } from "../models/PaymentOrderModel";

// ─── VietQR Bank BIN mapping ────────────────────────────────────────────────

const BANK_BIN_MAP: Record<string, string> = {
  MB: "970422",
  VCB: "970436",
  TCB: "970407",
  ACB: "970416",
  BIDV: "970418",
  VPB: "970432",
  TPB: "970423",
  STB: "970403",
  VIB: "970441",
  MSB: "970426",
  SHB: "970443",
  OCB: "970448",
  HDBank: "970437",
  LPB: "970449",
  SCB: "970429",
  Eximbank: "970431",
  ABBANK: "970425",
  BVBank: "970438",
  SeABank: "970440",
  NamABank: "970428",
  PGBank: "970430",
  Saigonbank: "970400",
  BaoVietBank: "970438",
  NCB: "970419",
  VietABank: "970427",
  KienLongBank: "970452",
};

// ─── Config ─────────────────────────────────────────────────────────────────

function getCassoConfig() {
  return {
    webhookSecret: process.env.CASSO_WEBHOOK_SECRET?.trim() ?? "",
    bankAccount: process.env.CASSO_BANK_ACCOUNT?.trim() ?? "",
    bankName: process.env.CASSO_BANK_NAME?.trim().toUpperCase() ?? "",
    accountName: process.env.CASSO_ACCOUNT_NAME?.trim() ?? "",
    plusPriceVnd: Number.parseInt(process.env.PLUS_PRICE_VND?.trim() ?? "79000", 10),
  };
}

function isCassoConfigured(): boolean {
  const config = getCassoConfig();
  return (
    config.webhookSecret.length > 0 &&
    config.bankAccount.length > 0 &&
    config.bankName.length > 0 &&
    config.accountName.length > 0
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const ORDER_ID_PREFIX = "VB";
const ORDER_ID_LENGTH = 8;
const ORDER_ID_REGEX = /VB[A-Z0-9]{8}/i;
const ORDER_EXPIRY_MINUTES = 30;
const TWELVE_WEEKS_MS = 12 * 7 * 24 * 60 * 60 * 1000;

function generateOrderId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(ORDER_ID_LENGTH);
  let result = ORDER_ID_PREFIX;
  for (let i = 0; i < ORDER_ID_LENGTH; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

function buildVietQrUrl(
  bankBin: string,
  accountNo: string,
  amount: number,
  description: string,
  accountName: string,
): string {
  const base = `https://img.vietqr.io/image/${bankBin}-${accountNo}-compact2.png`;
  const params = new URLSearchParams({
    amount: String(amount),
    addInfo: description,
    accountName,
  });
  return `${base}?${params.toString()}`;
}

function extractOrderIdFromDescription(description: string): string | null {
  const match = description.match(ORDER_ID_REGEX);
  return match ? match[0].toUpperCase() : null;
}

// ─── Casso webhook payload types ────────────────────────────────────────────

interface CassoTransaction {
  id: number;
  tid?: string;
  reference?: string;
  description: string;
  amount: number;
  cusum_balance?: number;
  when: string;
  bank_sub_acc_id?: string;
}

interface CassoWebhookPayload {
  error: number;
  data: CassoTransaction[];
}

// ─── Adapter ────────────────────────────────────────────────────────────────

export function createCassoPaymentAdapter(): PaymentProviderAdapter {
  return {
    providerId: "casso",
    isConfigured: isCassoConfigured(),

    async createCheckoutSession(
      input: CreateCheckoutSessionInput,
    ): Promise<CheckoutSessionResult> {
      if (!isCassoConfigured()) {
        throw new PaymentProviderNotConfiguredError("casso");
      }

      const config = getCassoConfig();
      if (!Number.isFinite(config.plusPriceVnd) || config.plusPriceVnd < 1000) {
        throw new PaymentProviderNotConfiguredError("casso");
      }

      const bankBin = BANK_BIN_MAP[config.bankName] ?? config.bankName;
      const orderId = generateOrderId();
      const amount = config.plusPriceVnd;
      const now = new Date();
      const expiresAt = new Date(now.getTime() + ORDER_EXPIRY_MINUTES * 60 * 1000);

      const qrDataUrl = buildVietQrUrl(
        bankBin,
        config.bankAccount,
        amount,
        orderId,
        config.accountName,
      );

      await PaymentOrderModel.create({
        orderId,
        userId: input.userId,
        planCode: input.planCode,
        billingCycle: "twelve_week",
        amount,
        currency: "VND",
        status: "pending",
        provider: "casso",
        bankAccount: config.bankAccount,
        bankName: config.bankName,
        accountName: config.accountName,
        description: orderId,
        qrDataUrl,
        expiresAt,
      });

      return {
        sessionId: orderId,
        checkoutUrl: qrDataUrl,
        expiresAt: expiresAt.toISOString(),
      };
    },

    verifyWebhookSignature(
      input: WebhookVerificationInput,
    ): WebhookVerificationResult {
      const config = getCassoConfig();
      if (!config.webhookSecret) {
        return { valid: false, reason: "CASSO_WEBHOOK_SECRET not configured." };
      }

      const headerToken =
        (input.headers["secure-token"] as string) ??
        (input.headers["Secure-Token"] as string) ??
        "";

      if (headerToken === config.webhookSecret) {
        return { valid: true };
      }

      return { valid: false, reason: "Secure-Token header does not match." };
    },

    parseWebhookEvent(rawBody: Buffer | string): NormalizedProviderEvent {
      const body = typeof rawBody === "string" ? rawBody : rawBody.toString("utf-8");
      const parsed: CassoWebhookPayload = JSON.parse(body);
      const hash = createHash("sha256").update(body).digest("hex");

      // Casso sends an array of transactions; we process the first one that matches
      const transactions = parsed.data ?? [];
      const matchedTx = transactions.find((tx) => {
        const extracted = extractOrderIdFromDescription(tx.description ?? "");
        return extracted !== null && tx.amount > 0;
      });

      if (!matchedTx) {
        return {
          provider: "casso",
          providerEventId: `casso_unknown_${Date.now()}`,
          eventType: "unknown",
          rawEventType: "casso.transaction.no_match",
          payloadHash: hash,
          userId: "",
          planCode: "FREE",
          status: "incomplete",
        };
      }

      const orderId = extractOrderIdFromDescription(matchedTx.description)!;

      return {
        provider: "casso",
        providerEventId: `casso_${matchedTx.id ?? matchedTx.tid ?? Date.now()}`,
        eventType: "checkout_completed",
        rawEventType: "casso.transaction.in",
        payloadHash: hash,
        userId: "", // Will be resolved from PaymentOrder in webhook handler
        planCode: "PLUS",
        status: "active",
        billingCycle: "twelve_week",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + TWELVE_WEEKS_MS),
        providerSubscriptionId: orderId,
      };
    },

    mapSubscriptionStatus(
      providerStatus: string,
    ): BillingSubscriptionStatus | null {
      if (providerStatus === "active" || providerStatus === "completed") return "active";
      if (providerStatus === "pending") return "incomplete";
      if (providerStatus === "expired" || providerStatus === "failed") return "canceled";
      return null;
    },
  };
}

// ─── Exported helpers for webhook controller ────────────────────────────────

export { extractOrderIdFromDescription, ORDER_ID_REGEX };
export type { CassoTransaction, CassoWebhookPayload };
