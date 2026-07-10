/**
 * Property-Based Test — Property 1: Bảo toàn tên token và bất biến cấu trúc 3 lớp.
 *
 * Feature: global-ui-upgrade, Property 1: Bảo toàn tên token và bất biến cấu trúc 3 lớp.
 *
 * "For any Design_Token có trong baseline, tên (key) của nó vẫn tồn tại trong hệ
 *  token hiện tại (tập tên là superset của baseline — không xóa, không đổi tên);
 *  và for any token trong hệ hiện tại, hướng tham chiếu của nó hợp lệ (Semantic →
 *  {Primitive, Semantic}; Component → {Primitive, Semantic}; không token nào tham
 *  chiếu một Component_Token), đồ thị var() không có chu trình, và mọi chuỗi var()
 *  kết thúc tại một literal sau hữu hạn bước."
 *
 * Validates: Requirements 1.3, 2.1
 *
 * Mô hình kiểm chứng (pure — không phụ thuộc DOM/React):
 *   - Baseline (TRƯỚC nâng cấp): đọc qua `readUnifiedBaseline()` từ `baseline.ts`
 *     (task 1.1), phần `tokens.tokenNames` lấy từ snapshot đã commit
 *     `__snapshots__/token-names.baseline.json`. Đây là mốc bất biến cho superset
 *     check; baseline bất biến trừ khi token surface thay đổi CÓ CHỦ Ý.
 *   - Current (SAU nâng cấp): parse trực tiếp `src/styles/tokens.css` hiện tại qua
 *     `loadTokenSet` ở cả light + dark mode; dựng `ReferenceGraph` qua
 *     `buildReferenceGraph`; phân lớp qua `classifyLayer`; phân giải chuỗi var()
 *     qua `resolveToken`.
 *
 * Bất biến kiểm chứng (design.md → invariant I1):
 *   (A) Superset tên: baseline ⊆ current (union light ∪ dark). Nâng cấp UI KHÔNG
 *       được xóa/đổi tên token baseline. Thêm token mới không làm property fail.
 *   (B) Hướng tham chiếu hợp lệ: với mỗi cạnh A→B, nếu A là Semantic hoặc
 *       Component thì B ∈ {Primitive, Semantic}; và không cạnh nào trỏ vào một
 *       Component_Token (Component là lớp đỉnh — không token nào tham chiếu nó).
 *   (C) Acyclic: đồ thị var() không có chu trình (DFS phát hiện back-edge).
 *   (D) Termination: mọi token phân giải (đi hết chuỗi var()) về một literal
 *       non-empty sau hữu hạn bước (không tham chiếu treo, không lặp vô hạn).
 *
 * Generator: chọn một Token_Name BẤT KỲ từ baseline set (cho A) và từ current
 * set (cho B/D), `fc.assert(..., { numRuns: 100 })`. Test thuần — chỉ I/O đọc
 * file ở module scope (đã đọc một lần khi build danh sách).
 *
 * Ý nghĩa thất bại: nếu test fail, dấu hiệu hoặc (a) một token baseline bị
 * đổi tên/xóa, hoặc một cạnh tham chiếu phá vỡ hướng 3 lớp / tạo chu trình /
 * tham chiếu treo (vi phạm Requirement 1.3, 2.1); hoặc (b) baseline cần
 * regenerate CÓ CHỦ Ý qua `writeUnifiedBaseline()` (kèm ghi chú lý do trong PR).
 */

import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { readUnifiedBaseline } from "./baseline";
import {
  buildReferenceGraph,
  classifyLayer,
  loadTokenSet,
  type ReferenceGraph,
  resolveToken,
  type TokenSet,
} from "./token-parser";

const PROPERTY_TAG = "Feature: global-ui-upgrade, Property 1: Bảo toàn tên token và bất biến cấu trúc 3 lớp";

// ─────────────────────────────────────────────────────────────
// Chuẩn bị dữ liệu (đọc một lần ở module scope — pure, test-time)
// ─────────────────────────────────────────────────────────────

/** Tên token Semantic + Component chụp TRƯỚC đợt nâng cấp (baseline hợp nhất). */
const baselineNames: ReadonlyArray<string> = [...readUnifiedBaseline().tokens.tokenNames].sort();

