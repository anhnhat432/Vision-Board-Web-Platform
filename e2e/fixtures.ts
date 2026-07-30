import { expect, test as base } from "@playwright/test";
import {
  getVercelAutomationBypassHeaders,
  getVercelAutomationBypassHeadersForRequest,
} from "../scripts/vercel-automation-bypass.mjs";

type VercelBypassFixtures = {
  proofBaseURL: string | undefined;
  vercelAutomationBypass: void;
};

export { expect };

export const test = base.extend<VercelBypassFixtures>({
  proofBaseURL: [undefined, { option: true }],
  vercelAutomationBypass: [
    async ({ context, proofBaseURL }, use) => {
      const bypassHeaders = getVercelAutomationBypassHeaders(process.env);
      if (!bypassHeaders || !proofBaseURL) {
        await use();
        return;
      }

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

      await use();
    },
    { auto: true },
  ],
});
