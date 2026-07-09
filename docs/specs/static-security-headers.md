# Static Security Headers

Surface classification: Core ops. Static frontend response headers protect every public and authenticated route served by Vercel.

Acceptance checklist:

- WHEN the Vercel SPA serves any route over HTTPS, THE response SHALL include `Strict-Transport-Security` with a one-year `max-age`.
- WHEN static headers are configured, THE system SHALL keep `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and the existing restrictive `Permissions-Policy`.
- WHEN the CSP allows Cloudflare Web Analytics, THE `script-src` directive SHALL allow only the explicit analytics origin and SHALL NOT use a wildcard.
- WHERE HSTS is introduced, THE policy SHALL NOT include `includeSubDomains` or `preload` until subdomain ownership and HTTPS readiness are separately verified.

Verification plan:

```bash
npx.cmd vitest run scripts/vercel-security-headers.test.mjs
npm.cmd run test:ops
npm.cmd run lint
npm.cmd run typecheck
git diff --check
```
