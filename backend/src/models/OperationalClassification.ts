import { Schema } from "mongoose";

export type OperationalCategory = "real" | "test" | "internal";
export type OperationalClassificationReason =
  | "confirmed_real"
  | "test_account"
  | "internal_team"
  | "automated_qa"
  | "other";
export type OperationalClassificationSource = "default" | "user" | "record" | "legacy_sales_review";

export interface OperationalClassification {
  category: OperationalCategory;
  reason: OperationalClassificationReason;
  note?: string;
  classifiedBy: string;
  classifiedAt: Date;
}

export interface AdminOperationalClassificationSummary {
  effectiveCategory: OperationalCategory;
  source: OperationalClassificationSource;
  reason?: OperationalClassificationReason | "legacy_sales_test" | "legacy_sales_internal";
  note?: string;
  classifiedAt?: string;
}

export const OPERATIONAL_REASONS_BY_CATEGORY: Record<
  OperationalCategory,
  readonly OperationalClassificationReason[]
> = {
  real: ["confirmed_real"],
  test: ["test_account", "automated_qa", "other"],
  internal: ["internal_team", "other"],
};

export function isOperationalClassificationReasonAllowed(
  category: OperationalCategory,
  reason: OperationalClassificationReason,
): boolean {
  return OPERATIONAL_REASONS_BY_CATEGORY[category].includes(reason);
}

export const operationalClassificationSchema = new Schema<OperationalClassification>(
  {
    category: { type: String, required: true, enum: ["real", "test", "internal"] },
    reason: {
      type: String,
      required: true,
      enum: ["confirmed_real", "test_account", "internal_team", "automated_qa", "other"],
    },
    note: { type: String, required: false, trim: true, maxlength: 200 },
    classifiedBy: { type: String, required: true, trim: true, maxlength: 128 },
    classifiedAt: { type: Date, required: true },
  },
  { _id: false, strict: "throw" },
);

operationalClassificationSchema.path("reason").validate(
  function validateCategoryReason(reason: OperationalClassificationReason) {
    if (!isOperationalClassificationReasonAllowed(this.category, reason)) return false;
    return reason !== "other" || Boolean(this.note?.trim());
  },
  "Operational classification reason does not match category or requires a non-empty note.",
);
