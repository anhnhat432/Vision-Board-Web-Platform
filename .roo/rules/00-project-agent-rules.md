# Project Agent Rules

These rules apply to AI coding agents working in this repository. Keep them short and practical to avoid context bloat.

## First Context

- Treat `AGENTS.md` as the broader source of truth for product, architecture, storage, billing, sync, and production safety rules.
- Read `CLAUDE.md` or `AGENTS.md` before broad or risky work. For small targeted fixes, read only the relevant sections and files.
- Do not dump large files into chat. Inspect targeted snippets and search results instead.

## Working Style

- Keep changes small, typed, and focused on the user request.
- Do not refactor unrelated code, rename concepts, or introduce dependencies unless explicitly needed.
- Preserve existing React, TypeScript, Tailwind, Radix, Lucide, storage, billing, auth, and routing patterns.
- The worktree may be dirty. Never revert, overwrite, or clean up user changes unless the user explicitly asks.
- Do not hardcode secrets, provider keys, tokens, private keys, credentials, service account JSON, or real emails/passwords.

## Kilo Tool Calls

- Use only the exact tool names provided by the active Kilo session.
- Never call or emit a tool named `invalid`.
- Common valid Kilo tools are `read`, `glob`, `grep`, `edit`, `write`, `bash`, `webfetch`, `question`, `skill`, `suggest`, and `plan_exit`.
- If no valid tool applies, respond in plain text, ask a concise question, or finish the plan.

## Implementation Rules

- Prefer existing helpers, components, hooks, utilities, and domain modules over new abstractions.
- For localStorage, sync, billing, auth, entitlement, and route behavior, check existing normalization/gating helpers before editing.
- Demo-only behavior must not leak into real mode. Real-mode production safety rules in `AGENTS.md` override demo shortcuts.
- For UI changes, match the current product UI. Keep layouts calm, scannable, mobile-safe, and free of text overlap.
- On Windows, use PowerShell-compatible commands. Do not use Linux heredocs or shell redirection to write source files.

## Workflow

- For non-trivial tasks, inspect first, state a short plan, then edit.
- When fixing build/type errors, focus on the smallest failing surface first.
- After source changes, run the smallest relevant verification:
  - Frontend: `npm run typecheck`
  - Broader frontend: `npm run lint`, `npm run test:run`, `npm run build`, or `npm run check`
  - Backend: `npm --prefix backend run typecheck`, `npm --prefix backend run build`, or `npm --prefix backend run check`
- If a command cannot run, report the exact blocker and what was verified instead.

## Final Response

- Reply in concise, natural Vietnamese unless the user asks otherwise.
- Report files changed, what changed, commands run, results, and any remaining risk.
- Do not expose hidden reasoning, raw tool traces, provider secrets, or irrelevant logs.
