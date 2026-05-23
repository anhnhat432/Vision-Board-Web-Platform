import type { Request, Response } from "express";

import { OrderCatalogModel } from "../models/OrderCatalogModel";
import { getImageStorageAdapter } from "../services/r2StorageService";
import { ApiError } from "../utils/apiError";
import { successResponse } from "../utils/apiResponse";

const ITEM_ID_RE = /^(frame|theme|sticker):[a-z0-9-]+$/;
const ALLOWED_TYPES = new Set(["frame", "theme", "sticker"]);
const MAX_LABEL_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_THUMBNAIL_LENGTH = 2048;

const ALLOWED_THUMBNAIL_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};
const MAX_THUMBNAIL_BYTES = 2 * 1024 * 1024;

export async function listActiveCatalog(_req: Request, res: Response): Promise<void> {
  const items = await OrderCatalogModel.find({ isActive: true })
    .sort({ sortOrder: 1, itemId: 1 })
    .lean();
  res.set("Cache-Control", "public, max-age=60");
  res.status(200).json(successResponse(items));
}

export async function listAllCatalog(_req: Request, res: Response): Promise<void> {
  const items = await OrderCatalogModel.find({})
    .sort({ sortOrder: 1, itemId: 1 })
    .lean();
  res.status(200).json(successResponse(items));
}

function requireString(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== "string") {
    throw new ApiError(400, `${field} must be a string.`, undefined, "invalid_payload");
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new ApiError(400, `${field} is required.`, undefined, "invalid_payload");
  }
  if (trimmed.length > maxLength) {
    throw new ApiError(400, `${field} is too long.`, undefined, "invalid_payload");
  }
  return trimmed;
}

function optionalString(value: unknown, field: string, maxLength: number): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return requireString(value, field, maxLength);
}

function optionalNonNegativeInt(value: unknown, field: string): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    throw new ApiError(400, `${field} must be a non-negative integer.`, undefined, "invalid_payload");
  }
  return value;
}

function optionalPositiveInt(value: unknown, field: string): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value) || value < 1) {
    throw new ApiError(400, `${field} must be a positive integer.`, undefined, "invalid_payload");
  }
  return value;
}

function optionalBoolean(value: unknown, field: string): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "boolean") {
    throw new ApiError(400, `${field} must be a boolean.`, undefined, "invalid_payload");
  }
  return value;
}

export async function createCatalogItem(req: Request, res: Response): Promise<void> {
  const body = (req.body ?? {}) as Record<string, unknown>;

  if (typeof body.itemId !== "string" || !ITEM_ID_RE.test(body.itemId)) {
    throw new ApiError(
      400,
      "itemId must match /^(frame|theme|sticker):[a-z0-9-]+$/.",
      undefined,
      "invalid_item_id",
    );
  }
  const itemId = body.itemId;

  if (typeof body.type !== "string" || !ALLOWED_TYPES.has(body.type)) {
    throw new ApiError(400, "type must be frame, theme, or sticker.", undefined, "invalid_type");
  }
  const type = body.type;

  const label = requireString(body.label, "label", MAX_LABEL_LENGTH);
  const description = optionalString(body.description, "description", MAX_DESCRIPTION_LENGTH);
  const thumbnail = optionalString(body.thumbnail, "thumbnail", MAX_THUMBNAIL_LENGTH);

  if (typeof body.priceVnd !== "number" || !Number.isFinite(body.priceVnd) || body.priceVnd < 0) {
    throw new ApiError(400, "priceVnd must be a number >= 0.", undefined, "invalid_price");
  }
  const priceVnd = body.priceVnd;

  const sortOrder = optionalNonNegativeInt(body.sortOrder, "sortOrder");
  const maxQty = optionalPositiveInt(body.maxQty, "maxQty");
  const isActive = optionalBoolean(body.isActive, "isActive");

  const existing = await OrderCatalogModel.findOne({ itemId });
  if (existing) {
    throw new ApiError(409, `itemId "${itemId}" already exists.`, undefined, "duplicate_item_id");
  }

  const created = await OrderCatalogModel.create({
    itemId,
    type,
    label,
    description,
    priceVnd,
    thumbnail,
    sortOrder,
    isActive,
    maxQty,
  });

  res.status(201).json(successResponse(created, "Catalog item created."));
}

