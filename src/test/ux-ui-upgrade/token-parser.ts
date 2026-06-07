/**
 * Token parser thuần (test-time / build-time) cho đợt nâng cấp UX/UI.
 *
 * Phạm vi: chỉ đọc và phân tích `src/styles/tokens.css` thành cấu trúc dữ liệu
 * phục vụ verification harness (Property 1 & 4). KHÔNG đụng tới product code,
 * route, storage hay giá trị token. Đây là module thuần, không side effect ngoài
 * `readTokensCss`/`loadTokenSet` (đọc file ở test-time).
 *
 * Tham chiếu Data Models trong design.md:
 *   - TokenLayer, TokenValueKind, TokenDefinition, TokenSet, ResolvedToken
 *
 * _Requirements: 1.3, 1.5_
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// ─────────────────────────────────────────────────────────────
// Types (khớp design.md → Data Models)
// ─────────────────────────────────────────────────────────────

export type TokenLayer = "primitive" | "semantic" | "component";

export type TokenValueKind = "color" | "length" | "shadow" | "fontFamily" | "number" | "other";

export interface TokenDefinition {
  /** ví dụ "--app-accent" — BẤT BIẾN qua đợt nâng cấp */
  name: string;
  layer: TokenLayer;
  /** ví dụ "var(--green-700)" hoặc "#2A5447" (đã normalize whitespace) */
  rawValue: string;
  /** suy ra từ vai trò token / literal value */
  kind: TokenValueKind;
}

export type TokenSet = Map<string /* name */, TokenDefinition>;

export interface ResolvedToken {
  name: string;
  /** literal cuối cùng sau khi đi hết chuỗi var() */
  resolvedValue: string;
  isNonEmpty: boolean;
  /** giá trị hợp kiểu mà token khai báo */
  kindValid: boolean;
}

/** Đồ thị tham chiếu: name → danh sách tên token được tham chiếu qua var(). */
export type ReferenceGraph = Map<string, string[]>;

export type ThemeMode = "light" | "dark";

export interface ParseOptions {
  /** "light" (mặc định) đọc `:root`; "dark" đọc `:root` rồi override bằng `html.dark`. */
  mode?: ThemeMode;
}

// ─────────────────────────────────────────────────────────────
// Hằng số phân loại
// ─────────────────────────────────────────────────────────────

const COMPONENT_PREFIXES = ["--btn-", "--input-", "--card-", "--progress-", "--tag-", "--reflection-"] as const;

const SEMANTIC_PREFIX = "--app-";

const NAMED_COLOR_KEYWORDS = new Set(["transparent", "currentcolor", "inherit", "white", "black"]);

export const DEFAULT_TOKENS_CSS_PATH = "src/styles/tokens.css";

// ─────────────────────────────────────────────────────────────
// Phân loại layer
// ─────────────────────────────────────────────────────────────

export function classifyLayer(name: string): TokenLayer {
  if (name.startsWith(SEMANTIC_PREFIX)) {
    return "semantic";
  }
  if (COMPONENT_PREFIXES.some((prefix) => name.startsWith(prefix))) {
    return "component";
  }
  return "primitive";
}

// ─────────────────────────────────────────────────────────────
// Phân loại kind từ một literal value (không còn var())
// ─────────────────────────────────────────────────────────────

