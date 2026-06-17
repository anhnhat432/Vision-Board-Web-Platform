import { LIFE_AREAS } from "./storage-constants";
import {
  CURATED_IMAGES_BY_LIFE_AREA,
  CURATED_QUOTES_BY_FEELING,
  IMAGE_FRAME_STYLES,
  QUOTE_FONT_STYLES,
  SIZE_PRESETS,
  STORY_FEELING_OPTIONS,
  VISION_BOARD_THEMES,
} from "./vision-board-config";

function expectUnique(values: string[]): void {
  expect(new Set(values).size).toBe(values.length);
}

describe("vision board config", () => {
  it("defines seven complete themes with unique ids", () => {
    expect(VISION_BOARD_THEMES).toHaveLength(7);
    expectUnique(VISION_BOARD_THEMES.map((theme) => theme.id));

    for (const theme of VISION_BOARD_THEMES) {
      expect(theme.id).toBeTruthy();
      expect(theme.label).toBeTruthy();
      expect(theme.description).toBeTruthy();
      expect(theme.canvasBackground).toContain("gradient");
      expect(theme.gridColor).toContain("rgba");
      expect(theme.accentZone).toContain("rgba");
      expect(theme.textColor).toBeTruthy();
      expect(theme.defaultQuoteFont).toBeTruthy();
      expect(theme.preview.gradient).toContain("gradient");
    }
  });

  it("defines four quote font styles with unique ids", () => {
    expect(QUOTE_FONT_STYLES).toHaveLength(4);
    expectUnique(QUOTE_FONT_STYLES.map((style) => style.id));
  });

  it("defines seven image frame styles with unique ids", () => {
    expect(IMAGE_FRAME_STYLES).toHaveLength(7);
    expectUnique(IMAGE_FRAME_STYLES.map((style) => style.id));
  });

  it("orders size preset widths from small to extra large", () => {
    expect(SIZE_PRESETS.S.width).toBeLessThan(SIZE_PRESETS.M.width);
    expect(SIZE_PRESETS.M.width).toBeLessThan(SIZE_PRESETS.L.width);
    expect(SIZE_PRESETS.L.width).toBeLessThan(SIZE_PRESETS.XL.width);
  });

  it("defines at least twelve story feelings", () => {
    expect(STORY_FEELING_OPTIONS.length).toBeGreaterThanOrEqual(12);
    expectUnique(STORY_FEELING_OPTIONS.map((feeling) => feeling.id));
  });

  it("covers all story feelings with curated quotes", () => {
    const quoteFeelingIds = new Set(CURATED_QUOTES_BY_FEELING.map((group) => group.feelingId));

    for (const feeling of STORY_FEELING_OPTIONS) {
      expect(quoteFeelingIds.has(feeling.id)).toBe(true);
    }

    for (const group of CURATED_QUOTES_BY_FEELING) {
      expect(group.quotes.length).toBeGreaterThanOrEqual(3);
      expect(group.quotes.every((quote) => quote.trim().length > 0)).toBe(true);
    }
  });

  it("covers all life areas with curated images", () => {
    const imageLifeAreaNames = new Set(CURATED_IMAGES_BY_LIFE_AREA.map((image) => image.lifeAreaName));

    for (const area of LIFE_AREAS) {
      expect(imageLifeAreaNames.has(area.name)).toBe(true);
    }
  });
});
