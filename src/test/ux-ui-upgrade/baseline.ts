/**
 * Baseline snapshot cho đợt nâng cấp UX/UI (task 1.2) và `global-ui-upgrade`
 * (task 1.1).
 *
 * Mục tiêu: chụp lại trạng thái HIỆN TẠI (trước khi tinh chỉnh `Token_Value`)
 * để các task sau đối chiếu "không hồi quy":
 *
 *   1. `tokenNames`        — toàn bộ `Token_Name` Semantic + Component đang có
 *                            trong `src/styles/tokens.css` (đọc qua token-parser).
 *                            Dùng để khẳng định tập token sau nâng cấp là SUPERSET
 *                            (Property 1 — ux-ui-upgrade task 2.3, và
 *                            global-ui-upgrade Property 1 — task 2.2).
 *   2. `appModeBranching`  — chữ ký nhánh `isRealMode()` / `isDemoMode()` (và các
 *                            hàm quyết định mode) trong `src/app/utils/app-mode.ts`.
 *                            Dùng để khẳng định hành vi phân nhánh real/demo giữ
 *                            nguyên sau đợt nâng cấp (Requirement 9.2).
 *   3. `storageKeys`       — toàn bộ tên storage key production quan sát tĩnh được
 *                            từ `src/**` (re-derive qua `storage-keys-scan.ts`).
 *                            Dùng để khẳng định tập storage key sau nâng cấp là
 *                            SUPERSET của baseline — không đổi tên, không xóa key
 *                            (global-ui-upgrade Property 11 — task 1.2,
 *                            Requirement 9.4).
 *
 * Nguyên tắc task 1.1: KHÔNG đổi tên bất kỳ Design_Token hay storage key nào;
 * baseline chỉ GHI NHẬN trạng thái hiện tại làm mốc bất biến. Module này TÁI SỬ
 * DỤNG hạ tầng scan có sẵn (`token-parser.ts`, `storage-keys-scan.ts`) thay vì
 * dựng công cụ mới, và persist storage-key baseline qua `storage-keys-scan.ts`
 * để giữ MỘT nguồn sự thật cho tập storage key.
 *
 * Module THUẦN, chỉ ĐỌC file ở test-time và (khi được gọi tường minh) GHI snapshot
 * JSON. KHÔNG đụng product code, route, storage hay giá trị token.
 *
 * Tham chiếu Data Models trong design.md → `UpgradeBaseline`.
 *
 * _Requirements: 1.1, 1.3, 9.2, 9.4_
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  collectStorageKeys,
  readStorageKeysBaseline,
  type StorageKeysBaselineSnapshot,
  writeStorageKeysBaseline,
} from "./storage-keys-scan";
import { loadTokenSet, parseTokens, type TokenSet } from "./token-parser";

// ─────────────────────────────────────────────────────────────
// Types (khớp design.md → Data Models → UpgradeBaseline)
// ─────────────────────────────────────────────────────────────

export interface UpgradeBaseline {
  /** Tên token Semantic + Component trước nâng cấp (đã sort, ổn định). */
  tokenNames: ReadonlySet<string>;
  /** Chữ ký nhánh isRealMode()/isDemoMode() (để so khớp Requirement 9.2). */
  appModeBranching: ReadonlySet<string>;
  /**
   * Tên storage key production trước nâng cấp (để so khớp Requirement 9.4 —
   * global-ui-upgrade Property 11). Re-derive qua `storage-keys-scan.ts`.
   */
  storageKeys: ReadonlySet<string>;
}

/** Hình dạng JSON snapshot persist trên đĩa. */
export interface UpgradeBaselineSnapshot {
  /** Nguồn dữ liệu được chụp (ghi chú truy vết). */
  generatedFrom: string;
  /** Số lượng token Semantic + Component. */
  tokenCount: number;
  /** Tên token Semantic + Component, sort tăng dần. */
  tokenNames: string[];
  /** Chữ ký nhánh app-mode, sort tăng dần. */
  appModeBranching: string[];
}

/**
 * Baseline hợp nhất cho `global-ui-upgrade` — gộp mốc bất biến của cả hai bề
 * mặt kiểm chứng (token names cho Property 1, storage keys cho Property 11) đọc
 * từ hai snapshot đã commit. Đây là điểm truy cập DUY NHẤT mà các property test
 * global-ui-upgrade nên dùng để lấy mốc superset.
 */
export interface UnifiedBaselineSnapshot {
  /** Snapshot tên token + chữ ký app-mode (`token-names.baseline.json`). */
  tokens: UpgradeBaselineSnapshot;
  /** Snapshot tập storage key (`storage-keys.baseline.json`). */
  storageKeys: StorageKeysBaselineSnapshot;
}

// ─────────────────────────────────────────────────────────────
// Hằng số đường dẫn
// ─────────────────────────────────────────────────────────────

/** Repo root suy ra từ vị trí module (src/test/ux-ui-upgrade → ../../..). */
const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_REPO_ROOT = path.resolve(MODULE_DIR, "..", "..", "..");

