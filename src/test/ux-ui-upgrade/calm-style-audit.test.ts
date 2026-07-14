/**
 * Static audit: calm-style motion & 3D transform (Requirement 10.5).
 *
 * Feature: core-flow-ui-upgrade
 *
 * Guard tĩnh chống hồi quy phong cách "calm": quét `src/app/pages`,
 * `src/app/components`, `src/features/dashboard`, `src/features/plan12week` và
 * fail nếu xuất hiện vi phạm MỚI thuộc hai loại đo được chắc chắn của Req 10.5:
 *   - motion duration > 300ms (Tailwind `duration-*`, cả arbitrary), và
 *   - biến đổi 3D (rotateX/Y, rotate-x/y, perspective, translateZ, preserve-3d...).
 *
 * Vì codebase còn nợ kỹ thuật pre-existing (các animation/transition dài và một
 * vài hiệu ứng 3D trong sub-component ngoài phạm vi task này), ta dùng một
 * ALLOWLIST được liệt kê tường minh (file + token) làm baseline đã biết. Test
 * PASS trên cây hiện tại nhưng sẽ FAIL khi có vi phạm calm-style MỚI (file mới,
 * hoặc token vi phạm mới trong file đã biết). Đây là guard có ý nghĩa, không phải
 * no-op: allowlist đóng băng nợ cũ, mọi thứ ngoài allowlist đều bị chặn.
 *
 * Loại trừ có chủ đích: spinner/skeleton (`animate-spin`, `animate-pulse`) là
 * affordance chức năng — scanner không phát hiện loop/autoplay nên chúng không bị
 * cờ. Glow (box-shadow) cũng không được detect để tránh false positive.
 */

import { describe, expect, it } from "vitest";
import {
  type CalmViolation,
  resolveCalmStyleFiles,
  scanCalmStyle,
  violationSignature,
} from "./calm-style-scan";

/**
 * ALLOWLIST — nợ calm-style pre-existing đã biết (ngoài phạm vi task 10.3).
 * Mỗi entry là chữ ký `relativePath :: kind :: matched`. Khi cố tình sửa/loại bỏ
 * một hiệu ứng cũ, hãy xoá dòng tương ứng ở đây để giữ allowlist tối giản.
 *
 * Lý do giữ (không sửa product code trong task này): các hiệu ứng nằm chủ yếu ở
 * marketing/hero mockup, preview animation và progress bar transition — không
 * thuộc bề mặt Core_Flow được task này chỉnh, và sửa chúng vượt phạm vi.
 */
