# Presentation Day Checklist — 2026-07-21

## Recommended Mode

- Primary rehearsal: local `VITE_APP_MODE=demo` with deterministic local-first data.
- Production domain: use only if the team has verified an accessible signed-in account and the latest deployed commit.
- Never put passwords, API keys, Firebase tokens, or service-account values in this checklist or presentation slides.

## Tonight

- [ ] Run `npm run typecheck`.
- [ ] Run `npm run lint` and confirm any output is only the known admin style info.
- [ ] Run `npm run test:run`.
- [ ] Run `npm run build`.
- [ ] Run the local smoke commands from `D:\Projects\Vision Board Web Platform`:

```powershell
$env:VITE_APP_MODE='demo'; npm run dev -- --host 127.0.0.1
```

- [ ] In a second terminal, run `npm run smoke:mvp1` and `npm run smoke:core-quality` with the dev server available.
- [ ] Keep a browser window or recording ready as the offline fallback.
- [ ] Open the presentation slides and signup QR code without exposing credentials.

## 30 Minutes Before

- [ ] Charge laptop and bring charger, HDMI/USB-C adapter, and phone hotspot.
- [ ] Start the local demo server with `VITE_APP_MODE=demo`.
- [ ] Open `http://127.0.0.1:5173/` in a clean browser profile.
- [ ] Verify the signed-out landing hero and the CTA `Thiết lập chu kỳ 12 tuần ngay`.
- [ ] Set browser zoom to 110–125% so headings and Today tasks are readable from the back of the room.
- [ ] Close Slack, Discord, email, and unrelated tabs; enable Focus Assist/Do Not Disturb.
- [ ] Do not clear browser storage after seeding the rehearsal state.

## 7-Minute Route Narrative

Use this route order; skip a route if the audience question or time limit requires it:

```text
/ -> /onboarding -> /life-balance -> /life-insight -> /smart-goal-setup -> /feasibility -> /12-week-setup -> /12-week-system?tab=today -> /12-week-system?tab=week -> /12-week-system?tab=progress -> /journal
```

1. Public promise: show how a broad vision becomes a 12-week execution loop.
2. Onboarding and Life Balance: show that the product starts from the user's life context.
3. Life Insight and SMART Goal: show the handoff into a measurable goal.
4. Feasibility Check: show recommendation before committing to the plan.
5. 12-Week Setup: show outcome, lead indicators, and weekly actions.
6. Today: toggle one task and save a daily check-in; explain local-first behavior.
7. Week: open or save the review, including the next commitment.
8. Progress: show trend and next action; mention Journal as the reflection record.

## Offline Fallback

- If Wi-Fi or the deployed domain fails, stay on the local demo at `http://127.0.0.1:5173/`.
- If the local server fails, show the prepared recording/screenshots and narrate the same route order.
- If the projector fails, show the signup QR code and explain the product loop verbally.
- If a sync banner appears, explain that local progress remains safe and skip the backend proof in the live narrative.

## Stop/Skip Rules

- Do not live-demo billing checkout, account deletion, admin pages, or sync conflict resolution.
- Do not ask the audience to create accounts during the presentation; rate limits and email verification can distract from the core story.
- If a page takes more than 10 seconds to load, move to the next prepared tab or the recording.
- If a form is incomplete, use the seeded local state and continue with Today/Week/Progress.

## Known Risks and Owners

- `origin/main` may lag the local `codex/presentation-release-gates` branch; a production domain does not contain local changes until a human pushes and deploys them.
- GitHub production/staging proof remains an external release gate; no workflow is dispatched by this checklist.
- Real-mode deployments require host-provided billing support, monitoring, and provider values even though local demo mode runs without them.
- The team presenter owns the final laptop, browser, projector, network, and backup recording check.

## Verified Evidence

- `npm run check` passed in the isolated worktree before the QA changes: 152 files, 1,415 tests, production build successful.
- `npx vitest run scripts/production-smoke-harness.test.mjs` passed after the weekly-review commitment guard.
- `npx vitest run --config vitest.sync.config.ts src/features/plan12week/persistence/pulledWorkspaceApply.test.ts` passed with 12 tests after clock freezing.
- `npm run smoke:mvp1` passed locally in `VITE_APP_MODE=demo`, including Today, check-in, weekly review, Progress, and browser-error scan.
- `npm run smoke:core-quality` passed locally before this bounded QA-only change.