/** Đường dẫn (tương đối repo root) tới module app-mode để trích chữ ký nhánh. */
export const APP_MODE_SOURCE_PATH = "src/app/utils/app-mode.ts";

/** Đường dẫn (tương đối repo root) tới file snapshot tên token. */
export const TOKEN_NAMES_SNAPSHOT_PATH = "src/test/ux-ui-upgrade/__snapshots__/token-names.baseline.json";

/**
 * Các hàm quyết định/phân nhánh real-mode ↔ demo-mode trong `app-mode.ts` cần
 * được chụp baseline để đối chiếu Requirement 9.2. Tập này cố ý hẹp: chỉ gồm
 * logic xác định mode và hai vị từ `isRealMode()`/`isDemoMode()` cùng nhánh seed.
 */
export const APP_MODE_BRANCHING_FNS: readonly string[] = [
  "normalizeAppMode",
  "getAppMode",
  "isDemoMode",
  "isRealMode",
  "shouldSeedDemoData",
];

// ─────────────────────────────────────────────────────────────
// Token names (Semantic + Component)
// ─────────────────────────────────────────────────────────────

/**
 * Trích tập `Token_Name` thuộc lớp Semantic hoặc Component từ một `TokenSet`.
 * Bỏ qua Primitive (lớp 1) vì Requirement 1.1 ràng buộc bảo toàn Semantic +
 * Component.
 */
export function collectSemanticAndComponentTokenNames(set: TokenSet): Set<string> {
  const names = new Set<string>();
  for (const [name, def] of set) {
    if (def.layer === "semantic" || def.layer === "component") {
      names.add(name);
    }
  }
  return names;
}

/**
 * Chụp tập tên token Semantic + Component hiện có, gộp cả Light (`:root`) và
 * Dark (`html.dark`) để chắc chắn không sót token chỉ khai báo ở một mode.
 * (Thực tế tên token đồng nhất giữa hai mode — dark chỉ override giá trị — nhưng
 * union giúp snapshot bền vững trước thay đổi cấu trúc sau này.)
 */
export function captureTokenNames(_repoRoot: string = DEFAULT_REPO_ROOT): Set<string> {
  const lightSet = loadTokenSet({ mode: "light" });
  const darkSet = loadTokenSet({ mode: "dark" });
  const names = new Set<string>([
    ...collectSemanticAndComponentTokenNames(lightSet),
    ...collectSemanticAndComponentTokenNames(darkSet),
  ]);
  return names;
}

// Bản overload đọc trực tiếp từ một chuỗi CSS (tiện cho test thuần).
export function captureTokenNamesFromCss(css: string): Set<string> {
  const lightSet = parseTokens(css, { mode: "light" });
  const darkSet = parseTokens(css, { mode: "dark" });
  return new Set<string>([
    ...collectSemanticAndComponentTokenNames(lightSet),
    ...collectSemanticAndComponentTokenNames(darkSet),
  ]);
}

// ─────────────────────────────────────────────────────────────
// App-mode branching signature
// ─────────────────────────────────────────────────────────────

/** Loại bỏ comment `//...` và `/* ... *​/` khỏi mã nguồn. */
function stripSourceComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

/**
 * Trích trọn khối `function <name>(...) { ... }` bằng cách đếm ngoặc nhọn cân
 * bằng. Trả về `null` nếu không tìm thấy hàm. Yêu cầu source đã strip comment để
 * tránh ngoặc nhọn trong comment làm lệch bộ đếm.
 */
function extractFunctionBlock(source: string, fnName: string): string | null {
  const sigRe = new RegExp(`function\\s+${fnName}\\s*\\(`);
  const sigMatch = sigRe.exec(source);
  if (sigMatch === null) {
    return null;
  }
  const start = sigMatch.index;
  const braceStart = source.indexOf("{", start);
  if (braceStart < 0) {
    return null;
  }
  let depth = 0;
  for (let i = braceStart; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "{") {
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start, i + 1);
      }
    }
  }
  return null;
}

/** Chuẩn hóa khối hàm thành chữ ký một dòng, ổn định (gộp khoảng trắng). */
function normalizeSignature(block: string): string {
  return block.replace(/\s+/g, " ").trim();
}

/**
 * Trích chữ ký nhánh real/demo từ mã nguồn `app-mode.ts`.
 * Mỗi phần tử là chữ ký chuẩn hóa của một hàm trong `APP_MODE_BRANCHING_FNS`.
 * Hàm không tồn tại trong source sẽ bị bỏ qua (an toàn trước refactor cục bộ).
 */
export function extractAppModeBranching(
  source: string,
  fnNames: readonly string[] = APP_MODE_BRANCHING_FNS,
): Set<string> {
  const cleaned = stripSourceComments(source);
  const signatures = new Set<string>();
  for (const fn of fnNames) {
    const block = extractFunctionBlock(cleaned, fn);
    if (block !== null) {
      signatures.add(normalizeSignature(block));
    }
  }
  return signatures;
}

