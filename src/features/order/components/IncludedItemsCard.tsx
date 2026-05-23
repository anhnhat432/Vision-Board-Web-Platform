import { Gift } from "lucide-react";

import { INCLUDED_DOCS } from "@/features/order/catalog/included";

export function IncludedItemsCard() {
  return (
    <div className="rounded-[var(--r-card)] border border-[color:var(--border)] bg-[color:var(--muted)] p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Gift className="h-4 w-4 text-app-accent" />
        Mỗi đơn luôn kèm:
      </div>
      <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
        {INCLUDED_DOCS.map((doc) => (
          <li key={doc.id}>• {doc.label}</li>
        ))}
      </ul>
    </div>
  );
}
