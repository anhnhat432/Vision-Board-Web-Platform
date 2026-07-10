/**
 * PayOS Payment Provider Adapter
 *
 * Uses the official @payos/node SDK to create hosted PayOS payment links.
 * Webhook checksums follow the SDK's documented verification algorithm:
 * HMAC-SHA256 over sorted webhook data using PAYOS_CHECKSUM_KEY.
 *
 * Important safety rules:
 * - Checkout creation never grants entitlements.
 * - Entitlements are granted only by the PayOS webhook controller after a
 *   verified successful webhook is matched to a pending local PaymentOrder.
 * - The backend kill-switch remains in billingController and is intentionally
 *   not bypassed here.
 */

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import {
  PayOS,
  type CreatePaymentLinkRequest,
  type CreatePaymentLinkResponse,
  type PaymentLinkStatus,
  type Webhook,
  type WebhookData,
} from "@payos/node";

import { PaymentOrderModel } from "../models/PaymentOrderModel";
import type { BillingSubscriptionStatus } from "./billingService";
import type { PayosPaymentLinkClient } from "./payosPayerReconciliation";
import type {
  CheckoutSessionResult,
  CreateCheckoutSessionInput,
  NormalizedEventType,
  NormalizedProviderEvent,
  PaymentProviderAdapter,
  WebhookVerificationInput,
  WebhookVerificationResult,
} from "./paymentProviderAdapter";
import { PaymentProviderError, PaymentProviderNotConfiguredError } from "./paymentProviderAdapter";

const ORDER_ID_PREFIX = "VB";
const ORDER_ID_LENGTH = 8;
const ORDER_ID_REGEX = /^VB[A-Z0-9]{8}$/i;
const ORDER_ID_IN_DESCRIPTION_REGEX = /VB[A-Z0-9]{8}/i;
const ORDER_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PAYOS_ORDER_CODE_OFFSET = 10_000_000_000;
const ORDER_EXPIRY_MINUTES = 30;
const CHECKOUT_SESSION_ID_PLACEHOLDER = "__session_id__";
const TWELVE_WEEKS_MS = 12 * 7 * 24 * 60 * 60 * 1000;

export interface PayosClientLike {
  paymentRequests: {
    create(input: CreatePaymentLinkRequest): Promise<CreatePaymentLinkResponse>;
  };
}

export interface CreatePayosPaymentAdapterOptions {
  client?: PayosClientLike;
  orderIdGenerator?: () => string;
  now?: () => Date;
}

export interface PayosConfig {
  clientId: string;
  apiKey: string;
  checksumKey: string;
  plusPriceVnd: number;
}

function getPayosConfig(): PayosConfig {
  return {
    clientId: process.env.PAYOS_CLIENT_ID?.trim() ?? "",
    apiKey: process.env.PAYOS_API_KEY?.trim() ?? "",
    checksumKey: process.env.PAYOS_CHECKSUM_KEY?.trim() ?? "",
    plusPriceVnd: Number.parseInt(process.env.PLUS_PRICE_VND?.trim() ?? "99000", 10),
  };
}

export function isPayosConfigured(): boolean {
  const config = getPayosConfig();
  return config.clientId.length > 0 && config.apiKey.length > 0 && config.checksumKey.length > 0;
}

export function generatePayosLocalOrderId(): string {
  const bytes = randomBytes(ORDER_ID_LENGTH);
  let result = ORDER_ID_PREFIX;
  for (let i = 0; i < ORDER_ID_LENGTH; i++) {
    result += ORDER_ALPHABET[bytes[i] % ORDER_ALPHABET.length];
  }
  return result;
}

