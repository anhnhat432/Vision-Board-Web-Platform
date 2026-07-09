# Assistant Provider Error Redaction

## Context

- Surface classification: Core privacy / security.
- Backend assistant providers call third-party AI APIs with user context, audio input, and provider credentials.
- Provider error payloads can include diagnostic text, emails, token-like strings, API key hints, or other sensitive details.

## Requirements

1. WHEN Groq or Gemini chat returns an API error, THE system SHALL preserve the existing user-facing `errorCode`.
2. WHEN a provider error message is included in a user-facing assistant error, THE system SHALL redact emails, tokens, API keys, secrets, passwords, credentials, and long token-like strings first.
3. WHEN provider error details are logged for operators, THE system SHALL log status/model context without raw provider body secrets or user emails.
4. WHEN Gemini or Groq transcription fails, THE system SHALL redact provider error text before logging and before rethrowing any provider message.
5. WHERE provider auth, rate limit, payload size, timeout, retry, and fallback decisions already exist, THE system SHALL keep those behavior branches unchanged.

## Verification

```bash
npm.cmd --prefix backend run build
node --test backend/dist/tests/groqAssistantProvider.test.js backend/dist/tests/geminiAssistantProvider.test.js
node --test backend/dist/tests/assistantTranscribeGeminiRedaction.test.js backend/dist/tests/assistantTranscribeGroqRedaction.test.js
npm.cmd --prefix backend run check
```

## Out Of Scope

- Changing provider selection, model names, prompt content, assistant action parsing, telemetry schemas, or user data storage shapes.
- Adding a new logging provider or Sentry event shape.
