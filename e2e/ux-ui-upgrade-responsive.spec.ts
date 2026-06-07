/**
 * E2E responsive checks for the UX/UI upgrade (Task 8.8).
 *
 * Validates Requirement 6 from `.kiro/specs/ux-ui-upgrade/requirements.md`:
 *   6.1  360–767px → no horizontal scroll on the document.
 *   6.2  ≥768px   → desktop spacing tokens are applied to the page shell.
 *   6.3  <768px   → mobile card padding tokens are applied (mobile token differs from desktop).
 *   6.4  Touch_Target ≥ 44×44 CSS px on touch viewports.
 *   6.5  Adjacent Touch_Target gap ≥ 8px when their projections overlap.
 *   6.6  <360px   → keep the 360px layout, allow inner horizontal scroll, do not clip Touch_Targets.
 *
 * Notes
 * -----
 * * The spec only navigates to public, layout-only routes (`/`, `/onboarding`,
 *   `/life-balance`). Auth-gated, billing, sync and admin routes are deferred —
 *   running them here would require backend / Firebase credentials, which is
 *   exactly what `e2e/sync-lww.spec.ts` already covers under env-gated skips.
 * * No new dependencies are introduced; only `@playwright/test` is used.
 * * The spec assumes a dev server is reachable at `process.env.E2E_BASE_URL`
 *   (or the Playwright `baseURL`, which defaults to `http://localhost:5173`).
 *   Run `npm run dev` in another terminal, then
 *   `npx playwright test e2e/ux-ui-upgrade-responsive.spec.ts`.
 */

import { test, expect, type Page } from "@playwright/test";

// ── Constants ─────────────────────────────────────────────────────

interface ViewportSpec {
  readonly width: number;
  readonly height: number;
  readonly bucket: "sub-360" | "mobile" | "desktop";
}

const VIEWPORTS: readonly ViewportSpec[] = [
  { width: 320, height: 800, bucket: "sub-360" },
  { width: 360, height: 800, bucket: "mobile" },
  { width: 414, height: 900, bucket: "mobile" },
  { width: 767, height: 900, bucket: "mobile" },
  { width: 768, height: 900, bucket: "desktop" },
  { width: 1024, height: 900, bucket: "desktop" },
];

/** Public, non-auth-gated routes that are part of the Core_Flow_Screen surface. */
const ROUTES: readonly { path: string; label: string }[] = [
  { path: "/", label: "Dashboard" },
  { path: "/onboarding", label: "Onboarding" },
  { path: "/life-balance", label: "LifeBalance" },
];

/**
 * Selector for "every potentially-interactive element a finger could land on".
 * Mirrors WCAG SC 2.5.5 / 2.5.8 semantics: any control the user can activate.
 */
const TOUCH_TARGET_SELECTOR = [
  "button",
  '[role="button"]',
  "a[href]",
  'input:not([type="hidden"])',
  "textarea",
  "select",
  '[role="link"]',
  '[role="checkbox"]',
  '[role="switch"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[role="menuitemcheckbox"]',
  '[role="menuitemradio"]',
  '[role="radio"]',
  "[contenteditable=true]",
].join(",");

const MIN_TOUCH_TARGET_PX = 44;
const MIN_ADJACENT_GAP_PX = 8;
const MIN_LAYOUT_BREAKPOINT_PX = 360;

// ── Browser-side measurement payloads ─────────────────────────────

interface ScrollMetrics {
  scrollWidth: number;
  clientWidth: number;
  innerWidth: number;
  overflowX: string;
}

interface TouchTargetRect {
  index: number;
  tag: string;
  role: string | null;
  text: string;
  parentSig: string;
  width: number;
  height: number;
  top: number;
  left: number;
  right: number;
  bottom: number;
}

interface AdjacencyViolation {
  a: TouchTargetRect;
  b: TouchTargetRect;
  axis: "horizontal" | "vertical";
  gap: number;
}