/** Token set + reference graph SAU nâng cấp (trạng thái tokens.css hiện tại). */
const postLight: TokenSet = loadTokenSet({ mode: "light" });
const postDark: TokenSet = loadTokenSet({ mode: "dark" });
const graphLight: ReferenceGraph = buildReferenceGraph(postLight);
const graphDark: ReferenceGraph = buildReferenceGraph(postDark);

/** Tên token hiện tại (union light ∪ dark) — không gian sinh mẫu cho (B)/(D). */
const currentNames: ReadonlyArray<string> = [...new Set<string>([...postLight.keys(), ...postDark.keys()])].sort();

interface ModeFixture {
  readonly mode: "light" | "dark";
  readonly set: TokenSet;
  readonly graph: ReferenceGraph;
}

const modes: ReadonlyArray<ModeFixture> = [
  { mode: "light", set: postLight, graph: graphLight },
  { mode: "dark", set: postDark, graph: graphDark },
];

// ─────────────────────────────────────────────────────────────
// Helpers thuần
// ─────────────────────────────────────────────────────────────

/** Token tồn tại sau nâng cấp ở ít nhất một mode (superset của baseline). */
function existsInPost(name: string): boolean {
  return postLight.has(name) || postDark.has(name);
}

/**
 * Kiểm hướng tham chiếu hợp lệ cho MỘT token nguồn `name` trong `set`/`graph`.
 * Trả danh sách cạnh vi phạm (rỗng nếu hợp lệ). Chỉ xét cạnh trỏ tới token có
 * định nghĩa trong set (tham chiếu treo được (D) bắt riêng).
 */
function invalidEdgesFrom(name: string, set: TokenSet, graph: ReferenceGraph): string[] {
  const sourceLayer = classifyLayer(name);
  const violations: string[] = [];
  for (const target of graph.get(name) ?? []) {
    if (!set.has(target)) {
      continue; // tham chiếu treo: (D) termination sẽ phát hiện qua resolve rỗng
    }
    const targetLayer = classifyLayer(target);
    // Không token nào được tham chiếu một Component_Token (Component là lớp đỉnh).
    if (targetLayer === "component") {
      violations.push(`${name}(${sourceLayer}) → ${target}(component) — cấm trỏ vào Component_Token`);
      continue;
    }
    // Semantic/Component chỉ được trỏ tới {Primitive, Semantic}.
    if ((sourceLayer === "semantic" || sourceLayer === "component") && !(targetLayer === "primitive" || targetLayer === "semantic")) {
      violations.push(`${name}(${sourceLayer}) → ${target}(${targetLayer}) — hướng tham chiếu không hợp lệ`);
    }
  }
  return violations;
}

/**
 * Phát hiện chu trình trong toàn đồ thị bằng DFS 3 màu (white/gray/black).
 * Trả một chu trình mẫu (mảng tên) nếu có, ngược lại `null`.
 */
