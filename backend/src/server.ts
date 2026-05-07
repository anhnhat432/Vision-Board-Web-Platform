import { env } from "./config/env";
import { connectMongo } from "./config/mongo";
import { captureBackendException, flushSentry } from "./monitoring/sentry";
import { app } from "./app";

async function bootstrap(): Promise<void> {
  await connectMongo();

  app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[server] API listening on port ${env.PORT}`);
  });
}

bootstrap().catch(async (error) => {
  captureBackendException(error);
  await flushSentry();
  // eslint-disable-next-line no-console
  console.error("[server] Failed to start backend", error);
  process.exit(1);
});
