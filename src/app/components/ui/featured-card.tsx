import type * as React from "react";

import { Card } from "./card";
import { cn } from "./utils";

function FeaturedCard({ className, interactive, ...props }: React.ComponentProps<typeof Card>) {
  return (
    <Card
      interactive={interactive}
      className={cn(
        "surface-elevated relative overflow-hidden rounded-2xl border-app-accent/40 bg-app-surface bg-gradient-to-br from-app-accent-soft/30 to-transparent",
        interactive && "surface-clickable-elevated",
        className,
      )}
      {...props}
    />
  );
}

export { FeaturedCard };
