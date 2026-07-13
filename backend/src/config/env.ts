import dotenv from "dotenv";

import { summarizeEnvIssues, validateBackendEnv } from "./envValidation";

dotenv.config();

export function getOptionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getRequiredEnvInProduction(name: string): string | undefined {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  if (nodeEnv !== "production") return getOptionalEnv(name);
  return getRequiredEnv(name);
}

function getOptionalEnvFrom(names: readonly string[]): string | undefined {
  for (const name of names) {
    const value = getOptionalEnv(name);
    if (value) return value;
  }

  return undefined;
}

export function getRequiredAnyEnvInProduction(names: readonly string[]): string | undefined {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  if (nodeEnv !== "production") return getOptionalEnvFrom(names);

  const value = getOptionalEnvFrom(names);
  if (value) return value;

  const primaryName = names[0] ?? "UNKNOWN_ENV";
  const aliases = names.length > 1 ? ` (accepted aliases: ${names.join(", ")})` : "";
  throw new Error(`Missing required environment variable: ${primaryName}${aliases}`);
}

export function getBooleanEnv(name: string, defaultValue = false): boolean {
  const value = getOptionalEnv(name)?.toLowerCase();
  if (value === undefined) return defaultValue;
  return value === "1" || value === "true" || value === "yes" || value === "on";
}

