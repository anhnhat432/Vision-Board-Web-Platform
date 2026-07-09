/**
 * Calm-style static scanner (test-time only) cho Requirement 10.5.
 *
 * Requirement 10.5 cấm Core_Flow_UI dùng:
 *   - hiệu ứng chuyển động có thời lượng > 300ms,
 *   - hiệu ứng lặp lại / tự động phát liên tục,
 *   - hiệu ứng glow,
 *   - biến đổi 3D (perspective hoặc rotate theo trục 3D).
 *
 * Scanner này CHỈ ĐỌC file nguồn và TRẢ danh sách vi phạm. Nó phát hiện hai loại
 * vi phạm **không mơ hồ** và có thể detect tĩnh một cách tin cậy:
 *
 *   1. `motion-duration`: Tailwind duration utility > 300ms — cả dạng số
 *      (`duration-500`, `duration-1000`) lẫn dạng arbitrary (`duration-[0.5s]`,
 *      `duration-[400ms]`). `duration-300` và nhỏ hơn được coi là hợp lệ.
 *   2. `transform-3d`: biến đổi 3D — `rotate-x-*` / `rotate-y-*` (Tailwind),
 *      `rotateX(` / `rotateY(` / `rotate3d(` / `perspective(` / `translateZ(` /
 *      `translate3d(` (CSS value), `preserve-3d`, `transform-style: preserve-3d`,
 *      `transform-3d`, `perspective:` / `perspective-[`, `backface-visibility`.
 *
 * KHÔNG phát hiện glow (box-shadow màu accent + blur lớn) và loop/autoplay
 * (`animate-spin`, `animate-pulse`, ...) vì các mẫu này quá dễ tạo false positive
 * (spinner / skeleton là affordance chức năng hợp lệ). Việc giữ scanner hẹp lại
 * đúng phần đo được chắc chắn giúp nó là một guard có ý nghĩa, không phải no-op.
 *
 * Đây là tiện ích THUẦN: không sửa product code, không đổi token/route/storage.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { DEFAULT_REPO_ROOT } from "./token-scan";

/** Loại vi phạm calm-style. */
export type CalmViolationKind = "motion-duration" | "transform-3d";

/** Một vi phạm calm-style đơn lẻ. */
export interface CalmViolation {
  /** Đường dẫn tương đối so với repo root (dùng slash, ổn định khi báo cáo). */
  relativePath: string;
  /** Dòng (1-indexed). */
  line: number;
  /** Loại vi phạm. */
  kind: CalmViolationKind;
  /** Chuỗi khớp được, ví dụ `duration-500` hoặc `preserve-3d`. */
  matched: string;
}

/**
 * Các thư mục Core_Flow_UI theo Requirement 10.5 (tương đối repo root).
 * Duyệt đệ quy, gom `.ts`/`.tsx` (trừ file test/spec/stories).
 */
export const CALM_STYLE_ROOTS: readonly string[] = [
  "src/app/pages",
  "src/app/components",
  "src/features/dashboard",
  "src/features/plan12week",
];

const SCANNABLE_EXTENSIONS = new Set([".ts", ".tsx"]);

function isTestLikeFile(filePath: string): boolean {
  return /\.(test|spec|stories)\.[jt]sx?$/.test(filePath);
}

function isScannableFile(filePath: string): boolean {
  return SCANNABLE_EXTENSIONS.has(path.extname(filePath)) && !isTestLikeFile(filePath);
}

/** Duyệt đệ quy một thư mục, trả danh sách file có thể quét (tuyệt đối). */
function collectFilesFromDir(dir: string): string[] {
  const out: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry);
    let stat: ReturnType<typeof statSync>;
    try {
      stat = statSync(full);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      out.push(...collectFilesFromDir(full));
    } else if (isScannableFile(full)) {
      out.push(full);
    }
  }
  return out;
}

/** Phân giải `CALM_STYLE_ROOTS` thành danh sách file tuyệt đối đã sort + dedupe. */
export function resolveCalmStyleFiles(
  repoRoot: string = DEFAULT_REPO_ROOT,
  roots: readonly string[] = CALM_STYLE_ROOTS,
): string[] {
  const files = new Set<string>();
  for (const rel of roots) {
    const abs = path.resolve(repoRoot, rel);
    let stat: ReturnType<typeof statSync>;
    try {
      stat = statSync(abs);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      for (const f of collectFilesFromDir(abs)) files.add(f);
    } else if (isScannableFile(abs)) {
      files.add(abs);
    }
  }
  return [...files].sort();
}

/** Chuyển chuỗi thời lượng CSS (`500ms`, `0.5s`, `.4s`) sang mili-giây, hoặc null. */
export function parseDurationToMs(raw: string): number | null {
  const value = raw.trim();
  const msMatch = /^(\d*\.?\d+)ms$/.exec(value);
  if (msMatch) return Number.parseFloat(msMatch[1]);
  const sMatch = /^(\d*\.?\d+)s$/.exec(value);
  if (sMatch) return Number.parseFloat(sMatch[1]) * 1000;
  return null;
}

