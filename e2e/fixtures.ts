import { expect, test as base, type BrowserContext, type Route } from "@playwright/test";
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

const LEGACY_PLAN_ID = "lww-e2e-isolated-plan";

function isLegacyPlanExecutionPath(url: URL) {
  if (/^\/api\/sync\/12-week(?:\/|$)/.test(url.pathname)) return false;

  return (
    url.pathname === "/api/plans" ||
    /^\/api\/plans\/[^/]+(?:\/bulk-sync)?$/.test(url.pathname) ||
    /^\/api\/weeks\/[^/]+(?:\/tasks|\/metrics|\/review)?$/.test(url.pathname) ||
    /^\/api\/tasks\/[^/]+$/.test(url.pathname) ||
    /^\/api\/metrics\/[^/]+\/logs(?:\/[^/]+)?$/.test(url.pathname)
  );
}

async function fulfillLegacyJson(route: Route, data: unknown) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ success: true, data }),
  });
}

function createIsolatedPlanDetails() {
  return {
    plan: { id: LEGACY_PLAN_ID },
    weeks: Array.from({ length: 12 }, (_, index) => ({
      id: `lww-e2e-isolated-week-${index + 1}`,
      weekNumber: index + 1,
      focus: "",
      expectedOutput: "",
      tasks: [],
      metrics: [],
    })),
  };
}

async function installLegacyPlanExecutionIsolation(context: BrowserContext) {
  await context.route(
    isLegacyPlanExecutionPath,
    async (route) => {
      const method = route.request().method();
      const pathname = new URL(route.request().url()).pathname;
      let data: unknown;

      if (method === "GET" && pathname === "/api/plans") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: [] }),
        });
        return;
      }

      if (method === "GET" && /^\/api\/plans\/[^/]+$/.test(pathname)) {
        data = createIsolatedPlanDetails();
      } else if (method === "POST" && /\/api\/plans\/[^/]+\/bulk-sync$/.test(pathname)) {
        data = {
          weeks: [],
          tasks: [],
          metricLogs: [],
          reviews: [],
          errors: [],
          syncedCount: 0,
          conflictCount: 0,
          failedCount: 0,
        };
      } else if (method === "GET" && /\/api\/weeks\/[^/]+\/metrics$/.test(pathname)) {
        data = [];
      } else if (method === "POST" && pathname === "/api/plans") {
        data = { id: LEGACY_PLAN_ID };
      } else if (method === "POST" && /\/api\/weeks\/[^/]+\/tasks$/.test(pathname)) {
        data = { id: "lww-e2e-isolated-task", revision: 1 };
      } else if (
        (method === "POST" || method === "PATCH") &&
        (/^\/api\/weeks\/[^/]+\/metrics$/.test(pathname) ||
          /^\/api\/metrics\/[^/]+\/logs(?:\/[^/]+)?$/.test(pathname))
      ) {
        data = { id: "lww-e2e-isolated-metric", logs: [] };
      } else if (
        (method === "PATCH" && /^\/api\/tasks\/[^/]+$/.test(pathname)) ||
        (method === "PATCH" && /^\/api\/weeks\/[^/]+$/.test(pathname)) ||
        (method === "POST" && /^\/api\/weeks\/[^/]+\/review$/.test(pathname))
      ) {
        data = { id: pathname.split("/").at(-1), revision: 1 };
      } else {
        await route.fallback();
        return;
      }

      await fulfillLegacyJson(route, data);
    },
  );
}

export const test = base.extend<VercelBypassFixtures>({
  newProofContext: async ({ browser, proofBaseURL }, use) => {
    await use(async () => {
      const context = await browser.newContext({ baseURL: proofBaseURL });
      try {
        await installVercelAutomationBypassRoute(context, proofBaseURL);
        await installLegacyPlanExecutionIsolation(context);
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