export function createPayosOrderCodeFromOrderId(orderId: string): number {
  const normalized = orderId.trim().toUpperCase();
  if (!ORDER_ID_REGEX.test(normalized)) {
    throw new PaymentProviderError("payos", `Invalid local orderId for PayOS orderCode mapping: ${orderId}`);
  }

  let value = 0;
  for (const char of normalized.slice(ORDER_ID_PREFIX.length)) {
    const index = ORDER_ALPHABET.indexOf(char);
    if (index < 0) {
      throw new PaymentProviderError("payos", `Invalid local orderId character for PayOS orderCode mapping: ${char}`);
    }
    value = value * ORDER_ALPHABET.length + index;
  }

  return PAYOS_ORDER_CODE_OFFSET + value;
}

export function extractPayosOrderIdFromDescription(description: string | undefined | null): string | null {
  const match = String(description ?? "").match(ORDER_ID_IN_DESCRIPTION_REGEX);
  return match ? match[0].toUpperCase() : null;
}

function createPayosClient(config: PayosConfig): PayosClientLike & PayosPaymentLinkClient {
  return new PayOS({
    clientId: config.clientId,
    apiKey: config.apiKey,
    checksumKey: config.checksumKey,
    logLevel: "warn",
  });
}

export function getPayosPaymentLinkClient(): PayosPaymentLinkClient {
  const config = getPayosConfig();
  if (!isPayosConfigured()) {
    throw new PaymentProviderNotConfiguredError("payos");
  }
  return createPayosClient(config);
}

function parseRawBody(rawBody: Buffer | string): string {
  return typeof rawBody === "string" ? rawBody : rawBody.toString("utf-8");
}

export function parsePayosWebhookPayload(rawBody: Buffer | string): Webhook {
  const body = parseRawBody(rawBody);
  return JSON.parse(body) as Webhook;
}

function sortObjectByKey(value: Record<string, unknown>): Record<string, unknown> {
  return Object.keys(value)
    .sort()
    .reduce<Record<string, unknown>>((result, key) => {
      result[key] = value[key];
      return result;
    }, {});
}

function toPayosQueryString(value: Record<string, unknown>): string {
  return Object.keys(value)
    .filter((key) => value[key] !== undefined)
    .map((key) => {
      let item = value[key];
      if (Array.isArray(item)) {
        item = JSON.stringify(
          item.map((entry) => (entry && typeof entry === "object" ? sortObjectByKey(entry as Record<string, unknown>) : entry)),
        );
      }
      if (item === null || item === undefined || item === "undefined" || item === "null") {
        item = "";
      }
      return `${key}=${item}`;
    })
    .join("&");
}

export function createPayosSignatureFromData(data: Record<string, unknown>, checksumKey: string): string {
  const sortedData = sortObjectByKey(data);
  const queryString = toPayosQueryString(sortedData);
  return createHmac("sha256", checksumKey).update(queryString).digest("hex");
}

function safeEqualSignature(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  return aBuffer.length === bBuffer.length && timingSafeEqual(aBuffer, bBuffer);
}

export function verifyPayosWebhookPayload(rawBody: Buffer | string, checksumKey: string): WebhookVerificationResult {
  if (!checksumKey.trim()) {
    return { valid: false, reason: "PAYOS_CHECKSUM_KEY not configured." };
  }

  let payload: Webhook;
  try {
    payload = parsePayosWebhookPayload(rawBody);
  } catch {
    return { valid: false, reason: "Malformed PayOS webhook payload." };
  }

  if (!payload || typeof payload !== "object" || !payload.data || typeof payload.signature !== "string") {
    return { valid: false, reason: "PayOS webhook data or signature missing." };
  }

  const expectedSignature = createPayosSignatureFromData(payload.data as unknown as Record<string, unknown>, checksumKey);
  if (!safeEqualSignature(payload.signature, expectedSignature)) {
    return { valid: false, reason: "PayOS webhook checksum mismatch." };
  }

  return { valid: true };
}

export function createPayosProviderEventId(data: WebhookData, payloadHash: string): string {
  const paymentLinkId = data.paymentLinkId?.trim();
  const reference = data.reference?.trim();
  const orderCode = Number.isFinite(data.orderCode) ? String(data.orderCode) : "unknown_order";
  const stableSuffix = reference || data.code || payloadHash.slice(0, 16);
  return `payos_${paymentLinkId || orderCode}_${stableSuffix}`;
}

