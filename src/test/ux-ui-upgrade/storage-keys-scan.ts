/**
 * Storage-key scanner thuần (test-time / build-time) cho đợt nâng cấp UX/UI.
 *
 * Phạm vi: phục vụ Property 9 (task 10.1) — chứng minh tập tên storage key của
 * codebase BẤT BIẾN qua đợt nâng cấp visual refresh.
 *
 * Module này chỉ ĐỌC mã nguồn frontend production và TRẢ ra một `Set<string>`
 * chứa tên các storage key có thể quan sát được tĩnh từ source. Nó KHÔNG sửa
 * product code, không đổi token, không chạm storage shape, không chạm route.
 *
 * Chiến lược re-derive (deterministic) — gộp ba pattern bổ trợ nhau:
 *   A) Trực tiếp tại call site: literal đầu tiên truyền vào
 *      `(window\.)?\b(?:local|session)Storage\.(?:getItem|setItem|removeItem)(...)`.
 *      Hỗ trợ cả `"..."`, `'...'`, và phần đầu tĩnh của template literal `\`X${...}\``.
 *   B) Khai báo top-level `const NAME = "literal"` mà NAME là tên hằng theo quy
 *      ước storage key (`*_KEY`, `*_KEYS`, `*_PREFIX`, hoặc đúng `STORAGE_KEY` /
 *      `STORAGE_PREFIX`). Lọc giá trị bằng heuristic non-CSS, non-color.
 *   C) Các named export trong `src/app/utils/storage-constants.ts` chứa danh
 *      sách / record tập trung: `APP_STORAGE_KEYS`, `BACKEND_LINK_STORAGE_KEYS`,
 *      `AUXILIARY_USER_DATA_STORAGE_KEYS`, `AUXILIARY_USER_DATA_STORAGE_PREFIXES`
 *      — extract toàn bộ string literal trong khối được khai báo bằng cách
 *      đếm dấu ngoặc cân bằng.
 *
 * Phạm vi quét:
 *   - Mọi file `.ts`/`.tsx` trong `src/`, KHÔNG bao gồm test/spec/stories,
 *     `src/test/**`, `**\/__tests__/**`, `**\/__mocks__/**`. Lý do: test fixture
 *     có thể tạo storage key tổng hợp không thuộc production surface.
 *
 * Hợp đồng:
 *   - Hàm `collectStorageKeys()` thuần: cùng input cây file ⇒ cùng output.
 *   - Không phụ thuộc DOM/window; không I/O ngoài `fs.readFileSync`/`readdirSync`.
 *
 * _Requirements: 10.1_
 */

import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ─────────────────────────────────────────────────────────────
// Đường dẫn / cấu hình quét
// ─────────────────────────────────────────────────────────────

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));

/** Repo root suy ra từ vị trí module (src/test/ux-ui-upgrade → ../../..). */
export const DEFAULT_REPO_ROOT = path.resolve(MODULE_DIR, "..", "..", "..");

/** Roots quét production source (tương đối repo root). */
export const DEFAULT_SCAN_ROOTS: readonly string[] = ["src"];

/** Tệp `storage-constants.ts` chứa các named-export tập trung. */
export const STORAGE_CONSTANTS_RELATIVE_PATH = "src/app/utils/storage-constants.ts";

/** Snapshot baseline đã commit ra đĩa. */
export const STORAGE_KEYS_SNAPSHOT_PATH = "src/test/ux-ui-upgrade/__snapshots__/storage-keys.baseline.json";

const SCANNABLE_EXTENSIONS = new Set([".ts", ".tsx"]);

/** Thư mục bị loại khỏi quét (test fixture, mock, harness). */
const EXCLUDED_DIR_NAMES = new Set<string>(["__tests__", "__mocks__", "test", "tests"]);

function isTestFile(file: string): boolean {
  return /\.(test|spec|stories)\.[jt]sx?$/.test(file);
}

function isScannable(file: string): boolean {
  return SCANNABLE_EXTENSIONS.has(path.extname(file)) && !isTestFile(file);
}

function* walk(dir: string): Generator<string> {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (EXCLUDED_DIR_NAMES.has(entry)) continue;
    const full = path.join(dir, entry);
    let stat: ReturnType<typeof statSync>;
    try {
      stat = statSync(full);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      yield* walk(full);
    } else if (isScannable(full)) {
      yield full;
    }
  }
}

/**
 * Liệt kê toàn bộ tệp production `.ts`/`.tsx` dưới các roots, đã loại
 * test/spec/stories và các thư mục test fixture. Kết quả sort tăng dần để
 * output ổn định.
 */
export function listProductionSources(
  repoRoot: string = DEFAULT_REPO_ROOT,
  roots: readonly string[] = DEFAULT_SCAN_ROOTS,
): string[] {
  const out = new Set<string>();
  for (const rel of roots) {
    const abs = path.resolve(repoRoot, rel);
    let stat: ReturnType<typeof statSync>;
    try {
      stat = statSync(abs);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      for (const f of walk(abs)) out.add(f);
    } else if (stat.isFile() && isScannable(abs)) {
      out.add(abs);
    }
  }
  return [...out].sort();
}

