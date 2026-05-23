import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { OrderCatalogModel } from "../models/OrderCatalogModel";

function getPathOptions(pathName: string): Record<string, unknown> {
  const schemaPath = OrderCatalogModel.schema.path(pathName);
  assert.ok(schemaPath, `${pathName} schema path should exist`);
  return schemaPath.options ?? {};
}

describe("OrderCatalogModel", () => {
  it("rejects priceVnd < 0", async () => {
    const item = new OrderCatalogModel({
      itemId: "frame:20x30",
      type: "frame",
      label: "20×30",
      priceVnd: -1,
    });

    await assert.rejects(item.validate());
  });

  it("requires itemId unique", () => {
    const indexes = OrderCatalogModel.schema.indexes();
    const itemIdIndex = indexes.find((index) => {
      const [keys] = index;
      return keys.itemId === 1 && Object.keys(keys).length === 1;
    });

    assert.ok(itemIdIndex, "itemId index should exist");
    assert.equal(itemIdIndex[1].unique, true);
  });

  it("enums type to frame|theme|sticker", async () => {
    const item = new OrderCatalogModel({
      itemId: "bad:x",
      type: "bogus" as never,
      label: "X",
      priceVnd: 1000,
    });

    await assert.rejects(item.validate());
    assert.deepEqual(getPathOptions("type").enum, ["frame", "theme", "sticker"]);
  });
});
