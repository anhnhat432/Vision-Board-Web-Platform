/**
 * @param {{
 *   authMode: string;
 *   timestamp: number;
 *   env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
 * }} options
 */
export function resolveAccountDeleteE2ECredentials({
  authMode,
  timestamp,
  env = process.env,
}) {
  const generatedCredentials = {
    email: `codex.qa+delete-${timestamp}@example.com`,
    password: `CodexDelete${timestamp}!`,
  };

  if (authMode === "signup") return generatedCredentials;

  return {
    email: env.ACCOUNT_DELETE_E2E_EMAIL?.trim() || generatedCredentials.email,
    password: env.ACCOUNT_DELETE_E2E_PASSWORD || generatedCredentials.password,
  };
}