interface PaddingMetrics {
  /** Resolved value of `--app-card-padding` (desktop card padding token). */
  cardPaddingDesktopRaw: string;
  /** Resolved value of `--app-card-padding-mobile` (mobile card padding token). */
  cardPaddingMobileRaw: string;
  /** Effective padding-left on the outer page-shell container, in px. */
  shellPaddingLeftPx: number;
  /** Effective padding-right on the outer page-shell container, in px. */
  shellPaddingRightPx: number;
}

// ── Helpers ───────────────────────────────────────────────────────

async function gotoRoute(page: Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  // Layouts settle once initial fonts/images stabilize; networkidle is fine
  // for mostly-local routes and avoids assertions running mid-paint.
  await page.waitForLoadState("networkidle").catch(() => {
    /* some routes may have long-lived sync polls; ignore */
  });
}

async function readScrollMetrics(page: Page): Promise<ScrollMetrics> {
  return await page.evaluate<ScrollMetrics>(() => {
    const doc = document.documentElement;
    const overflowX = window.getComputedStyle(doc).overflowX;
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      innerWidth: window.innerWidth,
      overflowX,
    };
  });
}

async function readPaddingMetrics(page: Page): Promise<PaddingMetrics> {
  return await page.evaluate<PaddingMetrics>(() => {
    const root = document.documentElement;
    const rootStyles = window.getComputedStyle(root);
    const cardPaddingDesktopRaw = rootStyles.getPropertyValue("--app-card-padding").trim();
    const cardPaddingMobileRaw = rootStyles.getPropertyValue("--app-card-padding-mobile").trim();

    // The PageShell root applies `px-4 sm:px-6 lg:px-8` — find any element with
    // these classes (or fall back to the first child of <main>) so we can
    // measure the actual page padding under the active media query.
    function pickShell(): Element {
      const candidates = Array.from(document.querySelectorAll<HTMLElement>("body *"))
        .filter((el) => {
          const cls = el.className;
          if (typeof cls !== "string") return false;
          return /\bpx-4\b/.test(cls) || /\bsm:px-6\b/.test(cls) || /\blg:px-8\b/.test(cls);
        });
      if (candidates.length > 0) return candidates[0];
      const main = document.querySelector("main");
      if (main?.firstElementChild) return main.firstElementChild;
      return document.body;
    }

    const shell = pickShell();
    const cs = window.getComputedStyle(shell);
    return {
      cardPaddingDesktopRaw,
      cardPaddingMobileRaw,
      shellPaddingLeftPx: Number.parseFloat(cs.paddingLeft) || 0,
      shellPaddingRightPx: Number.parseFloat(cs.paddingRight) || 0,
    };
  });
}

