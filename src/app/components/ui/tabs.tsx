"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "./utils";

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  );
}

const TabsList = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({
  className,
  ...props
}, ref) => {
  return (
    <TabsPrimitive.List
      ref={ref}
      data-slot="tabs-list"
      className={cn(
        "text-muted-foreground inline-flex min-h-[3.25rem] max-w-full items-center justify-start gap-1 overflow-x-auto rounded-[var(--r-control)] border border-white/70 bg-white/82 p-1 shadow-sm",
        className,
      )}
      {...props}
    />
  );
});
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({
  className,
  ...props
}, ref) => {
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      data-slot="tabs-trigger"
      className={cn(
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-[var(--r-control)] border border-transparent px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-colors transition-shadow transition-transform duration-150 focus-visible:ring-[3px] focus-visible:outline-1 hover:bg-white/72 hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "text-slate-600 dark:text-muted-foreground",
        "data-[state=active]:text-white data-[state=active]:font-semibold data-[state=active]:border-transparent data-[state=active]:scale-[1.02]",
        "data-[state=active]:bg-[linear-gradient(135deg,var(--tone-shell-primary)_0%,var(--tone-shell-secondary)_55%,var(--tone-shell-tertiary)_100%)]",
        "data-[state=active]:shadow-md",
        className,
      )}
      {...props}
    />
  );
});
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({
  className,
  ...props
}, ref) => {
  return (
    <TabsPrimitive.Content
      ref={ref}
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  );
});
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
