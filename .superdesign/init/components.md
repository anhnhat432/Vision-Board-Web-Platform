# Shared UI Primitives

This file contains the key UI primitives of the design system with their implementation details.

## 1. Button (`src/app/components/ui/button.tsx`)

```tsx
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { type ComponentProps, forwardRef } from "react";
import { cn } from "./utils";

const buttonVariants = cva(
  cn(
    "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--r-control)] text-sm font-semibold tracking-tight after:absolute after:top-1/2 after:left-1/2 after:-translate-x-1/2 after:-translate-y-1/2 after:h-11 after:w-full after:min-w-[44px] sm:after:hidden",
    "shrink-0 [&_svg]:shrink-0 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
    "transition-[transform,box-shadow,background-color,color,border-color,text-decoration-color] duration-[180ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
    "active:duration-[100ms]",
    "outline-none focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-bg)]",
    "disabled:pointer-events-none disabled:opacity-50",
    "motion-reduce:transition-none motion-reduce:transform-none motion-reduce:active:scale-100",
  ),
  {
    variants: {
      variant: {
        default: cn(
          "border border-transparent bg-app-accent text-white shadow-app-sm",
          "hover:bg-app-accent-hover hover:shadow-app-md",
          "active:scale-[0.97] active:shadow-app-sm",
          "focus-visible:ring-app-accent/35",
        ),
        destructive: cn(
          "border border-transparent bg-destructive text-white shadow-app-sm",
          "hover:bg-destructive/90 hover:shadow-app-md",
          "active:scale-[0.97] active:shadow-app-sm",
          "focus-visible:ring-destructive/35",
        ),
        outline: cn(
          "border border-app-line bg-app-surface text-app-ink shadow-3xs",
          "hover:border-app-accent/50 hover:bg-app-accent-soft/20 hover:shadow-2xs",
          "active:scale-[0.97] active:bg-app-accent-soft/40",
          "focus-visible:ring-app-accent/35",
        ),
        secondary: cn(
          "border border-transparent bg-app-accent-soft text-app-accent",
          "hover:bg-app-accent-soft/80",
          "active:scale-[0.97]",
          "focus-visible:ring-app-accent/35",
        ),
        ghost: cn(
          "bg-transparent text-app-ink",
          "hover:bg-app-ink/5",
          "active:scale-[0.97] active:bg-app-ink/[0.08]",
          "focus-visible:ring-app-accent/35",
        ),
        link: cn(
          "px-0 text-app-accent underline-offset-4",
          "hover:underline hover:decoration-app-accent/60 hover:decoration-1",
          "active:text-app-accent/80",
          "focus-visible:ring-app-accent/35",
        ),
      },
      size: {
        default: "h-10 px-4 py-2 has-[>svg]:px-3.5",
        sm: "h-9 gap-1.5 px-3.5 text-sm has-[>svg]:px-3",
        lg: "h-12 px-6 text-base has-[>svg]:px-5",
        icon: "size-11 sm:size-9 active:scale-[0.96]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
  };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, asChild = false, loading = false, disabled, children, ...props },
  ref,
) {
  const classes = cn(buttonVariants({ variant, size, className }));

  if (asChild) {
    return (
      <Slot ref={ref} data-slot="button" className={classes} {...props}>
        {children}
      </Slot>
    );
  }

  return (
    <button
      ref={ref}
      data-slot="button"
      data-loading={loading || undefined}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={classes}
      {...props}
    >
      {loading ? (
        <>
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
            <Loader2 className="size-4 animate-spin" />
          </span>
          <span className="opacity-60">{children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
});
```

## 2. Card (`src/app/components/ui/card.tsx`)

```tsx
import * as React from "react";
import { cn } from "./utils";

export function Card({ className, interactive = false, ...props }: React.ComponentProps<"div"> & { interactive?: boolean }) {
  return (
    <div
      data-slot="card"
      className={cn(
        "surface-raised flex flex-col gap-5 rounded-card text-card-foreground sm:gap-6 border border-app-line bg-app-surface shadow-app-sm",
        interactive && "hover:border-app-accent/30 hover:shadow-app-md transition-all duration-200 cursor-pointer",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "flex flex-col gap-2 p-6 pb-0",
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, as: Heading = "h3", ...props }: React.ComponentProps<"h3"> & { as?: "h2" | "h3" | "h4" }) {
  return (
    <Heading
      data-slot="card-title"
      className={cn("font-serif text-lg font-medium leading-tight tracking-normal text-app-ink", className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-sm leading-6 tracking-normal text-app-ink-soft", className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("p-6 pt-4", className)}
      {...props}
    />
  );
}

export function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center p-6 pt-0 border-t border-app-line/45 mt-4", className)}
      {...props}
    />
  );
}
```

## 3. Input (`src/app/components/ui/input.tsx`)

```tsx
import * as React from "react";
import { cn } from "./utils";

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-input border border-app-line bg-app-surface px-3 py-2 text-sm text-app-ink placeholder:text-app-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 focus-visible:border-app-accent disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";
```
