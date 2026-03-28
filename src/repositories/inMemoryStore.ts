import type { LeadMetric, Plan, Task, Week } from "@/domain";

export const planStore = new Map<string, Plan>();
export const weekStore = new Map<string, Week>();
export const taskStore = new Map<string, Task>();
export const metricStore = new Map<string, LeadMetric>();

export function createEntityId(prefix: string): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return `${prefix}_${globalThis.crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function nowIsoString(): string {
  return new Date().toISOString();
}