/** Đọc và trích chữ ký nhánh app-mode từ file trên đĩa. */
export function captureAppModeBranching(repoRoot: string = DEFAULT_REPO_ROOT): Set<string> {
  const source = readFileSync(path.resolve(repoRoot, APP_MODE_SOURCE_PATH), "utf8");
  return extractAppModeBranching(source);
}

// ─────────────────────────────────────────────────────────────
// Storage keys (re-derive qua storage-keys-scan — MỘT nguồn sự thật)
// ─────────────────────────────────────────────────────────────

/**
 * Chụp tập tên storage key production hiện có bằng cách tái sử dụng
 * `collectStorageKeys()` từ `storage-keys-scan.ts` (3 pattern: call site, const
 * literal, named-export array/record). KHÔNG đổi tên/khóa nào — chỉ ghi nhận.
 */
export function captureStorageKeys(repoRoot: string = DEFAULT_REPO_ROOT): Set<string> {
  return collectStorageKeys({ repoRoot });
}

// ─────────────────────────────────────────────────────────────
// Capture baseline + persist snapshot
// ─────────────────────────────────────────────────────────────

/** Chụp toàn bộ `UpgradeBaseline` từ trạng thái hiện tại của repo. */
export function captureBaseline(repoRoot: string = DEFAULT_REPO_ROOT): UpgradeBaseline {
  return {
    tokenNames: captureTokenNames(repoRoot),
    appModeBranching: captureAppModeBranching(repoRoot),
    storageKeys: captureStorageKeys(repoRoot),
  };
}

/** Chuyển `UpgradeBaseline` thành hình dạng JSON ổn định (đã sort). */
export function toSnapshot(baseline: UpgradeBaseline): UpgradeBaselineSnapshot {
  const tokenNames = [...baseline.tokenNames].sort();
  const appModeBranching = [...baseline.appModeBranching].sort();
  return {
    generatedFrom: `${"src/styles/tokens.css"} + ${APP_MODE_SOURCE_PATH}`,
    tokenCount: tokenNames.length,
    tokenNames,
    appModeBranching,
  };
}

/** Đọc snapshot đã commit từ đĩa (ném lỗi nếu chưa tồn tại). */
export function readBaselineSnapshot(repoRoot: string = DEFAULT_REPO_ROOT): UpgradeBaselineSnapshot {
  const raw = readFileSync(path.resolve(repoRoot, TOKEN_NAMES_SNAPSHOT_PATH), "utf8");
  return JSON.parse(raw) as UpgradeBaselineSnapshot;
}

/**
 * Ghi snapshot baseline ra đĩa (tạo thư mục `__snapshots__` nếu thiếu).
 * Chỉ nên gọi MỘT LẦN tại thời điểm trước khi tinh chỉnh `Token_Value`.
 * Trả về snapshot đã ghi.
 */
export function writeBaselineSnapshot(repoRoot: string = DEFAULT_REPO_ROOT): UpgradeBaselineSnapshot {
  const snapshot = toSnapshot(captureBaseline(repoRoot));
  const outPath = path.resolve(repoRoot, TOKEN_NAMES_SNAPSHOT_PATH);
  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  return snapshot;
}

// ─────────────────────────────────────────────────────────────
// Baseline hợp nhất cho global-ui-upgrade (token names + storage keys)
// ─────────────────────────────────────────────────────────────

/**
 * Đọc baseline hợp nhất đã commit cho `global-ui-upgrade`: gộp snapshot tên
 * token (`token-names.baseline.json`) và snapshot storage key
 * (`storage-keys.baseline.json`). Đây là mốc bất biến cho superset check của
 * Property 1 (token names) và Property 11 (storage keys). Ném lỗi nếu một trong
 * hai snapshot chưa tồn tại.
 */
export function readUnifiedBaseline(repoRoot: string = DEFAULT_REPO_ROOT): UnifiedBaselineSnapshot {
  return {
    tokens: readBaselineSnapshot(repoRoot),
    storageKeys: readStorageKeysBaseline(repoRoot),
  };
}

/**
 * Ghi CẢ HAI snapshot baseline (token names + storage keys) từ trạng thái hiện
 * tại của repo. Chỉ nên gọi MỘT LẦN khi cần tạo/regenerate mốc baseline có chủ
 * ý (task 1.1). Trả về baseline hợp nhất đã ghi.
 *
 * Lưu ý: hàm tái sử dụng `writeStorageKeysBaseline()` để giữ MỘT nguồn sự thật
 * cho tập storage key (`storage-keys.baseline.json`), tránh nhân bản dữ liệu.
 */
export function writeUnifiedBaseline(repoRoot: string = DEFAULT_REPO_ROOT): UnifiedBaselineSnapshot {
  return {
    tokens: writeBaselineSnapshot(repoRoot),
    storageKeys: writeStorageKeysBaseline(repoRoot),
  };
}
