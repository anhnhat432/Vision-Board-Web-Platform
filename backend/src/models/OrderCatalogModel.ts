import { Schema, model } from "mongoose";

const orderCatalogSchema = new Schema(
  {
    itemId: { type: String, required: true, unique: true, index: true, trim: true },
    type: { type: String, required: true, enum: ["frame", "theme", "sticker"] },
    label: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    priceVnd: { type: Number, required: true, min: 0 },
    thumbnail: { type: String, trim: true },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    maxQty: { type: Number, default: 10, min: 1 },
  },
  { timestamps: true },
);

export const OrderCatalogModel = model("OrderCatalog", orderCatalogSchema);
export type OrderCatalogItemDocument = ReturnType<typeof OrderCatalogModel.hydrate>;
