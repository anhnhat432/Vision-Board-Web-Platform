import type * as React from "react";

import { Card } from "./card";
import { cn } from "./utils";

function FeaturedCard({ className, ...props }: React.ComponentProps<typeof Card>) {
  return <Card className={cn("relative overflow-hidden ring-1 ring-app-accent/20 shadow-sm", className)} {...props} />;
}

export { FeaturedCard };