export function classifyLiteralKind(value: string): TokenValueKind {
  const v = value.trim();
  if (!v) {
    return "other";
  }

  // Pure color literal: #hex hoặc rgb()/hsl() kín, không kèm offset px (loại shadow).
  if (/^#([0-9a-fA-F]{3,8})$/.test(v)) {
    return "color";
  }
  if (/^(rgb|rgba|hsl|hsla)\([^)]*\)$/i.test(v) && !/\d+px/i.test(v)) {
    return "color";
  }
  if (NAMED_COLOR_KEYWORDS.has(v.toLowerCase())) {
    return "color";
  }

  // Font family: chứa keyword font hoặc danh sách có chuỗi trích dẫn.
  if (/(sans-serif|serif|monospace|system-ui|ui-sans-serif|ui-serif)/i.test(v) || (v.includes(",") && /["']/.test(v))) {
    return "fontFamily";
  }

  // Shadow / box-shadow / focus ring: có offset px kèm thành phần màu.
  if (/\d+px/i.test(v) && /(rgba?\(|hsla?\(|#[0-9a-fA-F])/i.test(v)) {
    return "shadow";
  }

  // Length đơn (px/rem/em/%...)
  if (/^-?[\d.]+(px|rem|em|%|vh|vw|vmin|vmax|ch|pt)$/i.test(v)) {
    return "length";
  }

  // Số thuần
  if (/^-?[\d.]+$/.test(v)) {
    return "number";
  }

  return "other";
}

/**
 * Suy ra kind tại thời điểm parse.
 * - Nếu rawValue là literal (không có var()) → phân loại trực tiếp.
 * - Nếu là tham chiếu var() → suy ra theo vai trò tên token (shadow/length/font/color).
 *   Cách này giữ cho `kindValid` (so literal phân giải với kind khai báo) có ý nghĩa,
 *   thay vì tautology.
 */
export function inferKind(name: string, rawValue: string): TokenValueKind {
  if (!/var\(/.test(rawValue)) {
    return classifyLiteralKind(rawValue);
  }
  if (/shadow|focus-ring/.test(name)) {
    return "shadow";
  }
  if (/radius|gap|padding/.test(name)) {
    return "length";
  }
  if (/font/.test(name)) {
    return "fontFamily";
  }
  return "color";
}

// ─────────────────────────────────────────────────────────────
// Parse CSS → TokenSet
// ─────────────────────────────────────────────────────────────

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

function normalizeValue(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

interface CssBlock {
  selector: string;
  body: string;
}

function extractBlocks(css: string): CssBlock[] {
  const blocks: CssBlock[] = [];
  // Custom property values trong file này không chứa "{" hay "}",
  // nên match khối top-level đơn giản là đủ và an toàn.
  const blockRe = /([^{}]+)\{([^{}]*)\}/g;
  let match: RegExpExecArray | null = blockRe.exec(css);
  while (match !== null) {
    blocks.push({ selector: match[1].trim(), body: match[2] });
    match = blockRe.exec(css);
  }
  return blocks;
}

function blockApplies(selector: string, mode: ThemeMode): boolean {
  const isTheme = selector.includes("@theme");
  const isDark = /html\.dark|\.dark\b/.test(selector);
  const isRoot = selector.includes(":root");

  // Bridge (@theme inline) nằm ngoài hệ 3 lớp → bỏ qua.
  if (isTheme) {
    return false;
  }
  if (isDark) {
    return mode === "dark";
  }
  return isRoot;
}

function parseDeclarations(body: string): Array<[string, string]> {
  const decls: Array<[string, string]> = [];
  for (const chunk of body.split(";")) {
    const decl = chunk.trim();
    if (!decl) {
      continue;
    }
    const m = /^(--[\w-]+)\s*:\s*([\s\S]+)$/.exec(decl);
    if (!m) {
      continue;
    }
    decls.push([m[1], normalizeValue(m[2])]);
  }
  return decls;
}

/**
 * Parse nội dung `tokens.css` thành TokenSet.
 * Bỏ qua bridge `@theme inline`; chỉ giữ hệ 3 lớp (primitive/semantic/component).
 * Mode "dark" sẽ override giá trị `:root` bằng `html.dark`.
 */
export function parseTokens(css: string, options: ParseOptions = {}): TokenSet {
  const mode = options.mode ?? "light";
  const cleaned = stripComments(css);
  const set: TokenSet = new Map();

  for (const block of extractBlocks(cleaned)) {
    if (!blockApplies(block.selector, mode)) {
      continue;
    }
    for (const [name, rawValue] of parseDeclarations(block.body)) {
      set.set(name, {
        name,
        layer: classifyLayer(name),
        rawValue,
        kind: inferKind(name, rawValue),
      });
    }
  }

  return set;
}

// ─────────────────────────────────────────────────────────────
// Resolve token (đi hết chuỗi var() tới literal Primitive)
// ─────────────────────────────────────────────────────────────

const VAR_RE = /var\(\s*(--[\w-]+)\s*(?:,\s*([^)]+))?\)/g;

function substituteVars(rawValue: string, set: TokenSet, stack: string[]): string {
  return rawValue.replace(VAR_RE, (_match, refName: string, fallback?: string) => {
    const fb = fallback != null ? fallback.trim() : "";
    // Phát hiện chu trình → dừng, dùng fallback nếu có.
    if (stack.includes(refName)) {
      return fb;
    }
    const ref = set.get(refName);
    if (!ref) {
      // Tham chiếu treo → dùng fallback nếu có, ngược lại rỗng.
      return fb;
    }
    return substituteVars(ref.rawValue, set, [...stack, refName]).trim();
  });
}

/**
 * Phân giải token: đi hết chuỗi var() về literal Primitive.
 * Trả ResolvedToken { resolvedValue, isNonEmpty, kindValid }.
 */
export function resolveToken(name: string, set: TokenSet): ResolvedToken {
  const def = set.get(name);
  if (!def) {
    return { name, resolvedValue: "", isNonEmpty: false, kindValid: false };
  }

  const resolvedValue = normalizeValue(substituteVars(def.rawValue, set, [name]));
  const isNonEmpty = resolvedValue.length > 0 && !resolvedValue.includes("var(");
  const kindValid = !isNonEmpty ? false : def.kind === "other" ? true : classifyLiteralKind(resolvedValue) === def.kind;

  return { name, resolvedValue, isNonEmpty, kindValid };
}

// ─────────────────────────────────────────────────────────────
// Reference graph
// ─────────────────────────────────────────────────────────────

/**
 * Dựng đồ thị tham chiếu từ các `var(--x)` trong rawValue của mỗi token.
 * Trả Map<name, refs[]>; refs có thể chứa tên không tồn tại trong set (treo)
 * để consumer tự kiểm tra.
 */
export function buildReferenceGraph(set: TokenSet): ReferenceGraph {
  const graph: ReferenceGraph = new Map();
  for (const [name, def] of set) {
    const refs: string[] = [];
    const re = /var\(\s*(--[\w-]+)/g;
    let m: RegExpExecArray | null = re.exec(def.rawValue);
    while (m !== null) {
      refs.push(m[1]);
      m = re.exec(def.rawValue);
    }
    graph.set(name, refs);
  }
  return graph;
}

// ─────────────────────────────────────────────────────────────
// Loader tiện ích (test-time)
// ─────────────────────────────────────────────────────────────

export function readTokensCss(path: string = DEFAULT_TOKENS_CSS_PATH): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

export function loadTokenSet(options?: ParseOptions): TokenSet {
  return parseTokens(readTokensCss(), options);
}
