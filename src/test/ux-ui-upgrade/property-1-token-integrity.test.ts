/**
 * Property-Based Test — Property 1: Token integrity (task 2.3).
 *
 * "For any Token_Name trong baseline token set (Semantic + Component) chụp TRƯỚC
 *  đợt nâng cấp, token đó VẪN tồn tại sau đợt nâng cấp (tập sau ⊇ baseline), được
 *  expose qua Tailwind bridge, và phân giải (đi hết chuỗi var()) về một
 *  Token_Value non-empty, hợp đúng kiểu giá trị mà nó khai báo."
 *
 * Validates: Requirements 1.1, 1.2, 1.4, 1.5
 *
 * Nguồn dữ liệu:
 *   - Baseline (TRƯỚC nâng cấp): `__snapshots__/token-names.baseline.json` (task 1.2).
 *   - Post (SAU nâng cấp): parse trực tiếp `src/styles/tokens.css` hiện tại qua
 *     token-parser (task 1.1) ở cả light + dark mode.
 *   - Bridge surface: tham chiếu `var(--x)` trong `tailwind.config.js` + khối
 *     `@theme inline` của `tokens.css`.
 *
 * Generator: chọn một Token_Name BẤT KỲ từ baseline set (fast-check, numRuns ≥ 100).
 *
 * Mô hình "exposed through Tailwind bridge" (hai tầng, vì bridge Tailwind chỉ phủ
 * trực tiếp lớp Semantic; lớp Component và một số token chuyên dụng — focus ring,
 * overlay — được tiêu thụ trực tiếp qua `var()`):
 *   1. Token nằm trên bridge surface (Semantic được map thẳng sang Tailwind utility), HOẶC
 *   2. Chuỗi var() forward của token chạm tới một token trên bridge surface
 *      (Component/Semantic là consumer của token đã bridge), HOẶC
 *   3. Token vẫn là một custom property phân giải được (non-empty) — tức vẫn
 *      expose được cho consumer qua `var(--token)` trong CSS.
 * Bất biến bridge (Requirement 1.4) được kiểm riêng: mọi token mà bridge tham
 * chiếu đều còn tồn tại và phân giải non-empty (không có tham chiếu treo).
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { readBaselineSnapshot } from "./baseline";
import {
  buildReferenceGraph,
  loadTokenSet,
  type ReferenceGraph,
  resolveToken,
  type TokenSet,
} from "./token-parser";

// ─────────────────────────────────────────────────────────────
// Chuẩn bị dữ liệu (đọc một lần ở module scope — thuần, test-time)
// ─────────────────────────────────────────────────────────────

const PROPERTY_TAG =
  "Feature: ux-ui-upgrade, Property 1: Token integrity — giữ tên, phân giải non-empty đúng kiểu";

/** Tên token Semantic + Component được chụp TRƯỚC đợt nâng cấp. */
const baselineNames: string[] = [...readBaselineSnapshot().tokenNames];

/** Token set SAU đợt nâng cấp (trạng thái tokens.css hiện tại). */
const postLight: TokenSet = loadTokenSet({ mode: "light" });
const postDark: TokenSet = loadTokenSet({ mode: "dark" });
const graphLight: ReferenceGraph = buildReferenceGraph(postLight);
const graphDark: ReferenceGraph = buildReferenceGraph(postDark);

/** Trích mọi `var(--x)` từ một chuỗi nguồn. */
function extractVarRefs(source: string): Set<string> {
  const refs = new Set<string>();
  for (const m of source.matchAll(/var\(\s*(--[\w-]+)/g)) {
    refs.add(m[1]);
  }
  return refs;
}

/** Bridge surface = var() refs trong tailwind.config.js + khối @theme inline. */
function loadBridgeSurface(): Set<string> {
  const cwd = process.cwd();
  const tailwind = readFileSync(resolve(cwd, "tailwind.config.js"), "utf8");
  const css = readFileSync(resolve(cwd, "src/styles/tokens.css"), "utf8");
  const themeBlock = css.match(/@theme[^{]*\{([\s\S]*?)\}/);
  const refs = extractVarRefs(tailwind);
  if (themeBlock) {
    for (const ref of extractVarRefs(themeBlock[1])) {
      refs.add(ref);
    }
  }
  return refs;
}

const bridgeSurface: Set<string> = loadBridgeSurface();

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/** Token tồn tại sau nâng cấp ở ít nhất một mode (superset của baseline). */
function existsInPost(name: string): boolean {
  return postLight.has(name) || postDark.has(name);
}

/** Chuỗi var() forward của `name` có chạm token nào trên bridge surface không. */
function forwardReachesBridge(name: string, graph: ReferenceGraph): boolean {
  const seen = new Set<string>();
  const stack = [name];
  while (stack.length > 0) {
    const current = stack.pop() as string;
    if (seen.has(current)) {
      continue;
    }
    seen.add(current);
    if (current !== name && bridgeSurface.has(current)) {
      return true;
    }
    for (const ref of graph.get(current) ?? []) {
      if (!seen.has(ref)) {
        stack.push(ref);
      }
    }
  }
  return false;
}

/** "Exposed through Tailwind bridge" theo mô hình hai tầng (xem header). */
function isExposedThroughBridge(name: string, set: TokenSet, graph: ReferenceGraph): boolean {
  if (bridgeSurface.has(name)) {
    return true; // 1) Semantic được map thẳng sang Tailwind utility
  }
  if (forwardReachesBridge(name, graph)) {
    return true; // 2) consumer của một token đã bridge
  }
  return resolveToken(name, set).isNonEmpty; // 3) custom property phân giải được
}

// ─────────────────────────────────────────────────────────────
// Property 1
// ─────────────────────────────────────────────────────────────

describe("Property 1 — Token integrity (task 2.3)", () => {
  it("baseline snapshot có dữ liệu để sinh mẫu", () => {
    expect(baselineNames.length).toBeGreaterThan(0);
    expect(bridgeSurface.size).toBeGreaterThan(0);
  });

  it(PROPERTY_TAG, () => {
    fc.assert(
      fc.property(fc.constantFrom(...baselineNames), (name) => {
        // (1) Superset: token baseline vẫn tồn tại sau nâng cấp (Req 1.1, 1.2).
        expect(existsInPost(name)).toBe(true);

        // (2) Expose qua Tailwind bridge (Req 1.4) — ở cả light & dark.
        expect(isExposedThroughBridge(name, postLight, graphLight)).toBe(true);
        expect(isExposedThroughBridge(name, postDark, graphDark)).toBe(true);

        // (3) Phân giải non-empty, đúng kiểu khai báo (Req 1.5) — ở cả light & dark.
        for (const set of [postLight, postDark]) {
          if (!set.has(name)) {
            continue; // token chỉ khai báo ở mode kia (hiếm; union vẫn đảm bảo tồn tại)
          }
          const resolved = resolveToken(name, set);
          expect(resolved.isNonEmpty).toBe(true);
          expect(resolved.resolvedValue).not.toContain("var(");
          expect(resolved.kindValid).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });

  it("Tailwind bridge không có tham chiếu treo — mọi token bridge còn tồn tại và phân giải (Req 1.4)", () => {
    for (const name of bridgeSurface) {
      expect(existsInPost(name)).toBe(true);
      expect(resolveToken(name, postLight).isNonEmpty).toBe(true);
      expect(resolveToken(name, postDark).isNonEmpty).toBe(true);
    }
  });
});
