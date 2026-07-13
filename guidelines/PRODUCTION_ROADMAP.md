# Production Roadmap

Last updated: 2026-07-13

Purpose: turn Vision Board Web Platform into a production-safe core-flow product using a Hybrid Spec-Driven Development (SDD) + Agent-Driven Development (ADD) workflow.

## 1. Product Goal

Ship one calm, reliable loop:

`Onboarding -> Life Balance -> Life Insight -> SMART Goal -> Feasibility Check -> 12-Week Plan -> Weekly Execution -> Reflection/Review`

Production promise:

- signed-in real-mode users can trust auth, billing, sync, and settings flows
- local-first usage still works when backend sync is slow or temporarily unavailable
- demo mode remains available for previews without redefining the product around demo shortcuts

## 2. Working Model

Use Hybrid SDD/ADD, not vibe coding.

- `SDD` for high-risk, shared-contract, or irreversible surfaces
- `ADD` for low-risk, fast-feedback, well-bounded surfaces
- `Hybrid` for most real product work: freeze contract first, then let agents execute inside constraints

## 3. Source-of-Truth Hierarchy

When documents or prompts disagree, resolve them in this order:

1. `AGENTS.md`
2. this roadmap
3. `guidelines/CURRENT_PROJECT_STATUS.md`
4. feature spec for current task
5. assistant-local quick-start files such as `CLAUDE.md`

Any discovered contradiction should be fixed as part of the same task when safe.

## 4. Core vs Shell Map

### Core: spec-first, verification-heavy

- auth flows: signup, signin, signout, reset password, email verification
- billing contract, entitlement sync, customer portal, paid/unpaid state authority
- app mode boundaries: `real` vs `demo`, route registration, copy safety
- localStorage schemas, migrations, normalization, auth-scoped data ownership
- 12-week sync, outbox, conflict handling, restore/import, cloud overwrite choices
- destructive settings actions: export, delete account, wipe local data, cancel subscription
- backend API contracts, shared identifiers, plan/week/task/metric mapping
- compliance/security-sensitive copy and behavior

### Shell: agent-first, fast iteration

- page layout polish and information hierarchy
- onboarding copy refinements that do not alter contract/state shape
- dashboard composition and visual cleanup
- helper CRUD or admin surfaces outside core launch path
- documentation, runbooks, screenshots, test scaffolding, QA helpers
- analytics presentation and instrumentation wrappers that do not change billing/auth authority

### Mixed surfaces: lock contract first

- 12-week setup UX that also touches saved data shape
- pricing/settings pages that also touch entitlement state
- sync status UI that also depends on backend event semantics

## 5. Required Artifacts By Risk Level

### Level 1: Shell task

- short task note in issue/PR/user request
- touched files list
- acceptance checklist

### Level 2: Core feature or risky bug fix

Create a spec using `docs/specs/FEATURE_TEMPLATE.md` with:

- context and goal
- actors and mode: `real`, `demo`, or both
- functional requirements
- data/storage/sync constraints
- out-of-scope list
- acceptance + verification plan

### Level 3: Cross-cutting or irreversible change

Add all Level 2 artifacts plus:

- migration/rollback plan
- observability plan
- launch guard or smoke path
- explicit owner checklist for env/deployment follow-up

## 6. Default Delivery Workflow

1. Classify task as `Core`, `Shell`, or `Mixed`.
2. For `Core` or `Mixed`, draft/update spec before broad edits.
3. List invariants that must not break: app mode, storage shape, auth, billing authority, local-first save.
4. Let agent implement in the smallest bounded area that satisfies the spec.
5. Run the smallest relevant verification first, then broaden if shared behavior moved.
6. If docs/rules drifted during the task, update docs in the same branch.
7. Report remaining risks, especially env/deploy blockers outside repo.

## 7. Acceptance Language Standard

Use these EARS-style patterns for new high-risk requirements:

- `WHEN ... THE system SHALL ...`
- `WHILE ... THE system SHALL ...`
- `WHERE ... THE system SHALL ...`

Use this style for auth, billing, sync, destructive actions, and conflict flows.

## 8. Current Release Priorities

### P0: production safety

- real-mode auth flow completeness and error clarity
- billing correctness and entitlement authority
- visible sync trust signals plus failure/conflict handling
- account export and delete-account reachability with proper confirmation
- legal/support surfaces required before paid conversion

### P1: execution reliability

- field-complete sync for remaining 12-week data gaps
- stronger backend/controller test coverage for planning + billing paths
- production monitoring for auth/bootstrap/sync failures
- mobile/desktop simplification across core loop

### P2: expansion after trust baseline

- broader analytics confidence
- secondary product surfaces polish
- [x] Admin operational data classification and KPI cleanup (reporting-only; no DAU or active-user metric claim)
- deeper admin/reporting/workflow automation

## 9. What Not To Do

- do not default to demo-first shortcuts when task touches production paths
- do not change storage keys or data shapes without migration plan
- do not unlock paid state from checkout-session response alone
- do not hide sync/auth/billing failures behind optimistic UI without visible state
- do not mix unrelated UI refactors into high-risk contract changes
