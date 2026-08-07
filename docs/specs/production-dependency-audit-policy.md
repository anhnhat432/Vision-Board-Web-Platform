# Production Dependency Audit Policy

## 1. Context & Goal

- Feature / bug: production dependency audit fails on resolved transitive issues and a React Router RSC-only advisory.
- Why now: the launched app should keep high/critical dependency checks actionable.
- User impact: security regressions remain blocking without forcing an unrelated React 19 / Node 22 migration for a SPA that does not enable RSC Mode.
- Modes affected: both.

## 2. Surface Classification

- Type: `Core`.
- Touched domains: dependency locks and GitHub Actions security gates.
- Invariants: unknown high/critical production vulnerabilities must still fail CI.

## 3. Functional Requirements

1. `WHEN npm reports an unapproved high or critical production vulnerability, THE system SHALL fail the audit job.`
2. `WHERE npm reports GHSA-qwww-vcr4-c8h2 for react-router, THE system SHALL accept it only when react-router is locked to reviewed release 7.18.2 and no React Router RSC dependency or source marker is present.`
3. `WHEN the audit command or JSON parsing fails, THE system SHALL fail closed.`
4. `WHILE auditing backend dependencies, THE system SHALL apply no advisory exceptions.`
5. `WHEN an RSC marker is introduced, THE system SHALL stop accepting the React Router advisory.`
6. `WHERE Dependency Review skips this advisory, THE frontend audit job SHALL independently enforce the reviewed version and non-RSC contract.`

## 4. Data & Security Constraints

- No runtime data, localStorage schema, API contract, or secret changes.
- GitHub Advisory states GHSA-qwww-vcr4-c8h2 only affects applications using unstable RSC APIs; the first patched package version is 8.3.0.
- The exception is package-, advisory-, version-, and runtime-mode-specific; it must not lower the global severity threshold.
- Remove the exception when upgrading to React Router 8.3.0+ or before enabling any RSC mode.
- Backend must not depend on the frontend root package or missing local packages.

## 5. Out of Scope

- React 19, Node 22, Vite 7, or React Router 8 migration.
- Broad dependency modernization unrelated to active advisories.

## 6. Acceptance & Verification

- [ ] Frontend production audit has no unapproved high/critical findings.
- [ ] Backend production audit has zero findings.
- [ ] Audit policy tests cover the non-RSC exception, RSC fail-closed behavior, and an unknown critical advisory.
- [ ] Dependency Review and npm audit gates apply the same advisory identifier without weakening unknown high/critical findings.
- [ ] Frontend and backend checks pass with regenerated lockfiles.
