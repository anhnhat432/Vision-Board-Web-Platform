import { describe, expect, it } from "vitest";
import { getAreaColorConfig } from "./life-area-theme";

describe("getAreaColorConfig", () => {
  const standardNames = [
    "Career",
    "Finance",
    "Health",
    "Education",
    "Relationships",
    "Family",
    "Personal Growth",
    "Leisure",
  ];

  describe("8 standard areas keep their original colors", () => {
    it("Career returns blue theme", () => {
      const cfg = getAreaColorConfig("Career");
      expect(cfg.text).toContain("blue");
      expect(cfg.accent).toBe("var(--color-career-accent)");
    });

    it("Finance returns amber theme", () => {
      const cfg = getAreaColorConfig("Finance");
      expect(cfg.text).toContain("amber");
      expect(cfg.accent).toBe("var(--color-finance-accent)");
    });

    it("Health returns emerald theme", () => {
      const cfg = getAreaColorConfig("Health");
      expect(cfg.text).toContain("emerald");
      expect(cfg.accent).toBe("var(--color-health-accent)");
    });

    it("Education returns indigo theme", () => {
      const cfg = getAreaColorConfig("Education");
      expect(cfg.text).toContain("indigo");
      expect(cfg.accent).toBe("var(--color-education-accent)");
    });

    it("Relationships returns rose theme", () => {
      const cfg = getAreaColorConfig("Relationships");
      expect(cfg.text).toContain("rose");
      expect(cfg.accent).toBe("var(--color-relationships-accent)");
    });

    it("Family returns teal theme", () => {
      const cfg = getAreaColorConfig("Family");
      expect(cfg.text).toContain("teal");
      expect(cfg.accent).toBe("var(--color-family-accent)");
    });

    it("Personal Growth returns orange theme", () => {
      const cfg = getAreaColorConfig("Personal Growth");
      expect(cfg.text).toContain("orange");
      expect(cfg.accent).toBe("var(--color-personal-growth-accent)");
    });

    it("Leisure returns sky theme", () => {
      const cfg = getAreaColorConfig("Leisure");
      expect(cfg.text).toContain("sky");
      expect(cfg.accent).toBe("var(--color-leisure-accent)");
    });

    it("all 8 standard names match NAMED_AREA_COLORS exactly (not fallback)", () => {
      for (const name of standardNames) {
        const cfg = getAreaColorConfig(name);
        expect(cfg.text).toBeTruthy();
        expect(cfg.bgLight).toBeTruthy();
        expect(cfg.accent).toContain("var(--color-");
        expect(cfg.iconSelectedBg).toBeTruthy();
      }
    });
  });

  describe("custom area names get distinct colors from preset pool", () => {
    it('custom name "Du lịch" returns a valid preset (not old generic)', () => {
      const cfg = getAreaColorConfig("Du lịch");
      expect(cfg.text).toBeTruthy();
      // Must NOT be the old generic app-accent fallback
      expect(cfg.accent).not.toBe("var(--app-accent)");
      expect(cfg.text).not.toBe("text-app-accent");
      // Must look like a valid Tailwind text class from presets
      expect(cfg.text).toMatch(/^text-\w+-\d+/);
    });

    it('custom name "Tâm linh" returns a valid preset', () => {
      const cfg = getAreaColorConfig("Tâm linh");
      expect(cfg.text).toBeTruthy();
      expect(cfg.accent).not.toBe("var(--app-accent)");
      expect(cfg.text).toMatch(/^text-\w+-\d+/);
    });

    it("same custom name returns same result (deterministic)", () => {
      const name = "Sức khỏe tinh thần";
      const cfg1 = getAreaColorConfig(name);
      const cfg2 = getAreaColorConfig(name);
      expect(cfg1).toEqual(cfg2);
    });

    it("different custom names may produce different presets", () => {
      // "a" → hash 97, 97 % 8 = 1 (amber)
      // "b" → hash 98, 98 % 8 = 2 (emerald)
      const cfgA = getAreaColorConfig("a");
      const cfgB = getAreaColorConfig("b");
      for (const cfg of [cfgA, cfgB]) {
        expect(cfg.text).toBeTruthy();
        expect(cfg.accent).not.toBe("var(--app-accent)");
        expect(cfg.text).toMatch(/^text-\w+-\d+/);
      }
      expect(cfgA.text).not.toBe(cfgB.text);
    });

    it("custom names never return app-accent generic fallback", () => {
      const customNames = [
        "Du lịch",
        "Tâm linh",
        "Thiền",
        "Viết lách",
        "Nấu ăn",
        "CustomArea123",
      ];
      for (const name of customNames) {
        const cfg = getAreaColorConfig(name);
        expect(cfg.accent, `"${name}" accent must not be generic`).not.toBe(
          "var(--app-accent)",
        );
        expect(cfg.text, `"${name}" text must not be generic`).not.toBe(
          "text-app-accent",
        );
        expect(cfg.text, `"${name}" text must be a valid preset class`).toMatch(
          /^text-\w+-\d+/,
        );
      }
    });
  });
});
