import cors from "cors";
import express from "express";
import type { Request } from "express";
import helmet from "helmet";

import { env } from "./config/env";
import { createCorsOptions, parseAllowedCorsOrigins } from "./middleware/corsOrigin";
import { errorMiddleware } from "./middleware/errorMiddleware";
import { notFoundMiddleware } from "./middleware/notFoundMiddleware";
import { setupSentryErrorHandler } from "./monitoring/sentry";
import { apiRoutes } from "./routes";

const app = express();
app.set("trust proxy", 1);

const allowedOrigins = parseAllowedCorsOrigins(env.FRONTEND_ORIGIN, {
  nodeEnv: process.env.NODE_ENV,
});

app.use(helmet());
app.use(cors(createCorsOptions(allowedOrigins)));
app.use(
  express.json({
    limit: "2mb",
    verify: (req: Request, _res, buffer) => {
      if (req.originalUrl.includes("/api/billing/webhook/")) {
        (req as Request & { rawBody?: Buffer }).rawBody = Buffer.from(buffer);
      }
    },
  }),
);
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

app.use("/api", apiRoutes);

setupSentryErrorHandler(app);
app.use(notFoundMiddleware);
app.use(errorMiddleware);

export { app };
