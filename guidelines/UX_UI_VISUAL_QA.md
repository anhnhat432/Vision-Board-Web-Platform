# UX / UI Visual QA Suite

Quick guide for `scripts/visual-ux-ui-qa.mjs` — the lightweight screenshot pass
to run after any UX/UI polish, so a human can review the core funnel surfaces
without driving the wizard manually.

## Why this script exists

There are already 2 visual-related scripts in this repo:

| Script                          | Purpose                                                                                                                                        |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/visual-core-flow-qa.mjs` | Drives the full signup → onboarding → SMART → feasibility → 12-week system funnel against a real URL and asserts no layout overflow. Slow gate. |
| `scripts/smoke-core-quality.mjs` | Asserts the local-first execution loop is **semantically** correct (SMART has metric/target, plan has lead indicators, etc.).                  |
| `scripts/visual-ux-ui-qa.mjs`   | **This one.** Seeds deterministic local state, navigates each surface, saves screenshots for manual review. No assertions, no pixel diff.       |

Use this one when you just polished a screen and want to eyeball the result on
desktop + mobile across the whole funnel, without paying the cost of a real
signup flow or a production hit.

## What it captures

Each checkpoint produces one screenshot per requested viewport (desktop 1440×1000,
mobile 390×844):

1. Dashboard — empty / no-plan state
2. Dashboard — signed-in, with seeded 12-week plan
3. SMART goal review (last step of the SMART wizard)
4. Feasibility result page
5. 12-week setup review (last step of `/12-week-setup`)
6. 12-week system — Today tab (desktop + mobile)
7. 12-week system — Week tab
8. 12-week system — Progress tab
9. 12-week system — Settings tab
10. 12-week system — Today tab with an overdue task (rescue / overdue state)

## How it works

- Uses the same `agent-browser` CLI pattern as `smoke-mvp1-local-demo.mjs`.
- Clears `localStorage` / `sessionStorage` / IndexedDB on start.
- Seeds a deterministic SMART goal + feasibility result + 12-week system in
  `localStorage` (no backend, no Firebase, no payment).
- For wizard surfaces (SMART, 12WeekSetup) it clicks "Tiếp tục" / "Tiếp theo"
  until the review step renders.
- For 12-week system tabs it clicks each tab in the tablist by visible label.
- Writes a `qa-report.json` summarising every checkpoint + any warnings.

## Run it

Prerequisites:

- `npx agent-browser ...` works on this machine (same dependency as
  `smoke:mvp1` / `visual:prod`).
- A local dev server running, e.g. `npm run dev` on port 5173.

Then:

```bash
npm run qa:visual-ux-ui
```

Output:

```
artifacts/visual-ux-ui/<YYYYMMDDHHMMSS>/
  01-dashboard-empty-no-plan-desktop.png
  01-dashboard-empty-no-plan-mobile.png
  02-dashboard-signed-in-desktop.png
  ...
  qa-report.json
```

Open the folder and scrub through the screenshots in order. Every checkpoint
captures the full page (`--full`), not just the viewport, so long screens
scroll into the image.

## Configuration

| Env var               | Default                  | Purpose                                |
| --------------------- | ------------------------ | -------------------------------------- |
| `UX_UI_QA_URL`        | `http://localhost:5173`  | Base URL the script navigates to.      |
| `UX_UI_QA_OUTPUT_DIR` | `artifacts/visual-ux-ui/<ts>` | Override output directory.        |
| `UX_UI_QA_SESSION`    | `ux-ui-qa-<ts>`          | Browser session name.                  |

Examples:

```bash
# Against a Vercel preview deploy
UX_UI_QA_URL=https://vision-board-web-platform-pr-12.vercel.app npm run qa:visual-ux-ui

# Pin the output folder (handy for diffing across two polish passes)
UX_UI_QA_OUTPUT_DIR=artifacts/visual-ux-ui/before-polish npm run qa:visual-ux-ui
```

## Reviewing the screenshots

Use this checklist (mirrors `guidelines/UX_UI_QUALITY_AUDIT.md`):

- [ ] Hero / primary CTA is visible above the fold on desktop **and** mobile.
- [ ] No clipped text outside the viewport on mobile.
- [ ] Step indicator / "Bước N / total" reads correctly on every wizard surface.
- [ ] Sticky bottom CTA on mobile (Feasibility result, 12WeekSetup last step) is
      visible and doesn't overlap a bottom-nav.
- [ ] Today tab primary hero is anchored at the top of the tab content.
- [ ] Overdue / rescue state surfaces a clear next action.
- [ ] Settings tab does not leak Plus / paywall surfaces into the demo build.

## When the script can't run

If `npx agent-browser ...` is missing or the local dev server isn't running, the
script aborts with a clear error. In that case:

1. Confirm the dev server is up: `curl http://localhost:5173`.
2. Confirm `agent-browser` is installed (the same dependency `smoke:mvp1` uses).
3. Run `npm run smoke:mvp1` first as a sanity check — if that fails, fix the
   browser tooling before retrying the visual suite.

The script never asserts pixel correctness, so a "passed-with-warnings" status
is normal — open the report and decide which warnings are real visual bugs.
