import cors from "cors";
import express from "express";
import type { Request } from "express";

import { env } from "./config/env";
import { errorMiddleware } from "./middleware/errorMiddleware";
import { notFoundMiddleware } from "./middleware/notFoundMiddleware";
import { apiRoutes } from "./routes";

const app = express();
const allowedOrigins = env.FRONTEND_ORIGIN.split(",")
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);
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

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export { app };