export function getNumberEnv(name: string, defaultValue: number): number {
  const raw = getOptionalEnv(name);
  if (raw === undefined) return defaultValue;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

function parsePort(rawPort: string | undefined): number {
  if (!rawPort) return 4000;

  const parsed = Number.parseInt(rawPort, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("PORT must be a positive integer.");
  }

  return parsed;
}

const nodeEnv = process.env.NODE_ENV ?? "development";
const cassoWebhookSecretKeys = [
  "CASSO_WEBHOOK_SECRET",
  "CASSO_WEBHOOK_CHECKSUM_KEY",
  "CASSO_CHECKSUM_KEY",
  "CASSO_SECURE_TOKEN",
] as const;

// Fail-fast production validation. Aggregates every problem so operators
// see the full report instead of patching one issue at a time. Skipped
// outside production to keep dev/test boots forgiving.
if (nodeEnv === "production") {
  const issues = validateBackendEnv(process.env, { nodeEnv });
  const errors = issues.filter((issue) => issue.level === "error");
  const warnings = issues.filter((issue) => issue.level === "warning");

  if (warnings.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(
      `[env] ${warnings.length} production env warning(s):\n${summarizeEnvIssues(warnings).join("\n")}`,
    );
  }

  if (errors.length > 0) {
    const summary = summarizeEnvIssues(errors).join("\n");
    throw new Error(
      `Production environment is not safe to start. ${errors.length} error(s):\n${summary}`,
    );
  }
}

const billingProvider = getOptionalEnv("BILLING_PROVIDER")?.toLowerCase();
const rawPrivateKey = getRequiredEnv("FIREBASE_PRIVATE_KEY");
const assistantProvider = getOptionalEnv("ASSISTANT_PROVIDER")?.toLowerCase();
const geminiApiKey = getOptionalEnv("GEMINI_API_KEY");
const geminiModel = getOptionalEnv("GEMINI_MODEL") ?? "gemini-2.5-flash-lite";
const geminiSmartModel = getOptionalEnv("GEMINI_SMART_MODEL") ?? "gemini-3.1-flash-lite";
const groqApiKey = getOptionalEnv("GROQ_API_KEY");
const groqModel = getOptionalEnv("GROQ_MODEL") ?? "meta-llama/llama-4-scout-17b-16e-instruct";
const groqAudioModel = getOptionalEnv("GROQ_AUDIO_MODEL") ?? "whisper-large-v3-turbo";

const resolvedAssistantProvider: "groq" | "gemini" = assistantProvider === "groq" ? "groq" : "gemini";

const aiProvider = getOptionalEnv("AI_PROVIDER")?.toLowerCase() || assistantProvider || "gemini";
const resolvedAiProvider: "groq" | "gemini" = aiProvider === "groq" ? "groq" : "gemini";
const aiApiKey = getOptionalEnv("AI_API_KEY") || (resolvedAiProvider === "gemini" ? geminiApiKey : groqApiKey);
const aiModel = getOptionalEnv("AI_MODEL") || (resolvedAiProvider === "gemini" ? geminiModel : groqModel);
const aiSmartModel = getOptionalEnv("AI_SMART_MODEL") || (resolvedAiProvider === "gemini" ? geminiSmartModel : aiModel);

export const env = {
  NODE_ENV: nodeEnv,
  PORT: parsePort(process.env.PORT),
  MONGODB_URI: getRequiredEnv("MONGODB_URI"),
  FIREBASE_PROJECT_ID: getRequiredEnv("FIREBASE_PROJECT_ID"),
  FIREBASE_CLIENT_EMAIL: getRequiredEnv("FIREBASE_CLIENT_EMAIL"),
  FIREBASE_PRIVATE_KEY: rawPrivateKey.replace(/\\n/g, "\n"),
  FRONTEND_ORIGIN: getRequiredEnv("FRONTEND_ORIGIN"),
  SENTRY_DSN: getOptionalEnv("SENTRY_DSN"),
  ADMIN_AUDIT_FINGERPRINT_SECRET: getOptionalEnv("ADMIN_AUDIT_FINGERPRINT_SECRET"),
  CASSO_WEBHOOK_SECRET:
    billingProvider === "casso"
      ? getRequiredAnyEnvInProduction(cassoWebhookSecretKeys)
      : getOptionalEnvFrom(cassoWebhookSecretKeys),
  ASSISTANT_PROVIDER: resolvedAssistantProvider,
  GEMINI_API_KEY: geminiApiKey,
  GEMINI_MODEL: geminiModel,
  GEMINI_SMART_MODEL: geminiSmartModel,
  GROQ_API_KEY: groqApiKey,
  GROQ_MODEL: groqModel,
  GROQ_AUDIO_MODEL: groqAudioModel,
  AI_PROVIDER: resolvedAiProvider,
  AI_API_KEY: aiApiKey,
  AI_MODEL: aiModel,
  AI_SMART_MODEL: aiSmartModel,
  // G3: bật JSON mode (response_format: json_object) cho nhánh action/workflow của Groq.
  // Default off để không thay đổi hành vi hiện tại; bật rõ ràng ở staging/prod khi muốn giảm invalid action block.
  AI_ENABLE_STRUCTURED_OUTPUT: getBooleanEnv("AI_ENABLE_STRUCTURED_OUTPUT", false),
  // G4: bật telemetry tối thiểu redacted cho assistant (turn-level + client events).
  // Default off để không tạo overhead/lưu trữ khi chưa cần; bật ở staging/prod để đo latency/error theo route.
  AI_ENABLE_TELEMETRY: getBooleanEnv("AI_ENABLE_TELEMETRY", false),
  // GĐ5 (Runbook kill-switch): bật streaming cho Groq chat tự do.
  // Default ON để giữ nguyên hành vi hiện tại. Đặt =0 để ép buffered toàn bộ (tắt nhanh streaming khi incident).
  AI_ENABLE_STREAMING: getBooleanEnv("AI_ENABLE_STREAMING", true),
  // G7 (Reliability): timeout Groq (ms). Configurable để ops hạ thấp khi provider nghẽn.
  // Default 30000 giữ nguyên hành vi cũ; có thể giảm xuống ~15000-20000 để cải thiện UX khi nghẽn.
  AI_GROQ_TIMEOUT_MS: getNumberEnv("AI_GROQ_TIMEOUT_MS", 30000),
  // G7 (Reliability): số lần retry nhẹ khi Groq trả 429 (rate limit) trước khi bỏ cuộc/fallback.
  // Default 1 (tổng 2 lần thử). Đặt 0 để tắt retry.
  AI_GROQ_MAX_RETRIES_ON_429: getNumberEnv("AI_GROQ_MAX_RETRIES_ON_429", 1),
  // G7 (Reliability): backoff cơ sở (ms) giữa các lần retry 429. Lần thử thứ n đợi base * n.
  AI_GROQ_RETRY_BASE_DELAY_MS: getNumberEnv("AI_GROQ_RETRY_BASE_DELAY_MS", 500),
  // G7 (Circuit breaker): số lần lỗi transient liên tiếp (429/5xx/timeout) trước khi mở circuit.
  // Khi circuit mở, request Groq bị chặn ngay và rơi về deterministic fallback trong cooldown.
  AI_GROQ_CIRCUIT_FAILURE_THRESHOLD: getNumberEnv("AI_GROQ_CIRCUIT_FAILURE_THRESHOLD", 4),
  // G7 (Circuit breaker): thời gian giữ circuit mở (ms) trước khi cho phép thử lại provider.
  AI_GROQ_CIRCUIT_COOLDOWN_MS: getNumberEnv("AI_GROQ_CIRCUIT_COOLDOWN_MS", 30000),
  // GĐ5 (Rollout/A-B): canary rollout cho signed-in real-mode users.
  // AI_CANARY_PERCENT = 0..100 (mặc định 100 = full rollout). Cohort được tính deterministic theo sessionHash.
  AI_CANARY_PERCENT: getNumberEnv("AI_CANARY_PERCENT", 100),
  // Tên experiment hiện tại (để gắn vào telemetry, phân tích A/B). Rỗng = không gắn experiment.
  AI_EXPERIMENT: getOptionalEnv("AI_EXPERIMENT") ?? "",
  // Danh sách variant phân bổ A/B, cách nhau bằng dấu phẩy. VD "control,variant_a".
  // Mặc định chỉ "control" để không bật A/B khi chưa cấu hình.
  AI_EXPERIMENT_VARIANTS: getOptionalEnv("AI_EXPERIMENT_VARIANTS") ?? "control",
  // GĐ5 (Alerting/SLO): ngưỡng cảnh báo vận hành. Alert đọc từ telemetry overview redacted.
  AI_SLO_P95_LATENCY_MS: getNumberEnv("AI_SLO_P95_LATENCY_MS", 12000),
  AI_SLO_ERROR_RATE_PCT: getNumberEnv("AI_SLO_ERROR_RATE_PCT", 3),
  AI_SLO_TIMEOUT_RATE_PCT: getNumberEnv("AI_SLO_TIMEOUT_RATE_PCT", 2),
  AI_SLO_RATE_LIMIT_RATE_PCT: getNumberEnv("AI_SLO_RATE_LIMIT_RATE_PCT", 5),
  AI_SLO_ACTION_FAIL_RATE_PCT: getNumberEnv("AI_SLO_ACTION_FAIL_RATE_PCT", 5),
  // Token budget cảnh báo chi phí trung bình mỗi turn (token estimate). Vượt => alert cost.
  AI_SLO_AVG_TOKEN_BUDGET: getNumberEnv("AI_SLO_AVG_TOKEN_BUDGET", 4000),
  // Cost budget theo tiền tệ (USD). Đơn giá ước tính USD / 1K token (gộp input+output cho gọn).
  // Mặc định 0 = chưa biết giá => bỏ qua alert cost-USD (chỉ dùng token budget ở trên).
  AI_COST_PER_1K_TOKENS_USD: getNumberEnv("AI_COST_PER_1K_TOKENS_USD", 0),
  // Ngưỡng tổng chi phí ước tính (USD) trong cửa sổ thời gian gần đây. Vượt => alert cost-USD.
  // Mặc định 0 = tắt alert theo tiền (chỉ bật khi có đơn giá thực tế của provider).
  AI_SLO_TOTAL_COST_USD: getNumberEnv("AI_SLO_TOTAL_COST_USD", 0),
  // Cửa sổ thời gian (phút) để cộng chi phí cost-USD. Mặc định 60 phút => ngưỡng là USD/giờ, dễ diễn giải.
  AI_SLO_COST_WINDOW_MINUTES: getNumberEnv("AI_SLO_COST_WINDOW_MINUTES", 60),
  // Số lần secret/token bị redaction (trong cửa sổ thời gian) tối đa chấp nhận.
  // Vượt => alert secret-leak (critical). Chỉ đếm secret/token, KHÔNG đếm email (lành tính).
  AI_SLO_SECRET_LEAK_MAX: getNumberEnv("AI_SLO_SECRET_LEAK_MAX", 0),
  // Cửa sổ thời gian (phút) để đếm secret-leak hit. Mặc định 60 phút => alert tự lành khi hit cũ trôi đi.
  AI_SLO_SECRET_LEAK_WINDOW_MINUTES: getNumberEnv("AI_SLO_SECRET_LEAK_WINDOW_MINUTES", 60),
  // Số turn tối thiểu trước khi đánh giá SLO để tránh cảnh báo do mẫu quá nhỏ.
  AI_SLO_MIN_SAMPLE: getNumberEnv("AI_SLO_MIN_SAMPLE", 20),
  R2_ACCOUNT_ID: getOptionalEnv("R2_ACCOUNT_ID"),
  R2_ACCESS_KEY_ID: getOptionalEnv("R2_ACCESS_KEY_ID"),
  R2_SECRET_ACCESS_KEY: getOptionalEnv("R2_SECRET_ACCESS_KEY"),
  R2_BUCKET: getOptionalEnv("R2_BUCKET"),
  R2_ENDPOINT: getOptionalEnv("R2_ENDPOINT"),
  R2_PUBLIC_BASE_URL: getOptionalEnv("R2_PUBLIC_BASE_URL"),
};

export type Env = typeof env;