export async function updateCatalogItem(req: Request, res: Response): Promise<void> {
  const itemId = req.params.itemId;
  if (typeof itemId !== "string" || !ITEM_ID_RE.test(itemId)) {
    throw new ApiError(400, "Invalid itemId.", undefined, "invalid_item_id");
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const update: Record<string, unknown> = {};

  if ("label" in body) {
    update.label = requireString(body.label, "label", MAX_LABEL_LENGTH);
  }
  if ("description" in body) {
    const value = body.description;
    if (value === null || value === "") {
      update.description = "";
    } else {
      update.description = requireString(value, "description", MAX_DESCRIPTION_LENGTH);
    }
  }
  if ("thumbnail" in body) {
    const value = body.thumbnail;
    if (value === null || value === "") {
      update.thumbnail = "";
    } else {
      update.thumbnail = requireString(value, "thumbnail", MAX_THUMBNAIL_LENGTH);
    }
  }
  if ("priceVnd" in body) {
    if (typeof body.priceVnd !== "number" || !Number.isFinite(body.priceVnd) || body.priceVnd < 0) {
      throw new ApiError(400, "priceVnd must be a number >= 0.", undefined, "invalid_price");
    }
    update.priceVnd = body.priceVnd;
  }
  if ("sortOrder" in body) {
    const value = optionalNonNegativeInt(body.sortOrder, "sortOrder");
    if (value !== undefined) update.sortOrder = value;
  }
  if ("maxQty" in body) {
    const value = optionalPositiveInt(body.maxQty, "maxQty");
    if (value !== undefined) update.maxQty = value;
  }
  if ("isActive" in body) {
    const value = optionalBoolean(body.isActive, "isActive");
    if (value !== undefined) update.isActive = value;
  }

  if (Object.keys(update).length === 0) {
    throw new ApiError(400, "No updatable fields provided.", undefined, "invalid_payload");
  }

  const updated = await OrderCatalogModel.findOneAndUpdate({ itemId }, update, { new: true });
  if (!updated) {
    throw new ApiError(404, `Catalog item "${itemId}" not found.`, undefined, "not_found");
  }

  res.status(200).json(successResponse(updated, "Catalog item updated."));
}

export async function toggleCatalogItemActive(req: Request, res: Response): Promise<void> {
  const itemId = req.params.itemId;
  if (typeof itemId !== "string" || !ITEM_ID_RE.test(itemId)) {
    throw new ApiError(400, "Invalid itemId.", undefined, "invalid_item_id");
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  if (typeof body.isActive !== "boolean") {
    throw new ApiError(400, "isActive must be a boolean.", undefined, "invalid_payload");
  }

  const updated = await OrderCatalogModel.findOneAndUpdate(
    { itemId },
    { isActive: body.isActive },
    { new: true },
  );
  if (!updated) {
    throw new ApiError(404, `Catalog item "${itemId}" not found.`, undefined, "not_found");
  }

  res.status(200).json(successResponse(updated, "Catalog item active state updated."));
}

interface MulterFileLike {
  fieldname: string;
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

function getUploadedFile(req: Request): MulterFileLike | undefined {
  const file = (req as Request & { file?: MulterFileLike }).file;
  return file;
}

function buildCatalogThumbnailKey(itemId: string, ext: string): string {
  const safeName = itemId.replace(/[^a-z0-9-]/g, "-");
  return `order-catalog/${safeName}.${ext}`;
}

export async function uploadCatalogItemThumbnail(req: Request, res: Response): Promise<void> {
  const itemId = req.params.itemId;
  if (typeof itemId !== "string" || !ITEM_ID_RE.test(itemId)) {
    throw new ApiError(400, "Invalid itemId.", undefined, "invalid_item_id");
  }

  const file = getUploadedFile(req);
  if (!file || !file.buffer || file.size === 0) {
    throw new ApiError(400, "Image file is required (field name \"thumbnail\").", undefined, "missing_file");
  }

  const ext = ALLOWED_THUMBNAIL_MIME[file.mimetype];
  if (!ext) {
    throw new ApiError(
      400,
      "Unsupported image type. Allowed: image/png, image/jpeg, image/webp.",
      undefined,
      "invalid_mime",
    );
  }

  if (file.size > MAX_THUMBNAIL_BYTES) {
    throw new ApiError(400, "Image is too large. Max 2MB.", undefined, "file_too_large");
  }

  const existing = await OrderCatalogModel.findOne({ itemId });
  if (!existing) {
    throw new ApiError(404, `Catalog item "${itemId}" not found.`, undefined, "not_found");
  }

  const storage = getImageStorageAdapter();
  const key = buildCatalogThumbnailKey(itemId, ext);

  await storage.putObject({
    key,
    body: file.buffer,
    contentType: file.mimetype,
    cacheControl: "public, max-age=86400, immutable",
  });

  const publicUrl = storage.publicUrl(key);

  const updated = await OrderCatalogModel.findOneAndUpdate(
    { itemId },
    { thumbnail: publicUrl },
    { new: true },
  );
  if (!updated) {
    throw new ApiError(404, `Catalog item "${itemId}" not found.`, undefined, "not_found");
  }

  res.status(200).json(successResponse(updated, "Catalog item thumbnail uploaded."));
}
