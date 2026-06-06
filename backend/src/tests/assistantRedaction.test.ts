// Giai đoạn 1: Test chống leak cho redaction helper DÙNG CHUNG (FE + BE).
// Đảm bảo không lộ API key, bearer token, email, private key marker, long random token.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { redactSensitive } from "../shared/assistantRedaction";

describe("shared redactSensitive", () => {
  it("redacts emails", () => {
    const out = redactSensitive("liên hệ user.name+test@example.com nhé");
    assert.ok(!out.includes("@example.com"));
    assert.ok(out.includes("[EMAIL_REDACTED]"));
  });

  it("redacts bearer tokens", () => {
    const out = redactSensitive("Authorization: Bearer abc.def.ghiJKL123456");
    assert.ok(!/bearer\s+abc/i.test(out));
    assert.ok(out.includes("[REDACTED]"));
  });

  it("redacts api_key key:value pairs", () => {
    const out = redactSensitive("api_key: sk_live_super_secret_value123");
    assert.ok(!out.includes("sk_live_super_secret_value123"));
    assert.ok(out.includes("[REDACTED]"));
  });

  it("redacts api_key=value pairs", () => {
    const out = redactSensitive("access_token=tok_abc_def_123456789");
    assert.ok(!out.includes("tok_abc_def_123456789"));
    assert.ok(out.includes("[REDACTED]"));
  });

  it("redacts password key:value pairs", () => {
    const out = redactSensitive("password: mypassword123");
    assert.ok(!out.includes("mypassword123"));
    assert.ok(out.includes("[REDACTED]"));
  });

  it("redacts variable names containing sensitive words", () => {
    const out = redactSensitive("dùng biến myApiKeyValue và db_password_prod");
    assert.ok(!out.includes("myApiKeyValue"));
    assert.ok(!out.includes("db_password_prod"));
  });

  it("redacts standalone sensitive keywords", () => {
    const out = redactSensitive("đây là secret và credentials của tôi");
    assert.ok(!/\bsecret\b/.test(out));
    assert.ok(!/\bcredentials\b/.test(out));
  });

  it("redacts long random tokens with at least one digit", () => {
    const token = "AbCd1234EfGh5678IjKl9012MnOp";
    const out = redactSensitive(`token blob ${token} end`);
    assert.ok(!out.includes(token));
    assert.ok(out.includes("[REDACTED]"));
  });

  it("redacts private key markers", () => {
    const out = redactSensitive("private_key: MIIEvQIBADANBgkqhkiG9w0BAQEF1234567890");
    assert.ok(!out.includes("MIIEvQIBADANBgkqhkiG9w0BAQEF1234567890"));
    assert.ok(out.includes("[REDACTED]"));
  });

  it("keeps safe short text intact", () => {
    assert.equal(redactSensitive("Hôm nay học IELTS 5 buổi"), "Hôm nay học IELTS 5 buổi");
  });

  it("does not redact normal long Vietnamese words without digits", () => {
    const phrase = "toi muon hoan thanh muc tieu cua minh trong muoi hai tuan";
    assert.equal(redactSensitive(phrase), phrase);
  });

  it("returns empty/falsy input unchanged", () => {
    assert.equal(redactSensitive(""), "");
  });
});