const KNOWN_PREEXISTING_ALLOWLIST: readonly string[] = [
  // --- Progress-bar / transition dài trong hero, preview, card (marketing/animation) ---
  "src/app/components/twelve-week/WeeklyHeroBeforeReview.tsx :: motion-duration :: duration-500",
  "src/app/components/twelve-week/ZenJourneyMap.tsx :: motion-duration :: duration-500",
  "src/app/components/ui/input-otp.tsx :: motion-duration :: duration-1000",
  "src/app/pages/FeasibilityCheck/components/ResultStep.tsx :: motion-duration :: duration-500",
  "src/app/pages/GoalTracker/components/GoalCard.tsx :: motion-duration :: duration-500",
  "src/app/pages/LifeInsight/components/FocusLantern.tsx :: motion-duration :: duration-500",
  "src/app/pages/Onboarding/components/ZenBreathingGate.tsx :: motion-duration :: duration-1000",
  "src/app/pages/Onboarding/components/ZenBreathingGate.tsx :: motion-duration :: duration-500",
  "src/app/pages/Onboarding/components/ZenBreathingGate.tsx :: motion-duration :: duration-[3000ms]",
  "src/app/pages/SMARTGoalSetup/components/AnvilForgingEffect.tsx :: motion-duration :: duration-500",
  "src/app/pages/SMARTGoalSetup/components/QualityFeedbackPanel.tsx :: motion-duration :: duration-500",
  "src/app/pages/SMARTGoalSetup/components/SmartGoalHero.tsx :: motion-duration :: duration-500",
  "src/features/dashboard/v2/ActiveGoalsCard.tsx :: motion-duration :: duration-500",
  "src/features/dashboard/v2/BalanceCard.tsx :: motion-duration :: duration-500",
  "src/features/dashboard/v2/DailyStoicCard.tsx :: motion-duration :: duration-700",
  "src/features/dashboard/v2/DreamToPlanPreview.tsx :: motion-duration :: duration-500",
  "src/features/dashboard/v2/HeroMockupAnimated.tsx :: motion-duration :: duration-1000",
  "src/features/dashboard/v2/HeroMockupAnimated.tsx :: motion-duration :: duration-500",
  "src/features/dashboard/v2/NewUserSetupView.tsx :: motion-duration :: duration-500",
  "src/features/plan12week/components/PlanPreviewStepLab.tsx :: motion-duration :: duration-500",
  "src/features/plan12week/pages/12WeekSetup/components/ScheduleStepLab.tsx :: motion-duration :: duration-400",
  "src/features/plan12week/pages/12WeekSystem/components.tsx :: motion-duration :: duration-1000",
  // --- Hiệu ứng 3D pre-existing (flip card / coin / balance scale — ngoài phạm vi task) ---
  "src/app/pages/Achievements/components/Stoic3DCoin.tsx :: transform-3d :: perspective",
  "src/app/pages/Achievements/components/Stoic3DCoin.tsx :: transform-3d :: preserve-3d",
  "src/app/pages/Achievements/components/Stoic3DCoin.tsx :: transform-3d :: rotateX(",
  "src/app/pages/Achievements/components/Stoic3DCoin.tsx :: transform-3d :: rotateY(",
  "src/app/pages/Achievements/components/Stoic3DCoin.tsx :: transform-3d :: translateZ(",
  "src/app/pages/Dashboard.tsx :: transform-3d :: translate3d(",
  "src/app/pages/FeasibilityCheck/components/FeasibilityBalanceScale.tsx :: transform-3d :: perspective",
  "src/app/pages/FeasibilityCheck/components/FeasibilityBalanceScale.tsx :: transform-3d :: rotateX(",
  "src/app/pages/FeasibilityCheck/components/FeasibilityBalanceScale.tsx :: transform-3d :: rotateY(",
  "src/app/pages/GoalTracker/components/GoalCard.tsx :: transform-3d :: backface-hidden",
  "src/app/pages/GoalTracker/components/GoalCard.tsx :: transform-3d :: preserve-3d",
  "src/app/pages/GoalTracker/components/GoalCard.tsx :: transform-3d :: rotate-y-180",
  "src/app/pages/GoalTracker/components/constants.ts :: transform-3d :: backface-hidden",
  "src/app/pages/GoalTracker/components/constants.ts :: transform-3d :: backface-visibility",
  "src/app/pages/GoalTracker/components/constants.ts :: transform-3d :: perspective",
  "src/app/pages/GoalTracker/components/constants.ts :: transform-3d :: preserve-3d",
  "src/app/pages/GoalTracker/components/constants.ts :: transform-3d :: rotate-y-180",
  "src/app/pages/GoalTracker/components/constants.ts :: transform-3d :: rotateY(",
  "src/features/dashboard/v2/DailyStoicCard.tsx :: transform-3d :: perspective",
  "src/features/dashboard/v2/DailyStoicCard.tsx :: transform-3d :: preserve-3d",
  "src/features/dashboard/v2/DailyStoicCard.tsx :: transform-3d :: rotateY(",
];

const ALLOWLIST_SET = new Set(KNOWN_PREEXISTING_ALLOWLIST);

function formatViolation(v: CalmViolation): string {
  return `${v.relativePath}:${v.line} [${v.kind}] ${v.matched}`;
}

describe("calm-style static audit (Requirement 10.5)", () => {
  it("scan các thư mục Core_Flow_UI và tìm thấy file để quét", () => {
    // Sanity: scanner thực sự đọc cây nguồn (không phải no-op vì sai path).
    const files = resolveCalmStyleFiles();
    expect(files.length).toBeGreaterThan(0);
    expect(Array.isArray(scanCalmStyle())).toBe(true);
  });

  it("không xuất hiện vi phạm motion(>300ms)/3D MỚI ngoài allowlist", () => {
    const violations = scanCalmStyle();

    const seen = new Set(violations.map(violationSignature));
    // Guard hygiene: allowlist không được chứa entry đã "chết" (đã sửa xong).
    const stale = [...ALLOWLIST_SET].filter((sig) => !seen.has(sig));
    expect(
      stale,
      stale.length === 0
        ? ""
        : `Allowlist có entry không còn khớp vi phạm nào (đã sửa?). Hãy xoá khỏi ` +
            `KNOWN_PREEXISTING_ALLOWLIST để giữ tối giản:\n${stale.join("\n")}`,
    ).toEqual([]);

    const unexpected = violations.filter((v) => !ALLOWLIST_SET.has(violationSignature(v)));

    expect(
      unexpected,
      unexpected.length === 0
        ? ""
        : `Phát hiện vi phạm calm-style MỚI (Req 10.5). Sửa để motion ≤ 300ms và bỏ biến đổi 3D, ` +
            `hoặc nếu là nợ pre-existing hợp lệ thì thêm chữ ký vào KNOWN_PREEXISTING_ALLOWLIST:\n` +
            unexpected.map(formatViolation).join("\n"),
    ).toEqual([]);
  });
});
