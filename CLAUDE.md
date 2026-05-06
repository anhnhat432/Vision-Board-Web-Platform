# CLAUDE.md

This file is the Claude Code quick-start for this repo. `AGENTS.md` remains the broader source of truth. Follow this file first for day-to-day Claude Code work, then read `AGENTS.md` and relevant `guidelines/*` docs when the task touches product scope, storage, sync, billing, deployment, or MVP claims.

## Project Focus

Vision Board Web Platform is a local-first React/Vite app with an optional backend. The current priority is:

```text
Onboarding -> Life Balance -> Life Insight -> SMART Goal -> Feasibility Check -> 12-Week Plan -> Weekly Execution -> Reflection/Review
```

For MVP 1, treat the app as a public demo for the 12-week execution system. The demo must work without required login, Firebase, backend sync, or real billing.

## Default Working Rules

- Keep changes small, typed, and focused on the user request.
- Prefer existing components, helpers, storage utilities, and domain logic over new abstractions.
- Do not rewrite large areas or mix unrelated refactors into feature work.
- Do not introduce dependencies unless the requested implementation clearly needs them.
- Do not revert user changes. The worktree may be dirty.
- Do not hardcode secrets, tokens, API keys, service account JSON, emails, or passwords.
- Do not treat `.claude/worktrees`, `dist`, `node_modules`, screenshots, or generated artifacts as primary source unless the task explicitly asks for them.
- Respect `.ignore` and `.gitignore` during search/context gathering; use ignored files only when the task explicitly requires generated output or local agent state.
- Use Claude Code file-edit tools (`Read`, `Write`, `Edit`, `MultiEdit`) for source changes. Do not create or edit files with Bash heredocs, `cat >`, shell redirection, or `Set-Content` unless the user explicitly asks or no edit tool is available.
- After a tool call completes, continue autonomously until implementation and verification are done. Do not stop after `Bash completed with no output` or wait for the user to ask "xong chưa".
- If a shell command fails, inspect the error, adjust, and continue when safe. Report a blocker only when the task cannot be completed safely in the current scope.
- On Windows, avoid Linux-only shell patterns such as `cat << EOF`; use file-edit tools for writes and PowerShell-native commands for read-only inspection or verification.
- If a provider/API interruption stops the turn and the user says `continue`, `tiếp tục`, or similar, recover from the current repo state (`git status`, relevant files, latest errors) and continue the previous task without asking the user to restate it.

## Communication Style

- Write user-facing replies as polished engineering updates, not scratchpad notes.
- Never expose hidden thinking, planning tags, XML/tool fragments, or text such as `<think>`, `</think>`, `<tool_call>`, "summary cho user", or "update todo".
- Do not narrate internal state like "Tôi sẽ báo cáo kết quả" after the work is already done.
- Do not send partial sentences, scratchpad fragments, or unfinished bullets. If a response is interrupted or malformed, restate the result cleanly in a new complete paragraph.
- Final responses should start with the actual result, then list changed files, verification, and remaining risks when relevant.
- Keep Vietnamese responses natural, direct, and professional. Avoid mixed English/Vietnamese unless naming files, commands, APIs, or exact product terms.

## Product Scope Guardrails

- Prioritize demo-mode stability, 12-week setup, Today tasks, weekly review, progress, and mock upgrade.
- Do not turn the product into a generic planner, social app, AI coach, or payment platform unless explicitly asked.
- Keep vision board, achievements, admin orders, real billing, and perfect cloud sync secondary unless requested.
- For current capability claims, check `guidelines/CURRENT_PROJECT_STATUS.md`.
- For MVP decisions, check `guidelines/MVP_1_SCOPE.md`.

## LocalStorage And Sync

LocalStorage is the primary UX source of truth for most frontend flows.

