# Auth Boot Deferral Checklist

Surface: Core auth boot and public landing performance.

- WHEN a visitor opens the public landing page without a stored Firebase token, THE system SHALL render as signed-out without importing Firebase auth during the initial boot path.
- WHEN a stored Firebase token exists, THE system SHALL subscribe to Firebase auth state and restore the authenticated user session.
- WHEN a signed-out visitor starts sign-in or sign-up, THE system SHALL load Firebase auth on demand and preserve the existing email/Google login behavior.
- WHILE the public landing page warms sign-in or sign-up routes after user intent or idle time, THE system SHALL avoid importing Firebase auth until the user submits an auth action or requests password reset.
- WHEN logout runs, THE system SHALL clear auth-scoped local data and Firebase token state without requiring the public landing to preload Firebase.
- WHERE Firebase env is incomplete, THE system SHALL keep demo/public browsing usable and report auth as unconfigured.