async function measureTouchTargets(page: Page, selector: string): Promise<TouchTargetRect[]> {
  return await page.evaluate<TouchTargetRect[], string>((sel) => {
    function isRendered(el: Element): boolean {
      // checkVisibility covers display/visibility/opacity/content-visibility.
      const candidate = el as Element & {
        checkVisibility?: (opts?: { checkOpacity?: boolean; checkVisibilityCSS?: boolean }) => boolean;
      };
      if (typeof candidate.checkVisibility === "function") {
        if (!candidate.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
      } else {
        const cs = window.getComputedStyle(el);
        if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") return false;
      }
      if (el.getAttribute("aria-hidden") === "true") return false;
      if (el.hasAttribute("hidden")) return false;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return false;
      return true;
    }

    function isEnabled(el: Element): boolean {
      const ariaDisabled = el.getAttribute("aria-disabled");
      if (ariaDisabled === "true") return false;
      const candidate = el as HTMLButtonElement | HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      if ("disabled" in candidate && candidate.disabled === true) return false;
      return true;
    }

    function parentSignature(el: Element): string {
      const parent = el.parentElement;
      if (!parent) return "no-parent";
      const tag = parent.tagName.toLowerCase();
      const id = parent.id ? `#${parent.id}` : "";
      const role = parent.getAttribute("role");
      const cls = typeof parent.className === "string" ? parent.className.split(/\s+/).slice(0, 2).join(".") : "";
      return `${tag}${id}${role ? `[role=${role}]` : ""}${cls ? `.${cls}` : ""}`;
    }

    const nodes = Array.from(document.querySelectorAll(sel));
    const out: TouchTargetRect[] = [];
    nodes.forEach((el, index) => {
      if (!isRendered(el)) return;
      if (!isEnabled(el)) return;
      const rect = el.getBoundingClientRect();
      out.push({
        index,
        tag: el.tagName.toLowerCase(),
        role: el.getAttribute("role"),
        text: (el.textContent ?? "").trim().slice(0, 60),
        parentSig: parentSignature(el),
        width: rect.width,
        height: rect.height,
        top: rect.top,
        left: rect.left,
        right: rect.right,
        bottom: rect.bottom,
      });
    });
    return out;
  }, selector);
}

/**
 * Detect adjacent Touch_Target pairs that share a parent and fail the 8px
 * edge-to-edge gap rule. Only sibling pairs whose bounding rects project
 * onto a single axis are evaluated — the rule is intentionally simple and
 * avoids reporting overlapping decorative regions or stacked layers.
 */
function findAdjacencyViolations(
  targets: readonly TouchTargetRect[],
  minGap = MIN_ADJACENT_GAP_PX,
): AdjacencyViolation[] {
  const grouped = new Map<string, TouchTargetRect[]>();
  for (const t of targets) {
    const arr = grouped.get(t.parentSig) ?? [];
    arr.push(t);
    grouped.set(t.parentSig, arr);
  }

  const violations: AdjacencyViolation[] = [];
  for (const siblings of grouped.values()) {
    for (let i = 0; i < siblings.length; i++) {
      for (let j = i + 1; j < siblings.length; j++) {
        const a = siblings[i];
        const b = siblings[j];

        const horizontalOverlap = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const verticalOverlap = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);

        if (verticalOverlap > 0 && horizontalOverlap <= 0) {
          // Side-by-side on a row. Edge-to-edge horizontal distance.
          const gap = Math.max(a.left, b.left) - Math.min(a.right, b.right);
          if (gap >= 0 && gap < minGap) {
            violations.push({ a, b, axis: "horizontal", gap });
          }
        } else if (horizontalOverlap > 0 && verticalOverlap <= 0) {
          // Stacked in a column. Edge-to-edge vertical distance.
          const gap = Math.max(a.top, b.top) - Math.min(a.bottom, b.bottom);
          if (gap >= 0 && gap < minGap) {
            violations.push({ a, b, axis: "vertical", gap });
          }
        }
        // Pairs that overlap on both axes (decorative stacks, icon-on-button)
        // or have no overlap at all (different rows/columns) are skipped.
      }
    }
  }
  return violations;
}

function describeRect(r: TouchTargetRect): string {
  const idLabel = r.role ? `${r.tag}[role=${r.role}]` : r.tag;
  const text = r.text ? ` "${r.text}"` : "";
  return `${idLabel}${text} ${r.width.toFixed(1)}×${r.height.toFixed(1)}@(${r.left.toFixed(0)},${r.top.toFixed(0)})`;
}

// ── Tests ─────────────────────────────────────────────────────────

