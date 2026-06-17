/**
 * Property-Based Test — Property 4: Bất biến cấu trúc 3 lớp (task 2.4).
 *
 * "For any token trong hệ thống, chuỗi tham chiếu của nó tuân thủ hướng hợp lệ —
 *  Semantic_Token chỉ tham chiếu Primitive_Token hoặc Semantic_Token khác;
 *  Component_Token chỉ tham chiếu Semantic_Token hoặc Primitive_Token — và đồ thị
 *  tham chiếu không có chu trình, tức mọi chuỗi var() kết thúc tại một literal
 *  Primitive sau hữu hạn bước."
 *
 * Validates: Requirements 1.3
 *
 * Nguồn dữ liệu:
 *   - Parse trực tiếp `src/styles/tokens.css` qua token-parser (task 1.1) ở cả
 *     light + dark mode → TokenSet + ReferenceGraph.
 *
 * Generator: chọn một Token_Name BẤT KỲ từ token set (fast-check, numRuns ≥ 100).
 *
 * Mô hình kiểm chứng:
 *   1) Hướng tham chiếu (classifyLayer trên TỪNG ref):
 *      - Semantic  → ref ∈ {primitive, semantic}  (KHÔNG ref component)
 *      - Component → ref ∈ {primitive, semantic}   (KHÔNG ref component)
 *      (=> không token nào tham chiếu một Component_Token — component là lớp đỉnh)
 *   2) Acyclic: DFS từ token không gặp back-edge (không có chu trình).
 *   3) Termination: resolveToken(name) trả literal không còn `var(` sau hữu hạn
 *      bước (chuỗi var() kết thúc tại literal Primitive).
 */

import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  buildReferenceGraph,
  classifyLayer,
  loadTokenSet,
  type ReferenceGraph,
  resolveToken,
  type TokenSet,
} from "./token-parser";

// ─────────────────────────────────────────────────────────────
// Chuẩn bị dữ liệu (đọc một lần ở module scope — thuần, test-time)
// ─────────────────────────────────────────────────────────────

const PROPERTY_TAG = "Feature: ux-ui-upgrade, Property 4: Bất biến cấu trúc 3 lớp (hướng tham chiếu + acyclic)";

const postLight: TokenSet = loadTokenSet({ mode: "light" });
const postDark: TokenSet = loadTokenSet({ mode: "dark" });
const graphLight: ReferenceGraph = buildReferenceGraph(postLight);
const graphDark: ReferenceGraph = buildReferenceGraph(postDark);

/** Tập tên token (hợp của cả hai mode) để generator chọn ngẫu nhiên. */
const allNames: string[] = [...new Set([...postLight.keys(), ...postDark.keys()])];

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Hướng tham chiếu hợp lệ với tên token nguồn `name` và một ref `ref`.
 * - Semantic/Component: KHÔNG được tham chiếu Component_Token.
 * - Primitive: là lớp đáy; nếu có ref thì chỉ tham chiếu Primitive khác.
 */
function isValidDirection(name: string, ref: string): boolean {
  const from = classifyLayer(name);
  const to = classifyLayer(ref);
  if (from === "semantic") {
    return to === "primitive" || to === "semantic";
  }
  if (from === "component") {
    return to === "primitive" || to === "semantic";
  }
  // from === "primitive"
  return to === "primitive";
}

/** Phát hiện chu trình đạt được từ `name` trong đồ thị (DFS + recursion stack). */
function hasCycleFrom(name: string, graph: ReferenceGraph): boolean {
  const inStack = new Set<string>();
  const visited = new Set<string>();

  function dfs(node: string): boolean {
    if (inStack.has(node)) {
      return true; // back-edge → chu trình
    }
    if (visited.has(node)) {
      return false;
    }
    visited.add(node);
    inStack.add(node);
    for (const ref of graph.get(node) ?? []) {
      if (dfs(ref)) {
        return true;
      }
    }
    inStack.delete(node);
    return false;
  }

  return dfs(name);
}

// ─────────────────────────────────────────────────────────────
// Property 4
// ─────────────────────────────────────────────────────────────

describe("Property 4 — Bất biến cấu trúc 3 lớp (task 2.4)", () => {
  it("token set có dữ liệu để sinh mẫu", () => {
    expect(allNames.length).toBeGreaterThan(0);
  });

  it(PROPERTY_TAG, () => {
    fc.assert(
      fc.property(fc.constantFrom(...allNames), (name) => {
        for (const [set, graph] of [
          [postLight, graphLight],
          [postDark, graphDark],
        ] as Array<[TokenSet, ReferenceGraph]>) {
          if (!set.has(name)) {
            continue; // token chỉ khai báo ở mode kia
          }

          // (1) Hướng tham chiếu hợp lệ trên TỪNG ref (Req 1.3).
          for (const ref of graph.get(name) ?? []) {
            expect(isValidDirection(name, ref)).toBe(true);
          }

          // (2) Acyclic: không có chu trình đạt được từ token (Req 1.3).
          expect(hasCycleFrom(name, graph)).toBe(false);

          // (3) Termination: chuỗi var() kết thúc tại literal sau hữu hạn bước.
          const resolved = resolveToken(name, set);
          expect(resolved.resolvedValue).not.toContain("var(");
        }
      }),
      { numRuns: 100 },
    );
  });

  it("toàn đồ thị acyclic ở cả light & dark (không token nào nằm trong chu trình)", () => {
    for (const graph of [graphLight, graphDark]) {
      for (const name of graph.keys()) {
        expect(hasCycleFrom(name, graph)).toBe(false);
      }
    }
  });
});
