# AGENTS.md

## Project
Vision Board Web Platform is a full-stack web app for turning life vision into SMART goals and 12-week execution plans.

## Tech Stack
- Frontend: React, Vite, TypeScript
- Backend: Express, TypeScript, MongoDB/Mongoose
- Auth: Firebase Auth
- Styling: follow existing project styles/components

## Main Product Direction
Do not expand scope randomly. Prioritize the core flow:
Onboarding -> Life Balance -> Life Insight -> SMART Goal -> Feasibility Check -> 12-Week Plan -> Weekly Execution -> Reflection/Review.

## Engineering Rules
- Keep changes small and focused.
- Do not rewrite large parts of the app unless explicitly asked.
- Preserve existing architecture unless there is a clear reason.
- Prefer typed interfaces and explicit validation.
- Do not introduce new dependencies unless necessary.
- Avoid cosmetic-only changes unless the task is UI polish.

## Verification
For every change, run the most relevant checks:
- Frontend: npm run typecheck, npm run lint, npm run test, npm run build if available.
- Backend: npm run build, npm run test or relevant service/controller tests if available.
- If a command is missing or failing due to project setup, report it clearly.

## Definition of Done
A task is done only when:
- The implementation matches the requested scope.
- Existing behavior is not broken.
- Relevant validation/error states are handled.
- Relevant checks have been run.
- The final response includes changed files and commands/results.
