export type CatalogItemType = "frame" | "theme" | "sticker";

export interface CatalogItem {
  itemId: string;
  type: CatalogItemType;
  label: string;
  description?: string;
  priceVnd: number;
  thumbnail?: string;
  sortOrder: number;
  isActive: boolean;
  maxQty?: number;
}
