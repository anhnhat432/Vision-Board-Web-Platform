/**
 * @param {NodeJS.ProcessEnv | Record<string, string | undefined>} [env]
 * @returns {Record<string, string> | undefined}
 */
export function getVercelAutomationBypassHeaders(env = process.env) {
  const secret = env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (typeof secret !== "string" || secret.length === 0) return undefined;

  return {
    "x-vercel-protection-bypass": secret,
    "x-vercel-set-bypass-cookie": "true",
  };
}

/**
 * @param {{
 *   requestUrl: string;
 *   baseUrl: string | undefined;
 *   env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
 * }} options
 * @returns {Record<string, string> | undefined}
 */
export function getVercelAutomationBypassHeadersForRequest({
  requestUrl,
  baseUrl,
  env = process.env,
}) {
  const headers = getVercelAutomationBypassHeaders(env);
  if (!headers || typeof baseUrl !== "string") return undefined;

  try {
    return new URL(requestUrl).origin === new URL(baseUrl).origin ? headers : undefined;
  } catch {
    return undefined;
  }
}
