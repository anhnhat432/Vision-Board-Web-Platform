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