export function isSuccessfulPayosWebhook(payload: Webhook): boolean {
  return payload.success === true && payload.code === "00" && payload.data?.code === "00";
}

function dateFromUnixSeconds(value: number | undefined): Date | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  return new Date(value * 1000);
}

function mapPayosPaymentStatusToEventType(status: string): NormalizedEventType {
  const normalized = status.trim().toUpperCase();
  if (normalized === "PAID" || normalized === "SUCCESS" || normalized === "COMPLETED" || normalized === "00") {
    return "checkout_completed";
  }
  if (normalized === "FAILED" || normalized === "UNDERPAID") return "payment_failed";
  if (normalized === "CANCELLED" || normalized === "CANCELED") return "subscription_canceled";
  if (normalized === "EXPIRED") return "subscription_expired";
  return "unknown";
}

export function mapPayosSubscriptionStatus(providerStatus: string): BillingSubscriptionStatus | null {
  const normalized = providerStatus.trim().toUpperCase();
  if (normalized === "PAID" || normalized === "SUCCESS" || normalized === "COMPLETED" || normalized === "00") return "active";
  if (normalized === "PENDING" || normalized === "PROCESSING") return "incomplete";
  if (normalized === "CANCELLED" || normalized === "CANCELED" || normalized === "EXPIRED") return "canceled";
  if (normalized === "FAILED" || normalized === "UNDERPAID") return "past_due";
  return null;
}

function assertPayosConfigReady(config: PayosConfig, amount: number): void {
  if (!isPayosConfigured()) {
    throw new PaymentProviderNotConfiguredError("payos");
  }
  if (!Number.isFinite(amount) || amount < 1000) {
    throw new PaymentProviderNotConfiguredError("payos");
  }
}

function assertPayosPlanSupported(input: CreateCheckoutSessionInput): void {
  if (input.planCode !== "PLUS") {
    throw new PaymentProviderError("payos", `Unsupported PayOS planCode: ${input.planCode}`);
  }
}

function hydrateCheckoutSessionUrl(url: string, orderId: string): string {
  return url.split(CHECKOUT_SESSION_ID_PLACEHOLDER).join(encodeURIComponent(orderId));
}

