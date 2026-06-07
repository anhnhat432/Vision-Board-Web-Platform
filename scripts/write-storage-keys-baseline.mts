/**
 * One-shot helper: write the storage-keys baseline snapshot used by Property 9
 * (task 10.1). Runs the deterministic scanner in `src/test/ux-ui-upgrade/
 * storage-keys-scan.ts` and persists the result to `src/test/ux-ui-upgrade/
 * __snapshots__/storage-keys.baseline.json`.
 *
 * Usage:
 *   npx vite-node scripts/write-storage-keys-baseline.mts
 *
 * Re-run only when the storage key surface intentionally changes (rename,
 * addition, removal). Property 9 will fail otherwise — that's by design.
 */
import { writeStorageKeysBaseline } from "../src/test/ux-ui-upgrade/storage-keys-scan.ts";

const snapshot = writeStorageKeysBaseline();
// biome-ignore lint/suspicious/noConsole: one-off CLI feedback for developers regenerating the baseline.
console.log(`Wrote storage-keys baseline: ${snapshot.keyCount} keys`);
