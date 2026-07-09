import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

function configureGroqEnv(): void {
  process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/assistant-test";
  process.env.FIREBASE_PROJECT_ID = "assistant-test";
  process.env.FIREBASE_CLIENT_EMAIL = "firebase-admin@example.test";
  process.env.FIREBASE_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\\ntest\\n-----END PRIVATE KEY-----\\n";
  process.env.FRONTEND_ORIGIN = "http://localhost:5173";
  process.env.AI_PROVIDER = "groq";
  process.env.AI_API_KEY = "groq_test_key";
  process.env.GROQ_API_KEY = "groq_test_key";
}

describe("transcribeAudio Groq error redaction", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it("does not log raw provider secrets from Groq transcription errors", async () => {
    configureGroqEnv();
    const rawSecret = "gsk_TranscriptAbCdEfGhIjKl123456789";
    const rawEmail = "voice@example.test";
    const consoleErrorMock = mock.method(console, "error", () => undefined);
    mock.method(
      globalThis,
      "fetch",
      async () =>
        new Response(`transcribe failed access_token=${rawSecret} for ${rawEmail}`, {
          status: 500,
          headers: { "content-type": "text/plain" },
        }),
    );
    const { transcribeAudio } = await import("../services/groqAssistantProvider");

    await assert.rejects(
      () => transcribeAudio(Buffer.from("audio"), "audio/webm"),
      /API transcription failed: 500/,
    );

    assert.equal(consoleErrorMock.mock.callCount(), 2);
    const logged = JSON.stringify(consoleErrorMock.mock.calls.map((call) => call.arguments));
    assert.doesNotMatch(logged, new RegExp(rawSecret));
    assert.doesNotMatch(logged, new RegExp(rawEmail));
  });
});