- Treat `src/app/utils/storage.ts`, `storage-types.ts`, `storage-twelve-week.ts`, and related modules as compatibility-sensitive.
- Do not rename storage keys, clear local data, or change persisted shapes casually.
- If changing `UserData`, `Goal`, `TwelveWeekSystem`, billing, entitlement, event log, or outbox shapes, update normalization/migration logic and add focused tests.
- Local save must succeed even if backend/Firebase is unavailable.
- Backend sync is conditional and best-effort. Never make protected backend sync required for demo mode.

## Billing, Firebase, And Env

- Billing is mock/provider-contract oriented. Do not present mock billing as a real payment flow.
- Keep paywall checks behind existing billing/entitlement helpers.
- Mock upgrade must remain public-demo safe: no real charge, clear copy, local entitlement unlock.
- Firebase client config is optional. Guard auth/backend behavior when env or auth is not ready.
- Do not commit `.env`, `.env.local`, `backend/.env`, service account JSON, or downloaded secret files.

## Frontend Workflow

Use the smallest relevant verification first, then broaden when shared behavior is touched:

```bash
npm run typecheck
npm run lint
npm run test:run
npm run build
```

Use the combined check for broad frontend work:

```bash
npm run check
```

For demo route/UI changes, consider:

```bash
npm run qa:visual-ux-ui
npm run smoke:mvp1
npm run smoke:prod
```

If a smoke or visual command cannot run because credentials, browser state, deployment, or env are missing, report the blocker clearly.

## Backend Workflow

For backend changes:

```bash
npm --prefix backend run typecheck
npm --prefix backend run build
```

Or:

```bash
npm --prefix backend run check
```

For full-stack sync or deployment-env work, also consider:

```bash
node scripts/check-runtime-env.mjs
node scripts/check-runtime-env.mjs --full-stack
```

## UI And Visual QA

- Match the existing product UI. This is a productivity app, not a marketing landing page.
- Keep layouts calm, scannable, and mobile-safe.
- Use existing Tailwind/component patterns and Lucide/Radix conventions.
- Do not add decorative motion, glow, 3D tilt, or broad visual effects unless explicitly requested.
- For UI work, use Playwright and/or Chrome DevTools MCP when useful to inspect screenshots, console errors, network issues, and responsive behavior.
- For frontend library/API questions, use Context7 or official docs instead of guessing.

## Claude Code Plugins

Installed useful plugins include:

- `context7`: use for current library documentation.
- `playwright`: use for browser/UI verification.
- `chrome-devtools-mcp`: use for console, network, DOM, and performance debugging.
- `frontend-design`: use for UI/UX implementation and visual review.
- `superpowers`: workflow skills for debugging, TDD, review, and structured work.
- `commit-commands`: commit support when explicitly asked.
- `claude-code-setup`, `claude-md-management`, `session-report`: use when asked to audit setup, improve Claude docs, or inspect Claude usage.

Keep `github@claude-plugins-official` disabled unless `GITHUB_PERSONAL_ACCESS_TOKEN` is configured. When enabled without a token, it can produce MCP startup errors.

## Claude Code Local Notes

- This repo has `"type": "module"` in `package.json`; Node hook scripts that use `require(...)` should use `.cjs`.
- The local Claude format hook is `.claude/hooks/format-after-edit.cjs`.
- If Claude Code model picker is confusing, prefer `Opus 4.7 (1M context)` with effort `Max`, thinking enabled, and fast mode off.
- The root `.ignore` keeps generated build, QA, screenshot, and agent-worktree files out of normal Claude search context.
- If the VS Code Claude panel appears idle after a completed tool call, first ask it to `continue`. If the panel is truly frozen or stops streaming, reload VS Code with `Developer: Reload Window`.
- Do not store provider tokens or auth secrets in this file.

## Final Response Expectations

When completing a task, report:

- Files changed.
- What changed and why.
- Commands run and their results.
- Any command not run and why.
- Remaining risks, TODOs, or assumptions.

Keep the final response concise and concrete.
