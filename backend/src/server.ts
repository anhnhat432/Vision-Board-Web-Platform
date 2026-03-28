import { env } from "./config/env";
import { connectMongo } from "./config/mongo";
import { app } from "./app";

async function bootstrap(): Promise<void> {
  await connectMongo();

  app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[server] API listening on port ${env.PORT}`);
  });
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("[server] Failed to start backend", error);
  process.exit(1);
});
