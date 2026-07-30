import { expect, test as base, type BrowserContext } from "@playwright/test";
import {
  getVercelAutomationBypassHeaders,
  getVercelAutomationBypassHeadersForRequest,
} from "../scripts/vercel-automation-bypass.mjs";

type VercelBypassFixtures = {
  newProofContext: () => Promise<BrowserContext>;
  proofBaseURL: string | undefined;
  vercelAutomationBypass: void;
};

export { expect };

async function installVercelAutomationBypassRoute(
  context: BrowserContext,
  proofBaseURL: string | undefined,
) {
  const bypassHeaders = getVercelAutomationBypassHeaders(process.env);
  if (!bypassHeaders || !proofBaseURL) return;

  await context.route(
    (url) =>
      Boolean(
        getVercelAutomationBypassHeadersForRequest({
          requestUrl: url.href,
          baseUrl: proofBaseURL,
          env: process.env,
        }),
      ),
    async (route) => {
      const requestHeaders = await route.request().allHeaders();
      const response = await route.fetch({
        headers: {
          ...requestHeaders,
          ...bypassHeaders,
        },
        maxRedirects: 0,
      });
      await route.fulfill({ response });
    },
  );
}

export const test = base.extend<VercelBypassFixtures>({
  newProofContext: async ({ browser, proofBaseURL }, use) => {
    await use(async () => {
      const context = await browser.newContext({ baseURL: proofBaseURL });
      try {
        await installVercelAutomationBypassRoute(context, proofBaseURL);
        return context;
      } catch (error) {
        await context.close();
        throw error;
      }
    });
  },
  proofBaseURL: [undefined, { option: true }],
  vercelAutomationBypass: [
    async ({ context, proofBaseURL }, use) => {
      await installVercelAutomationBypassRoute(context, proofBaseURL);
      await use();
    },
    { auto: true },
  ],
});
