# Tab Error Boundary Redaction

## Context

- Surface classification: Core privacy / security.
- `TabErrorBoundary` wraps product tabs and secondary product surfaces such as the 12-week system, achievements, and reflection journal.
- Runtime exceptions can include internal URLs, credentials, user text, provider details, or other sensitive diagnostics.

## Requirements

1. WHEN a tab-level React error is caught, THE system SHALL keep the user inside the app with a retry action.
2. WHEN the fallback UI renders, THE system SHALL NOT display the raw `Error.message` or stack.
3. WHEN the boundary writes a console diagnostic, THE system SHALL NOT pass the raw `Error` object or raw `ErrorInfo` object.
4. WHERE the existing retry behavior resets the boundary state, THE system SHALL preserve that behavior.
5. WHERE a `fallbackTitle` is provided, THE system SHALL keep using it.

## Verification

```bash
npm.cmd run test:run -- src/app/components/TabErrorBoundary.test.tsx
npm.cmd run lint
npm.cmd run typecheck
```

## Out Of Scope

- Changing tab layout, tab routing, saved data, sync semantics, analytics schemas, or billing/auth behavior.
- Adding a new monitoring provider or changing Sentry event shape.
