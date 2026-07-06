/**
 * Sanity test cho token-parser thuần (verification harness — task 1.1).
 *
 * Mục tiêu: xác nhận parser đọc đúng `src/styles/tokens.css`, phân loại layer,
 * suy ra kind, phân giải chuỗi var() về literal Primitive, và dựng đồ thị
 * tham chiếu. KHÔNG kiểm chứng property đầy đủ (đó là việc của task 2.3/2.4).
 *
 * _Requirements: 1.3, 1.5_
 */

import { describe, expect, it } from "vitest";
import { buildReferenceGraph, classifyLayer, inferKind, loadTokenSet, parseTokens, resolveToken } from "./token-parser";

describe("token-parser — classifyLayer", () => {
  it("phân loại layer theo tiền tố tên token", () => {
    expect(classifyLayer("--green-700")).toBe("primitive");
    expect(classifyLayer("--status-red")).toBe("primitive");
    expect(classifyLayer("--color-career-accent")).toBe("primitive");
    expect(classifyLayer("--app-accent")).toBe("semantic");
    expect(classifyLayer("--app-focus-ring")).toBe("semantic");
    expect(classifyLayer("--btn-primary-bg")).toBe("component");
    expect(classifyLayer("--card-bg")).toBe("component");
    expect(classifyLayer("--reflection-bg")).toBe("component");
  });
});

describe("token-parser — inferKind", () => {
  it("suy ra kind từ literal value", () => {
    expect(inferKind("--green-700", "#2A5447")).toBe("color");
    expect(inferKind("--app-overlay", "rgba(26, 26, 26, 0.40)")).toBe("color");
    expect(inferKind("--app-radius-card", "14px")).toBe("length");
    expect(inferKind("--app-focus-ring", "0 0 0 4px rgba(47, 93, 80, 0.2)")).toBe("shadow");
    expect(inferKind("--app-font-sans", '"Be Vietnam Pro", "Inter", ui-sans-serif, system-ui, sans-serif')).toBe(
      "fontFamily",
    );
  });

  it("suy ra kind theo vai trò tên khi rawValue là tham chiếu var()", () => {
    expect(inferKind("--app-status-error", "var(--status-red)")).toBe("color");
    expect(inferKind("--card-radius", "var(--app-radius-card)")).toBe("length");
    expect(inferKind("--card-shadow", "var(--app-shadow-sm)")).toBe("shadow");
    expect(inferKind("--input-focus-ring", "var(--app-focus-ring)")).toBe("shadow");
    expect(inferKind("--reflection-prompt-font", "var(--app-font-serif)")).toBe("fontFamily");
  });
});

describe("token-parser — parseTokens (tokens.css thật)", () => {
  const lightSet = loadTokenSet({ mode: "light" });
  const darkSet = loadTokenSet({ mode: "dark" });

  it("nạp được token 3 lớp, bỏ qua bridge @theme inline", () => {
    expect(lightSet.size).toBeGreaterThan(50);
    // Bridge token --color-app-* (trong @theme inline) KHÔNG được đưa vào set 3 lớp.
    expect(lightSet.has("--color-app-bg")).toBe(false);
    expect(lightSet.has("--app-accent")).toBe(true);
    expect(lightSet.has("--green-700")).toBe(true);
    expect(lightSet.has("--btn-primary-bg")).toBe(true);
  });

  it("override giá trị :root bằng html.dark ở mode dark", () => {
    expect(lightSet.get("--app-bg")?.rawValue).toBe("#f2efe6");
    expect(darkSet.get("--app-bg")?.rawValue).toBe("#1c1a15");
    expect(lightSet.get("--app-accent")?.rawValue).toBe("#0c5e3a");
    expect(darkSet.get("--app-accent")?.rawValue).toBe("#5ba590");
  });
});

describe("token-parser — resolveToken", () => {
  const set = loadTokenSet({ mode: "light" });

  it("đi hết chuỗi var() tới literal Primitive, non-empty đúng kiểu", () => {
    // --btn-primary-bg → --app-accent → #0c5e3a
    const btn = resolveToken("--btn-primary-bg", set);
    expect(btn.resolvedValue).toBe("#0c5e3a");
    expect(btn.isNonEmpty).toBe(true);
    expect(btn.kindValid).toBe(true);

    const radius = resolveToken("--card-radius", set);
    expect(radius.resolvedValue).toBe("18px");
    expect(radius.kindValid).toBe(true);

    const shadow = resolveToken("--input-focus-ring", set);
    expect(shadow.isNonEmpty).toBe(true);
    expect(shadow.kindValid).toBe(true);
  });

  it("token không tồn tại → resolve rỗng, không hợp lệ", () => {
    const missing = resolveToken("--khong-ton-tai", set);
    expect(missing.isNonEmpty).toBe(false);
    expect(missing.kindValid).toBe(false);
  });

  it("dùng fallback khi tham chiếu treo", () => {
    const orphanSet = parseTokens(":root { --x: var(--khong-co, #abcdef); }");
    const resolved = resolveToken("--x", orphanSet);
    expect(resolved.resolvedValue).toBe("#abcdef");
    expect(resolved.isNonEmpty).toBe(true);
  });
});

describe("token-parser — buildReferenceGraph", () => {
  const set = loadTokenSet({ mode: "light" });

  it("trích đúng các tham chiếu var() trong rawValue", () => {
    const graph = buildReferenceGraph(set);
    expect(graph.get("--app-accent")).toEqual([]);
    expect(graph.get("--btn-primary-bg")).toEqual(["--app-accent"]);
    // Primitive literal không có tham chiếu.
    expect(graph.get("--green-700")).toEqual([]);
  });

  it("chuỗi tham chiếu phân giải về literal sau hữu hạn bước (acyclic)", () => {
    const graph = buildReferenceGraph(set);
    // --btn-primary-bg → --app-accent (literal #0C5E3A)
    const refs1 = graph.get("--btn-primary-bg") ?? [];
    expect(refs1).toContain("--app-accent");
    const refs2 = graph.get("--app-accent") ?? [];
    expect(refs2).toEqual([]);
    const refs3 = graph.get("--green-700") ?? [];
    expect(refs3).toEqual([]);
  });
});