for (const route of ROUTES) {
  test.describe(`ux-ui-upgrade · responsive · ${route.label} (${route.path})`, () => {
    for (const vp of VIEWPORTS) {
      test.describe(`viewport ${vp.width}×${vp.height} (${vp.bucket})`, () => {
        test.use({ viewport: { width: vp.width, height: vp.height } });

        test("layout & touch-target compliance", async ({ page }) => {
          await gotoRoute(page, route.path);

          // ── Padding tokens (Requirements 6.2 & 6.3) ──────────────
          const padding = await readPaddingMetrics(page);
          expect(padding.cardPaddingDesktopRaw, "--app-card-padding must be defined").not.toBe("");
          expect(padding.cardPaddingMobileRaw, "--app-card-padding-mobile must be defined").not.toBe("");
          expect(
            padding.cardPaddingDesktopRaw,
            "Mobile and desktop card padding tokens must differ (otherwise Req 6.3 cannot be enforced)",
          ).not.toBe(padding.cardPaddingMobileRaw);

          if (vp.bucket === "desktop") {
            // Req 6.2: ≥768px uses desktop spacing. PageShell scales padding
            // via `px-4 sm:px-6 lg:px-8` — at ≥768px the effective padding
            // should be at least the mobile baseline (16px) and grow with
            // viewport width.
            expect(padding.shellPaddingLeftPx, "Desktop shell paddingLeft").toBeGreaterThanOrEqual(16);
            expect(padding.shellPaddingRightPx, "Desktop shell paddingRight").toBeGreaterThanOrEqual(16);
          } else {
            // Req 6.3: <768px uses the mobile padding token. We verify the
            // mobile token resolves to a non-zero length and the shell
            // padding is non-zero (i.e. content is not flush against the
            // viewport edge).
            expect(padding.shellPaddingLeftPx, "Mobile shell paddingLeft").toBeGreaterThan(0);
            expect(padding.shellPaddingRightPx, "Mobile shell paddingRight").toBeGreaterThan(0);
          }

          // ── Horizontal scroll (Requirements 6.1 & 6.6) ───────────
          const metrics = await readScrollMetrics(page);

          if (vp.bucket === "mobile") {
            // Req 6.1: 360–767px → no horizontal scroll. Allow a 1px
            // sub-pixel rounding tolerance.
            expect(
              metrics.scrollWidth,
              `No horizontal scroll expected at ${vp.width}px (scrollWidth ${metrics.scrollWidth}, clientWidth ${metrics.clientWidth})`,
            ).toBeLessThanOrEqual(metrics.clientWidth + 1);
            expect(metrics.overflowX, "html overflow-x must not be 'scroll' in mobile range").not.toBe("scroll");
          } else if (vp.bucket === "sub-360") {
            // Req 6.6: <360px → keep the 360px layout. Inner horizontal
            // scroll is allowed but the layout must not collapse below the
            // 360px breakpoint.
            expect(
              metrics.scrollWidth,
              `Sub-360 layout must keep ≥${MIN_LAYOUT_BREAKPOINT_PX}px content width (got scrollWidth ${metrics.scrollWidth})`,
            ).toBeGreaterThanOrEqual(MIN_LAYOUT_BREAKPOINT_PX);
          } else {
            // Desktop: no specific horizontal-scroll rule, but content
            // should still fit without runaway horizontal overflow.
            expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 2);
          }

          // ── Touch_Target sizing (Requirement 6.4) ────────────────
          const targets = await measureTouchTargets(page, TOUCH_TARGET_SELECTOR);

          // Desktop viewports may use mouse-class controls; the requirement
          // is scoped to "khung nhìn cảm ứng" (touch viewports). We still
          // run the check on mobile/sub-360 viewports where touch is the
          // expected input.
          if (vp.bucket !== "desktop") {
            const undersized = targets.filter(
              (t) => t.width < MIN_TOUCH_TARGET_PX || t.height < MIN_TOUCH_TARGET_PX,
            );
            expect(
              undersized,
              `Found ${undersized.length} undersized Touch_Target(s) at ${vp.width}px on ${route.label}:\n` +
                undersized.map(describeRect).join("\n"),
            ).toEqual([]);
          }

          // ── Adjacent gap (Requirement 6.5) ───────────────────────
          if (vp.bucket !== "desktop") {
            const violations = findAdjacencyViolations(targets, MIN_ADJACENT_GAP_PX);
            expect(
              violations,
              `Found ${violations.length} adjacent Touch_Target gap violation(s) at ${vp.width}px on ${route.label}:\n` +
                violations
                  .map((v) => `  · [${v.axis} gap ${v.gap.toFixed(1)}px] ${describeRect(v.a)} ↔ ${describeRect(v.b)}`)
                  .join("\n"),
            ).toEqual([]);
          }

          // ── Sub-360 Touch_Target containment (Requirement 6.6) ───
          if (vp.bucket === "sub-360") {
            // Targets must remain reachable inside the 360px content area
            // (no clipping out of the scrollable frame).
            const clipped = targets.filter(
              (t) => t.right > metrics.scrollWidth + 1 || t.left < -1,
            );
            expect(
              clipped,
              `Found ${clipped.length} Touch_Target(s) clipped outside the 360-layout content area at ${vp.width}px:\n` +
                clipped.map(describeRect).join("\n"),
            ).toEqual([]);
          }
        });
      });
    }
  });
}