// ─────────────────────────────────────────────────────────────
// Pattern A — literal đầu tiên tại call site Storage method
// ─────────────────────────────────────────────────────────────

/** Direct call: `localStorage.X("KEY", ...)` (double-quoted). */
const STORAGE_CALL_DOUBLE =
  /(?:window\.)?\b(?:local|session)Storage\s*\.\s*(?:getItem|setItem|removeItem)\s*\(\s*"((?:[^"\\]|\\.)+)"/g;

/** Direct call: `localStorage.X('KEY', ...)` (single-quoted). */
const STORAGE_CALL_SINGLE =
  /(?:window\.)?\b(?:local|session)Storage\s*\.\s*(?:getItem|setItem|removeItem)\s*\(\s*'((?:[^'\\]|\\.)+)'/g;

/**
 * Template literal head: `localStorage.X(\`PREFIX${...}...\`, ...)`. Capture
 * phần tĩnh trước `${` đầu tiên (hoặc trước backtick đóng nếu không có
 * interpolation). Đoạn tĩnh phải có ≥ 1 ký tự để được capture.
 *
 * Lưu ý: regex chỉ bắt đoạn tĩnh ở ĐẦU template; các đoạn tĩnh giữa hai `${}`
 * không được capture (đánh đổi đơn giản hoá; những key đó được bù bởi Pattern B/C).
 */
const STORAGE_CALL_TEMPLATE_HEAD =
  /(?:window\.)?\b(?:local|session)Storage\s*\.\s*(?:getItem|setItem|removeItem)\s*\(\s*`([^${}`]+)/g;

export function scanCallSiteLiterals(content: string): Set<string> {
  const out = new Set<string>();
  for (const m of content.matchAll(STORAGE_CALL_DOUBLE)) out.add(m[1]);
  for (const m of content.matchAll(STORAGE_CALL_SINGLE)) out.add(m[1]);
  for (const m of content.matchAll(STORAGE_CALL_TEMPLATE_HEAD)) {
    const head = m[1];
    if (head.length > 0) out.add(head);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────
// Pattern B — top-level const NAME = "literal" theo quy ước storage key
// ─────────────────────────────────────────────────────────────

/**
 * Hằng top-level (đầu dòng, có thể có `export`) gán bằng MỘT string literal đơn.
 * Bỏ qua template literal & biểu thức phức tạp để tránh bắt giá trị suy ra
 * động (Pattern A đảm nhiệm các tham chiếu suy ra qua identifier).
 */
const TOP_LEVEL_CONST_LITERAL =
  /^\s*(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:"((?:[^"\\]|\\.)+)"|'((?:[^'\\]|\\.)+)')\s*;/gm;

/**
 * Tên hằng "trông như" tên gán cho storage key. Không cần chứa "STORAGE" miễn
 * là kết thúc bằng `_KEY`/`_KEYS`/`_PREFIX`, hoặc tên hằng đúng bằng
 * `STORAGE_KEY`/`STORAGE_PREFIX` (mẫu module-private phổ biến).
 */
function isStorageKeyName(name: string): boolean {
  if (name === "STORAGE_KEY" || name === "STORAGE_PREFIX") return true;
  return /(?:_KEY|_KEYS|_PREFIX)$/.test(name);
}

/**
 * Heuristic loại false-positive: giá trị phải đủ dài, không phải CSS variable
 * (`--…`) hay hex color (`#…`). Storage key thật trong codebase đều ≥ 3 ký tự
 * và không bắt đầu bằng `--` / `#`.
 */
function isStorageKeyValue(value: string): boolean {
  if (value.length < 3) return false;
  if (value.startsWith("--")) return false;
  if (value.startsWith("#")) return false;
  return true;
}

