# 12-Week Setup Lab Artifact Cleanup Plan

Generated: 2026-05-20

## Git status

- Current branch: `main`
- `git status --short`: no output returned from terminal, interpreted as a clean working tree before this report was created.

## Scope

- Inspected: `qa-artifacts/12-week-setup-lab`
- Inspected: `docs/ux`
- No source code changed.
- No files deleted.
- No merge or commit performed.
- No tests/build commands run.

## Cleanup recommendations

| File                                                               | Type                | Keep/Delete recommendation                                               | Reason                                                                                                                                                                                        |
| ------------------------------------------------------------------ | ------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `qa-artifacts/12-week-setup-lab/QA_REPORT.md`                      | QA report           | Keep                                                                     | Baseline QA report for the 12-week setup lab; useful historical evidence for pre/post-polish comparison.                                                                                      |
| `qa-artifacts/12-week-setup-lab/POST_POLISH_QA_REPORT.md`          | QA report           | Keep                                                                     | Current post-polish QA summary; primary report for the latest polish round.                                                                                                                   |
| `qa-artifacts/12-week-setup-lab/ARTIFACT_CLEANUP_PLAN.md`          | Cleanup report      | Keep                                                                     | This classification plan documents what to retain or remove before any destructive cleanup.                                                                                                   |
| `docs/ux/12-week-setup-lab-ai-simulated-test.md`                   | UX QA documentation | Keep                                                                     | Structured simulated-test documentation; belongs in long-lived UX evidence and is not a temporary artifact.                                                                                   |
| `docs/ux/12-week-setup-lab-user-test-plan.md`                      | UX test plan        | Keep                                                                     | User-testing plan for the lab flow; useful for repeatable manual/UX QA.                                                                                                                       |
| `qa-artifacts/12-week-setup-lab/step-1-mobile.png`                 | Screenshot          | Keep                                                                     | Baseline mobile evidence for step 1; useful to compare with post-polish screenshot set.                                                                                                       |
| `qa-artifacts/12-week-setup-lab/step-2-mobile.png`                 | Screenshot          | Keep                                                                     | Baseline mobile evidence for step 2; useful to compare with post-polish screenshot set.                                                                                                       |
| `qa-artifacts/12-week-setup-lab/step-3-mobile.png`                 | Screenshot          | Keep                                                                     | Baseline mobile evidence for step 3; useful to compare with post-polish screenshot set.                                                                                                       |
| `qa-artifacts/12-week-setup-lab/step-4-mobile.png`                 | Screenshot          | Keep                                                                     | Baseline mobile evidence for step 4; useful to compare with post-polish screenshot set.                                                                                                       |
| `qa-artifacts/12-week-setup-lab/step-4-desktop.png`                | Screenshot          | Keep                                                                     | Baseline desktop evidence for the final step; useful for responsive comparison.                                                                                                               |
| `qa-artifacts/12-week-setup-lab/route-old-12-week-setup.png`       | Screenshot          | Keep                                                                     | Route-regression evidence for the old `/12-week-setup` route; useful while confirming lab routing did not break the existing flow.                                                            |
| `qa-artifacts/12-week-setup-lab/post-polish-step-1-mobile.png`     | Screenshot          | Keep                                                                     | Current post-polish mobile evidence for step 1; should remain attached to the post-polish report.                                                                                             |
| `qa-artifacts/12-week-setup-lab/post-polish-step-2-mobile.png`     | Screenshot          | Keep                                                                     | Current post-polish mobile evidence for step 2; should remain attached to the post-polish report.                                                                                             |
| `qa-artifacts/12-week-setup-lab/post-polish-step-2-validation.png` | Screenshot          | Keep                                                                     | Current post-polish validation-state evidence; useful because validation behavior is a QA-sensitive surface.                                                                                  |
| `qa-artifacts/12-week-setup-lab/post-polish-step-3-mobile.png`     | Screenshot          | Keep                                                                     | Current post-polish mobile evidence for step 3; should remain attached to the post-polish report.                                                                                             |
| `qa-artifacts/12-week-setup-lab/post-polish-step-4-mobile.png`     | Screenshot          | Keep                                                                     | Current post-polish mobile evidence for step 4; should remain attached to the post-polish report.                                                                                             |
| `qa-artifacts/12-week-setup-lab/post-polish-step-4-desktop.png`    | Screenshot          | Keep                                                                     | Current post-polish desktop evidence for responsive review; should remain attached to the post-polish report.                                                                                 |
| `qa-artifacts/12-week-setup-lab/post-polish-qa-runner.cjs`         | Temporary QA runner | Keep for now; consider moving to `scripts/` or deleting after acceptance | Runner is temporary but reproduces the post-polish artifact set. Keep until the polish QA is accepted; delete later if one-off, or promote to a maintained script if repeated QA is expected. |
| `scripts/qa-12-week-setup-lab.cjs`                                 | QA runner           | Keep                                                                     | Repository-level QA script appears intentionally maintained outside artifact output; do not delete as artifact cleanup.                                                                       |
| `qa-artifacts/12-week-setup-lab/debug-body.txt`                    | Debug file          | Delete after approval                                                    | Debug dump from route/body inspection; not needed for long-term QA evidence once reports and screenshots exist.                                                                               |
| `qa-artifacts/12-week-setup-lab/debug-current-route.png`           | Debug screenshot    | Delete after approval                                                    | Debug-only route screenshot; superseded by named baseline/post-polish screenshots and reports.                                                                                                |

## Recommended next cleanup action

After approval, delete only the debug files:

- `qa-artifacts/12-week-setup-lab/debug-body.txt`
- `qa-artifacts/12-week-setup-lab/debug-current-route.png`

Do not delete reports, UX docs, or named screenshots during this cleanup pass. Keep `post-polish-qa-runner.cjs` until the post-polish QA round is accepted, then decide whether to delete it as one-off tooling or promote it into a maintained script location.
