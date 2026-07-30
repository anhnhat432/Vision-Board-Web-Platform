import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { getVercelAutomationBypassHeaders } from "./vercel-automation-bypass.mjs";

/**
 * @param {{
 *   env?: NodeJS.ProcessEnv | Record<string, string | undefined>,
 *   tempRoot?: string,
 * }} [options]
 */
export async function createAgentBrowserBypassConfig({ env = process.env, tempRoot = os.tmpdir() } = {}) {
  const headers = getVercelAutomationBypassHeaders(env);
  if (!headers) return undefined;

  const directoryPath = await mkdtemp(path.join(tempRoot, "vision-board-core-quality-"));
  const configPath = path.join(directoryPath, "agent-browser.json");

  try {
    await writeFile(configPath, `${JSON.stringify({ headers: JSON.stringify(headers) })}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });

    if (process.platform !== "win32") {
      await chmod(directoryPath, 0o700);
      await chmod(configPath, 0o600);
    }

    return { directoryPath, configPath };
  } catch (error) {
    await rm(directoryPath, { recursive: true, force: true });
    throw error;
  }
}

/**
 * @param {{ directoryPath: string } | undefined} config
 */
export async function removeAgentBrowserBypassConfig(config) {
  if (!config) return;
  await rm(config.directoryPath, { recursive: true, force: true });
}