export function scanStorageKeyConstants(content: string): Set<string> {
  const out = new Set<string>();
  for (const m of content.matchAll(TOP_LEVEL_CONST_LITERAL)) {
    const name = m[1];
    const value = m[2] ?? m[3] ?? "";
    if (!isStorageKeyName(name)) continue;
    if (!isStorageKeyValue(value)) continue;
    out.add(value);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────
// Pattern C — named-export array/record trong storage-constants.ts
// ─────────────────────────────────────────────────────────────

/**
 * Các named export tập trung quản lý storage key/prefix. Pattern C bắt mọi
 * string literal trong khối ngoặc cân bằng (`[...]` cho array, `{...}` cho
 * record) gán cho các tên này.
 */
const STORAGE_CONSTANTS_NAMED_EXPORTS = [
  "APP_STORAGE_KEYS",
  "BACKEND_LINK_STORAGE_KEYS",
  "AUXILIARY_USER_DATA_STORAGE_KEYS",
  "AUXILIARY_USER_DATA_STORAGE_PREFIXES",
] as const;

/**
 * Trích khối `[...]` hoặc `{...}` được gán cho `name` bằng cách đếm ngoặc cân
 * bằng. Trả `null` nếu không tìm thấy.
 */
function extractBalancedBlock(content: string, name: string, opener: "[" | "{"): string | null {
  const re = new RegExp(`\\b${name}\\b\\s*=\\s*\\${opener}`);
  const m = re.exec(content);
  if (m === null) return null;
  // Vị trí ký tự mở thực tế = ký tự cuối của khớp (đã bao gồm opener).
  const startIdx = m.index + m[0].length - 1;
  const closer = opener === "[" ? "]" : "}";
  let depth = 0;
  for (let i = startIdx; i < content.length; i += 1) {
    const ch = content[i];
    if (ch === opener) {
      depth += 1;
    } else if (ch === closer) {
      depth -= 1;
      if (depth === 0) return content.slice(startIdx, i + 1);
    }
  }
  return null;
}

function extractStringLiteralsFromBlock(block: string): Set<string> {
  const out = new Set<string>();
  for (const m of block.matchAll(/"((?:[^"\\]|\\.)+)"/g)) out.add(m[1]);
  for (const m of block.matchAll(/'((?:[^'\\]|\\.)+)'/g)) out.add(m[1]);
  return out;
}

export function scanStorageConstantsArrays(repoRoot: string = DEFAULT_REPO_ROOT): Set<string> {
  const filePath = path.resolve(repoRoot, STORAGE_CONSTANTS_RELATIVE_PATH);
  let content: string;
  try {
    content = readFileSync(filePath, "utf8");
  } catch {
    return new Set();
  }
  const out = new Set<string>();
  for (const name of STORAGE_CONSTANTS_NAMED_EXPORTS) {
    for (const opener of ["[", "{"] as const) {
      const block = extractBalancedBlock(content, name, opener);
      if (block !== null) {
        for (const lit of extractStringLiteralsFromBlock(block)) {
          if (isStorageKeyValue(lit)) out.add(lit);
        }
        break;
      }
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

export interface StorageKeyScanOptions {
  repoRoot?: string;
  roots?: readonly string[];
}

/**
 * Re-derive deterministically tập tên storage key của codebase tại thời điểm
 * gọi. Trả `Set<string>` đã được gộp từ ba pattern (call site, const literal,
 * named export array/record).
 */
export function collectStorageKeys(options: StorageKeyScanOptions = {}): Set<string> {
  const repoRoot = options.repoRoot ?? DEFAULT_REPO_ROOT;
  const roots = options.roots ?? DEFAULT_SCAN_ROOTS;
  const sources = listProductionSources(repoRoot, roots);

  const all = new Set<string>();
  for (const file of sources) {
    const content = readFileSync(file, "utf8");
    for (const k of scanCallSiteLiterals(content)) all.add(k);
    for (const k of scanStorageKeyConstants(content)) all.add(k);
  }
  for (const k of scanStorageConstantsArrays(repoRoot)) all.add(k);

  return all;
}

// ─────────────────────────────────────────────────────────────
// Snapshot baseline (persist trên đĩa)
// ─────────────────────────────────────────────────────────────

export interface StorageKeysBaselineSnapshot {
  /** Nguồn dữ liệu được chụp (truy vết). */
  generatedFrom: string;
  /** Số lượng key. */
  keyCount: number;
  /** Tên storage key, sort tăng dần (ổn định cho diff). */
  keys: string[];
}

export function toSnapshot(keys: ReadonlySet<string>): StorageKeysBaselineSnapshot {
  const sorted = [...keys].sort();
  return {
    generatedFrom: `production sources under ${DEFAULT_SCAN_ROOTS.join(", ")} + ${STORAGE_CONSTANTS_RELATIVE_PATH}`,
    keyCount: sorted.length,
    keys: sorted,
  };
}

export function readStorageKeysBaseline(repoRoot: string = DEFAULT_REPO_ROOT): StorageKeysBaselineSnapshot {
  const raw = readFileSync(path.resolve(repoRoot, STORAGE_KEYS_SNAPSHOT_PATH), "utf8");
  return JSON.parse(raw) as StorageKeysBaselineSnapshot;
}

/**
 * Ghi snapshot tập storage key ra đĩa (tạo `__snapshots__` nếu thiếu). Chỉ
 * được gọi MỘT LẦN khi cần tạo baseline; sau đó test sẽ ĐỌC baseline đã commit.
 */
export function writeStorageKeysBaseline(repoRoot: string = DEFAULT_REPO_ROOT): StorageKeysBaselineSnapshot {
  const snapshot = toSnapshot(collectStorageKeys({ repoRoot }));
  const outPath = path.resolve(repoRoot, STORAGE_KEYS_SNAPSHOT_PATH);
  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  return snapshot;
}