function findCycle(graph: ReferenceGraph): string[] | null {
  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color = new Map<string, number>();
  const parent = new Map<string, string | null>();

  const nodes = new Set<string>(graph.keys());
  for (const refs of graph.values()) {
    for (const r of refs) {
      nodes.add(r);
    }
  }
  for (const n of nodes) {
    color.set(n, WHITE);
  }

  // DFS lặp (tránh tràn stack) với phát hiện back-edge.
  for (const start of nodes) {
    if (color.get(start) !== WHITE) {
      continue;
    }
    const stack: Array<{ node: string; iter: Iterator<string> }> = [];
    color.set(start, GRAY);
    parent.set(start, null);
    stack.push({ node: start, iter: (graph.get(start) ?? [])[Symbol.iterator]() });

    while (stack.length > 0) {
      const top = stack[stack.length - 1];
      const next = top.iter.next();
      if (next.done) {
        color.set(top.node, BLACK);
        stack.pop();
        continue;
      }
      const child = next.value;
      const c = color.get(child) ?? WHITE;
      if (c === GRAY) {
        // Back-edge → dựng lại chu trình từ child qua parent chain.
        const cycle: string[] = [child];
        let cur: string | null = top.node;
        while (cur !== null && cur !== child) {
          cycle.push(cur);
          cur = parent.get(cur) ?? null;
        }
        cycle.push(child);
        return cycle.reverse();
      }
      if (c === WHITE) {
        color.set(child, GRAY);
        parent.set(child, top.node);
        stack.push({ node: child, iter: (graph.get(child) ?? [])[Symbol.iterator]() });
      }
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// Property 1
// ─────────────────────────────────────────────────────────────

describe("Property 1 — Bảo toàn tên token và bất biến cấu trúc 3 lớp (task 2.2)", () => {
  it("baseline + current có dữ liệu để sinh mẫu (sanity)", () => {
    expect(baselineNames.length).toBeGreaterThan(0);
    expect(currentNames.length).toBeGreaterThan(0);
    expect(postLight.size).toBeGreaterThan(0);
    expect(postDark.size).toBeGreaterThan(0);
  });

  it(`${PROPERTY_TAG} — (A) superset tên token`, () => {
    fc.assert(
      fc.property(fc.constantFrom(...baselineNames), (name) => {
        // Bất biến (Req 1.3): mọi token baseline vẫn tồn tại sau nâng cấp
        // (baseline ⊆ current — union light ∪ dark). Không xóa, không đổi tên.
        expect(existsInPost(name)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it(`${PROPERTY_TAG} — (B) hướng tham chiếu 3 lớp hợp lệ`, () => {
    fc.assert(
      fc.property(fc.constantFrom(...currentNames), fc.constantFrom("light", "dark"), (name, mode) => {
        // Bất biến I1 (Req 2.1): Semantic/Component chỉ trỏ tới {Primitive,
        // Semantic}; không token nào trỏ vào một Component_Token.
        const fixture = mode === "light" ? modes[0] : modes[1];
        if (!fixture.set.has(name)) {
          return; // token chỉ khai báo ở mode kia — bỏ qua ở mode này
        }
        const violations = invalidEdgesFrom(name, fixture.set, fixture.graph);
        expect(violations).toEqual([]);
      }),
      { numRuns: 100 },
    );
  });

  it(`${PROPERTY_TAG} — (D) mọi chuỗi var() phân giải về literal non-empty`, () => {
    fc.assert(
      fc.property(fc.constantFrom(...currentNames), fc.constantFrom("light", "dark"), (name, mode) => {
        // Bất biến (Req 2.1): chuỗi var() kết thúc tại literal sau hữu hạn bước
        // (không tham chiếu treo, không lặp vô hạn) → resolvedValue non-empty và
        // không còn "var(".
        const set = mode === "light" ? postLight : postDark;
        if (!set.has(name)) {
          return; // token chỉ khai báo ở mode kia
        }
        const resolved = resolveToken(name, set);
        expect(resolved.isNonEmpty).toBe(true);
        expect(resolved.resolvedValue).not.toContain("var(");
      }),
      { numRuns: 100 },
    );
  });

  it("(B') không cạnh tham chiếu nào vi phạm hướng 3 lớp — deterministic enumeration", () => {
    const violations: string[] = [];
    for (const { mode, set, graph } of modes) {
      for (const name of set.keys()) {
        for (const v of invalidEdgesFrom(name, set, graph)) {
          violations.push(`[${mode}] ${v}`);
        }
      }
    }
    if (violations.length > 0) {
      throw new Error(`Có ${violations.length} cạnh tham chiếu vi phạm hướng 3 lớp (Req 2.1):\n  - ${violations.join("\n  - ")}`);
    }
  });

  it("(C) đồ thị var() acyclic ở cả light & dark — DFS", () => {
    for (const { mode, graph } of modes) {
      const cycle = findCycle(graph);
      if (cycle !== null) {
        throw new Error(`[${mode}] Đồ thị var() có chu trình (vi phạm Req 2.1): ${cycle.join(" → ")}`);
      }
      expect(cycle).toBeNull();
    }
  });

  it("(A') không token baseline nào bị xóa hoặc đổi tên — deterministic enumeration", () => {
    const removed = baselineNames.filter((name) => !existsInPost(name)).sort();
    if (removed.length > 0) {
      const lines: string[] = [];
      lines.push(`Có ${removed.length} token baseline bị XÓA/ĐỔI TÊN so với hệ hiện tại (vi phạm Req 1.3):`);
      for (const n of removed) {
        lines.push(`  - ${n}`);
      }
      lines.push("");
      lines.push("Nếu thay đổi là CÓ CHỦ Ý (rename/refactor token surface), regenerate baseline:");
      lines.push("  writeUnifiedBaseline() trong src/test/ux-ui-upgrade/baseline.ts");
      throw new Error(lines.join("\n"));
    }
  });
});
