# Feature Spec Template

Use this template for Vision Board tasks that touch `Core` or `Mixed` surfaces.

## 1. Context & Goal

- Feature / bug:
- Why now:
- User impact:
- Modes affected: `real`, `demo`, or both

## 2. Surface Classification

- Type: `Core` / `Shell` / `Mixed`
- Touched domains:
- Existing invariants that must not break:

## 3. Actors & Entry Points

- Primary actor:
- Secondary actor(s):
- Route(s):
- API / hook / store touchpoints:

## 4. Functional Requirements

Write high-risk behavior in EARS style where possible.

Examples:

- `WHEN user submits valid checkout request, THE system SHALL create order locally before remote sync starts.`
- `WHILE Firebase auth is not ready, THE system SHALL block protected sync calls and show current signed-out or unconfigured state.`
- `WHERE entitlement sync is pending, THE system SHALL avoid showing paid state as confirmed.`

Requirements:

1.
2.
3.

## 5. Data, Storage, and Sync Constraints

- localStorage keys / shapes touched:
- migration or normalization needed:
- backend models or API contracts touched:
- sync ordering guarantees:
- rollback / restore concerns:

## 6. Non-functional Requirements

- performance / latency:
- accessibility:
- observability / logging:
- security / privacy:

## 7. Out of Scope

-
-

## 8. Acceptance Criteria

- [ ] happy path
- [ ] signed-out / unconfigured path
- [ ] offline / sync-failed path
- [ ] destructive or irreversible path
- [ ] real-mode vs demo-mode boundary

## 9. Verification Plan

Commands to run:

```bash
npm run typecheck
npm run lint
npm run test:run
npm run build
```

Add backend and smoke commands when relevant.

## 10. Open Questions / Follow-ups

-
-
