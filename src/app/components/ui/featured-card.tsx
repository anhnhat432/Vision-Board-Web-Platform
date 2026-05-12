import type * as React from "react";

import { Card } from "./card";
import { cn } from "./utils";

function FeaturedCard({ className, ...props }: React.ComponentProps<typeof Card>) {
  return (
    <Card
      className={cn(
        "featured-surface glow-vivid relative overflow-hidden ring-1 ring-violet-200/60 dark:ring-violet-400/15",
        className,
      )}
      {...props}
    />
  );
}

export { FeaturedCard };
