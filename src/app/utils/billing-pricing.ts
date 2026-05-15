const DEFAULT_PLUS_MONTHLY_PRICE_VND = 99_000;
const DEFAULT_PLUS_PRICE_CYCLE_LABEL = "tháng";

function parseVndAmount(value: string | undefined): number {
  const normalized = value?.trim().replace(/[^0-9]/g, "") ?? "";
  const amount = Number.parseInt(normalized, 10);
  return Number.isFinite(amount) && amount > 0 ? amount : DEFAULT_PLUS_MONTHLY_PRICE_VND;
}

export const PLUS_MONTHLY_PRICE_VND = parseVndAmount(import.meta.env.VITE_BILLING_PLUS_MONTHLY_PRICE_VND);
export const PLUS_PRICE_CYCLE_LABEL =
  import.meta.env.VITE_BILLING_PLUS_PRICE_CYCLE_LABEL?.trim() || DEFAULT_PLUS_PRICE_CYCLE_LABEL;

export function formatVndAmount(amount: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(amount)} ₫`;
}

export function getPlusPriceLabel(): string {
  return `${formatVndAmount(PLUS_MONTHLY_PRICE_VND)} / ${PLUS_PRICE_CYCLE_LABEL}`;
}
