import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  downloadDataUrl,
  EXPORT_RATIOS,
  exportVisionBoardToPng,
  getRatioLabel,
  getRatioSize,
} from "./vision-board-export";

const toPngMock = vi.hoisted(() => vi.fn());

vi.mock("html-to-image", () => ({
  toPng: toPngMock,
}));

describe("vision-board-export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns ratio labels", () => {
    expect(getRatioLabel("wallpaper")).toContain("9:16");
    expect(getRatioLabel("desktop")).toContain("16:9");
    expect(getRatioLabel("square")).toContain("1:1");
  });

  it("exposes three export ratios", () => {
    expect(EXPORT_RATIOS).toEqual(["wallpaper", "desktop", "square"]);
  });

  it("returns ratio sizes", () => {
    expect(getRatioSize("wallpaper")).toEqual({ width: 1080, height: 1920 });
  });

  it("downloads a data URL through a temporary link", () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const appendSpy = vi.spyOn(document.body, "appendChild");
    const removeSpy = vi.spyOn(document.body, "removeChild");
    const dataUrl = "data:image/png;base64,abc";

    downloadDataUrl(dataUrl, "vision-board.png");

    const link = appendSpy.mock.calls[0]?.[0] as HTMLAnchorElement;
    expect(link).toBeInstanceOf(HTMLAnchorElement);
    expect(link.download).toBe("vision-board.png");
    expect(link.href).toBe(dataUrl);
    expect(clickSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalledWith(link);
  });

  it("exports a canvas element with html-to-image options", async () => {
    const element = document.createElement("div");
    toPngMock.mockResolvedValue("data:image/png;base64,exported");

    const dataUrl = await exportVisionBoardToPng(element, { ratio: "wallpaper", pixelRatio: 3 });

    expect(dataUrl).toBe("data:image/png;base64,exported");
    expect(toPngMock).toHaveBeenCalledWith(
      element,
      expect.objectContaining({
        pixelRatio: 3,
        canvasWidth: 1080,
        canvasHeight: 1920,
        cacheBust: true,
        skipFonts: false,
      }),
    );
  });

  it("filters export-skip nodes", async () => {
    const element = document.createElement("div");
    const skippedNode = document.createElement("button");
    const keptNode = document.createElement("span");
    skippedNode.dataset.exportSkip = "true";
    toPngMock.mockResolvedValue("data:image/png;base64,exported");

    await exportVisionBoardToPng(element, { ratio: "square" });

    const options = toPngMock.mock.calls[0]?.[1] as { filter: (node: HTMLElement) => boolean };
    expect(options.filter(skippedNode)).toBe(false);
    expect(options.filter(keptNode)).toBe(true);
  });
});
