import { describe, it, expect, vi, beforeEach } from "vitest";
import { DEFAULT_CATALOG } from "@/features/order/catalog/defaults";
import { fetchOrderCatalog } from "./orderCatalogService";

beforeEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
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

  it("falls back to DEFAULT_CATALOG when fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("net")));
    vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(await fetchOrderCatalog()).toEqual(DEFAULT_CATALOG);
  });

  it("falls back when response not ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(await fetchOrderCatalog()).toEqual(DEFAULT_CATALOG);
  });
});