export function createPayosPaymentAdapter(options: CreatePayosPaymentAdapterOptions = {}): PaymentProviderAdapter {
  return {
    providerId: "payos",
    isConfigured: isPayosConfigured(),

    async createCheckoutSession(input: CreateCheckoutSessionInput): Promise<CheckoutSessionResult> {
      const config = getPayosConfig();
      const amount = input.amount && Number.isFinite(input.amount) && input.amount >= 1000
        ? input.amount
        : config.plusPriceVnd;
      assertPayosConfigReady(config, amount);
      assertPayosPlanSupported(input);

      const purpose = input.purpose ?? "plus_subscription";
      const isPhysicalOrder = purpose === "physical_order";
      const itemName = isPhysicalOrder ? "Vision Board Kit" : "Vision Board Plus 12 tuần";

      const now = options.now?.() ?? new Date();
      const orderId = (options.orderIdGenerator?.() ?? generatePayosLocalOrderId()).trim().toUpperCase();
      const orderCode = createPayosOrderCodeFromOrderId(orderId);
      const expiresAt = new Date(now.getTime() + ORDER_EXPIRY_MINUTES * 60 * 1000);
      const payosClient = options.client ?? createPayosClient(config);

      const paymentRequest: CreatePaymentLinkRequest = {
        orderCode,
        amount,
        description: orderId,
        returnUrl: hydrateCheckoutSessionUrl(input.successUrl, orderId),
        cancelUrl: hydrateCheckoutSessionUrl(input.cancelUrl, orderId),
        buyerEmail: input.customerEmail || input.receiptEmail,
        buyerName: input.receiptName,
        expiredAt: Math.floor(expiresAt.getTime() / 1000),
        items: [
          {
            name: itemName,
            quantity: 1,
            price: amount,
          },
        ],
      };

      let paymentLink: CreatePaymentLinkResponse;
      try {
        paymentLink = await payosClient.paymentRequests.create(paymentRequest);
      } catch (error) {
        throw new PaymentProviderError("payos", "PayOS create payment link failed.", error);
      }

      if (!paymentLink.checkoutUrl || typeof paymentLink.checkoutUrl !== "string") {
        throw new PaymentProviderError("payos", "PayOS did not return a checkoutUrl.");
      }

      const providerExpiresAt = dateFromUnixSeconds(paymentLink.expiredAt) ?? expiresAt;
      const qrDataUrl = paymentLink.qrCode || paymentLink.checkoutUrl;

      await PaymentOrderModel.create({
        orderId,
        userId: input.userId,
        planCode: input.planCode,
        billingCycle: "twelve_week",
        amount,
        currency: "VND",
        status: "pending",
        provider: "payos",
        purpose,
        bankAccount: paymentLink.accountNumber || "payos",
        bankName: paymentLink.bin || "payos",
        accountName: paymentLink.accountName || "PayOS",
        description: orderId,
        qrDataUrl,
        receiptEmail: input.receiptEmail || input.customerEmail,
        receiptName: input.receiptName,
        expiresAt: providerExpiresAt,
        metadata: {
          physicalOrderId: input.physicalOrderId || undefined,
          discount: input.discount || undefined,
          payos: {
            orderCode,
            paymentLinkId: paymentLink.paymentLinkId,
            checkoutUrl: paymentLink.checkoutUrl,
            qrCode: paymentLink.qrCode,
            status: paymentLink.status,
          },
        },
      });

      return {
        sessionId: orderId,
        checkoutUrl: paymentLink.checkoutUrl,
        expiresAt: providerExpiresAt.toISOString(),
      };
    },

    verifyWebhookSignature(input: WebhookVerificationInput): WebhookVerificationResult {
      const config = getPayosConfig();
      return verifyPayosWebhookPayload(input.rawBody, config.checksumKey);
    },

    parseWebhookEvent(rawBody: Buffer | string): NormalizedProviderEvent {
      const body = parseRawBody(rawBody);
      const payload = JSON.parse(body) as Webhook;
      const payloadHash = createHash("sha256").update(body).digest("hex");
      const data = payload.data;
      const statusSource = isSuccessfulPayosWebhook(payload) ? "PAID" : data?.code || "unknown";
      const eventType = mapPayosPaymentStatusToEventType(statusSource);
      const status = mapPayosSubscriptionStatus(statusSource) ?? "incomplete";
      const now = new Date();

      return {
        provider: "payos",
        providerEventId: data ? createPayosProviderEventId(data, payloadHash) : `payos_unknown_${payloadHash.slice(0, 16)}`,
        eventType,
        rawEventType: data?.code ? `payos.${data.code}` : "payos.unknown",
        payloadHash,
        userId: "",
        planCode: "PLUS",
        status,
        billingCycle: "twelve_week",
        currentPeriodStart: eventType === "checkout_completed" ? now : undefined,
        currentPeriodEnd: eventType === "checkout_completed" ? new Date(now.getTime() + TWELVE_WEEKS_MS) : undefined,
        providerSubscriptionId: extractPayosOrderIdFromDescription(data?.description) ?? undefined,
      };
    },

    mapSubscriptionStatus(providerStatus: string): BillingSubscriptionStatus | null {
      return mapPayosSubscriptionStatus(providerStatus);
    },

    async createCustomerPortalSession() {
      return null;
    },
  };
}

export { ORDER_ID_REGEX as PAYOS_LOCAL_ORDER_ID_REGEX };
export type { Webhook as PayosWebhookPayload, WebhookData as PayosWebhookData, PaymentLinkStatus as PayosPaymentLinkStatus };
