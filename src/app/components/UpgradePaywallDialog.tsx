import { lazy, Suspense } from "react";
import { loadWithChunkReload } from "../utils/chunkLoad";
import type { UpgradePaywallDialogProps } from "./UpgradePaywallDialog.utils";

export {
  buildBillingPlanUpgradePath,
  getCurrentUpgradeOriginPath,
} from "./UpgradePaywallDialog.utils";
export type { UpgradePaywallDialogProps } from "./UpgradePaywallDialog.utils";

const UpgradePaywallDialogImpl = lazy(() =>
  loadWithChunkReload(async () => ({
    default: (await import("./UpgradePaywallDialog.impl")).UpgradePaywallDialog,
  })),
);

export function UpgradePaywallDialog(props: UpgradePaywallDialogProps) {
  if (!props.open) return null;

  return (
    <Suspense fallback={null}>
      <UpgradePaywallDialogImpl {...props} />
    </Suspense>
  );
}