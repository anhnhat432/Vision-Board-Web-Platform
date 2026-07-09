import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

function configureGeminiEnv(): void {
  process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/assistant-test";
  process.env.FIREBASE_PROJECT_ID = "assistant-test";
  process.env.FIREBASE_CLIENT_EMAIL = "firebase-admin@example.test";
  process.env.FIREBASE_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\\ntest\\n-----END PRIVATE KEY-----\\n";
  process.env.FRONTEND_ORIGIN = "http://localhost:5173";
  process.env.AI_PROVIDER = "gemini";
  process.env.AI_API_KEY = "gemini_test_key";
  process.env.GEMINI_API_KEY = "gemini_test_key";
}

describe("transcribeAudio Gemini error redaction", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it("does not return or log raw provider secrets from Gemini transcription errors", async () => {
    configureGeminiEnv();
    const rawSecret = "AIzaSyTranscriptAbCdEfGhIjKl123456789";
    const rawEmail = "voice@example.test";
    const consoleErrorMock = mock.method(console, "error", () => undefined);
    mock.method(
      globalThis,
      "fetch",
      async () =>
        new Response(
          JSON.stringify({
            error: {
              message: `transcribe failed api_key: ${rawSecret} for ${rawEmail}`,
            },
          }),
          { status: 500, headers: { "content-type": "application/json" } },
        ),
    );
    const { transcribeAudio } = await import("../services/groqAssistantProvider");

    await assert.rejects(
      () => transcribeAudio(Buffer.from("audio"), "audio/webm"),
      (error) => {
        assert.ok(error instanceof Error);
        assert.doesNotMatch(error.message, new RegExp(rawSecret));
        assert.doesNotMatch(error.message, new RegExp(rawEmail));
        return true;
      },
    );

    assert.equal(consoleErrorMock.mock.callCount(), 2);
    const logged = JSON.stringify(consoleErrorMock.mock.calls.map((call) => call.arguments));
    assert.doesNotMatch(logged, new RegExp(rawSecret));
    assert.doesNotMatch(logged, new RegExp(rawEmail));
  });
});