/** Ngưỡng tối đa cho phép (ms). Req 10.5: KHÔNG vượt quá 300ms. */
export const MAX_MOTION_DURATION_MS = 300;

// Tailwind numeric duration: `duration-500`, `group-hover:duration-700`, ...
// (không khớp arbitrary `duration-[...]`).
const NUMERIC_DURATION_REGEX = /\bduration-(\d+)\b/g;
// Tailwind arbitrary duration: `duration-[0.5s]`, `duration-[400ms]`.
const ARBITRARY_DURATION_REGEX = /\bduration-\[([^\]]+)\]/g;

// Mẫu biến đổi 3D không mơ hồ. `label` (nếu có) chuẩn hoá `matched` để signature
// ổn định, không phụ thuộc các class xung quanh trên cùng dòng.
const TRANSFORM_3D_PATTERNS: ReadonlyArray<{ regex: RegExp; label?: string }> = [
  { regex: /\brotate-[xy]-[\w.[\]-]+/g }, // Tailwind rotate-x-*, rotate-y-*
  { regex: /\brotateX\s*\(/g, label: "rotateX(" },
  { regex: /\brotateY\s*\(/g, label: "rotateY(" },
  { regex: /\brotate3d\s*\(/g, label: "rotate3d(" },
  // Mọi dạng perspective (CSS property, hàm, arbitrary utility) → 1 label.
  { regex: /\bperspective\s*[:(]|\bperspective-\[/g, label: "perspective" },
  { regex: /\btranslateZ\s*\(/g, label: "translateZ(" },
  { regex: /\btranslate3d\s*\(/g, label: "translate3d(" },
  { regex: /preserve-3d/g, label: "preserve-3d" },
  { regex: /\btransform-3d\b/g, label: "transform-3d" },
  { regex: /\bbackface-visibility\b/g, label: "backface-visibility" },
  { regex: /\bbackface-hidden\b/g, label: "backface-hidden" },
];

/** Quét nội dung một file, trả danh sách vi phạm calm-style. */
export function scanCalmContent(relativePath: string, content: string): CalmViolation[] {
  const violations: CalmViolation[] = [];
  const lines = content.split(/\r\n|\r|\n/);

  lines.forEach((lineText, index) => {
    const lineNo = index + 1;

    // 1. Numeric duration > 300ms.
    NUMERIC_DURATION_REGEX.lastIndex = 0;
    let m: RegExpExecArray | null = NUMERIC_DURATION_REGEX.exec(lineText);
    while (m !== null) {
      const ms = Number.parseInt(m[1], 10);
      if (ms > MAX_MOTION_DURATION_MS) {
        violations.push({ relativePath, line: lineNo, kind: "motion-duration", matched: m[0] });
      }
      m = NUMERIC_DURATION_REGEX.exec(lineText);
    }

    // 1b. Arbitrary duration > 300ms.
    ARBITRARY_DURATION_REGEX.lastIndex = 0;
    m = ARBITRARY_DURATION_REGEX.exec(lineText);
    while (m !== null) {
      const ms = parseDurationToMs(m[1]);
      if (ms !== null && ms > MAX_MOTION_DURATION_MS) {
        violations.push({ relativePath, line: lineNo, kind: "motion-duration", matched: m[0] });
      }
      m = ARBITRARY_DURATION_REGEX.exec(lineText);
    }

    // 2. 3D transforms.
    for (const { regex, label } of TRANSFORM_3D_PATTERNS) {
      regex.lastIndex = 0;
      let t: RegExpExecArray | null = regex.exec(lineText);
      while (t !== null) {
        violations.push({
          relativePath,
          line: lineNo,
          kind: "transform-3d",
          matched: label ?? t[0].trim(),
        });
        if (t.index === regex.lastIndex) regex.lastIndex += 1;
        t = regex.exec(lineText);
      }
    }
  });

  return violations;
}

/** Đọc + quét toàn bộ Core_Flow_UI, trả danh sách vi phạm đã sort ổn định. */
export function scanCalmStyle(repoRoot: string = DEFAULT_REPO_ROOT): CalmViolation[] {
  const files = resolveCalmStyleFiles(repoRoot);
  const violations: CalmViolation[] = [];
  for (const filePath of files) {
    const relativePath = path.relative(repoRoot, filePath).split(path.sep).join("/");
    violations.push(...scanCalmContent(relativePath, readFileSync(filePath, "utf8")));
  }
  violations.sort(
    (a, b) =>
      a.relativePath.localeCompare(b.relativePath) ||
      a.line - b.line ||
      a.matched.localeCompare(b.matched),
  );
  return violations;
}

/** Chữ ký ổn định để đối chiếu allowlist: `relativePath :: kind :: matched`. */
export function violationSignature(v: CalmViolation): string {
  return `${v.relativePath} :: ${v.kind} :: ${v.matched}`;
}
