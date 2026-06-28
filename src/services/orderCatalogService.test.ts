import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CATALOG } from "@/features/order/catalog/defaults";
import { fetchOrderCatalog, getInstantCatalog } from "./orderCatalogService";

beforeEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.removeItem("vb:order-catalog");
});

describe("fetchOrderCatalog", () => {
  it("returns server data when fetch ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            {
              itemId: "frame:20x30",
              type: "frame",
              label: "X",
              priceVnd: 1000,
              sortOrder: 1,
              isActive: true,
            },
          ],
        }),
      }),
    );

    const items = await fetchOrderCatalog();
    expect(items).toHaveLength(1);
    expect(items[0]?.itemId).toBe("frame:20x30");
  });

  it("hydrates missing server thumbnails from local defaults", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            {
              itemId: "frame:20x30",
              type: "frame",
              label: "X",
              priceVnd: 1000,
              sortOrder: 1,
              isActive: true,
            },
          ],
        }),
      }),
    );

    const items = await fetchOrderCatalog();
    expect(items[0]?.thumbnail).toBe("/printed_vision_kit.webp");
  });

  it("caches result in localStorage on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            {
              itemId: "frame:30x40",
              type: "frame",
              label: "Y",
              priceVnd: 2000,
              sortOrder: 2,
              isActive: true,
            },
          ],
        }),
      }),
    );

    await fetchOrderCatalog();

    const { items, source } = getInstantCatalog();
    expect(source).toBe("cache");
    expect(items).toHaveLength(1);
    expect(items[0]?.itemId).toBe("frame:30x40");
  });

  it("rejects when fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("net")));

    await expect(fetchOrderCatalog()).rejects.toThrow("net");
  });

  it("rejects when response not ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    await expect(fetchOrderCatalog()).rejects.toThrow("HTTP 500");
  });
});

describe("getInstantCatalog", () => {
  it("returns DEFAULT_CATALOG when no cache exists", () => {
    const { items, source } = getInstantCatalog();
    expect(source).toBe("default");
    expect(items).toEqual(DEFAULT_CATALOG);
  });

  it("includes local thumbnails in the default fallback catalog", () => {
    const { items, source } = getInstantCatalog();

    expect(source).toBe("default");
    expect(items).toHaveLength(DEFAULT_CATALOG.length);
    expect(items.every((item) => typeof item.thumbnail === "string" && item.thumbnail.length > 0)).toBe(true);
  });

  it("returns cached data when cache is fresh", () => {
    const cached = {
      data: [{ itemId: "theme:test", type: "theme", label: "T", priceVnd: 100, sortOrder: 1, isActive: true }],
      cachedAt: Date.now(),
    };
    localStorage.setItem("vb:order-catalog", JSON.stringify(cached));

    const { items, source } = getInstantCatalog();
    expect(source).toBe("cache");
    expect(items).toHaveLength(1);
    expect(items[0]?.itemId).toBe("theme:test");
  });

  it("hydrates missing cached thumbnails from local defaults", () => {
    const cached = {
      data: [{ itemId: "theme:money", type: "theme", label: "MONEY", priceVnd: 100, sortOrder: 1, isActive: true }],
      cachedAt: Date.now(),
    };
    localStorage.setItem("vb:order-catalog", JSON.stringify(cached));

    const { items, source } = getInstantCatalog();
    expect(source).toBe("cache");
    expect(items[0]?.thumbnail).toBe("/curated/vision-board/finance-du-day.webp");
  });

  it("returns DEFAULT_CATALOG when cache is expired", () => {
    const cached = {
      data: [{ itemId: "theme:old", type: "theme", label: "Old", priceVnd: 100, sortOrder: 1, isActive: true }],
      cachedAt: Date.now() - 11 * 60 * 1000, // 11 minutes ago
    };
    localStorage.setItem("vb:order-catalog", JSON.stringify(cached));

    const { items, source } = getInstantCatalog();
    expect(source).toBe("default");
    expect(items).toEqual(DEFAULT_CATALOG);
  });
});
