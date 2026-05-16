import { forwardRef, type ComponentProps, type CSSProperties, type PointerEvent } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { useReducedMotion } from "./use-reduced-motion";

import { cn } from "./utils";

const DEFAULT_BUTTON_STYLE = {
  "--button-shift-x": "0px",
  "--button-shift-y": "0px",
  "--button-pointer-x": "0.5",
  "--button-pointer-y": "0.5",
} as CSSProperties;

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--r-control)] text-sm font-semibold tracking-tight transition-[transform,box-shadow,background-color,color,border-color] duration-200 ease-out disabled:pointer-events-none disabled:opacity-50 motion-reduce:transform-none motion-reduce:transition-none [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-ring active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "border border-transparent gradient-brand text-primary-foreground shadow-[0_1px_2px_rgba(15,23,42,0.06),0_4px_12px_-4px_var(--tone-shell-shadow)] hover:shadow-[0_2px_4px_rgba(15,23,42,0.08),0_10px_24px_-8px_var(--tone-shell-shadow-strong)] hover:-translate-y-px",
        destructive:
          "border border-transparent bg-destructive text-white shadow-[0_1px_2px_rgba(15,23,42,0.06),0_4px_12px_-4px_rgba(220,38,38,0.32)] hover:bg-destructive/92 hover:-translate-y-px focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive",
        outline:
          "border border-[color:var(--border)] bg-card text-foreground shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:bg-[color:var(--muted)] hover:border-[color:color-mix(in_srgb,var(--foreground)_18%,transparent)] hover:-translate-y-px dark:hover:bg-[color:var(--muted)]",
        secondary:
          "border border-foreground bg-foreground text-background shadow-[0_1px_2px_rgba(15,23,42,0.06),0_4px_12px_-4px_rgba(15,23,42,0.18)] hover:bg-foreground/90 hover:-translate-y-px",
        ghost:
          "text-muted-foreground hover:bg-[color:var(--muted)] hover:text-foreground dark:hover:bg-[color:var(--muted)]",
        link: "text-primary underline-offset-4 hover:underline px-0",
      },
      size: {
        default: "h-10 px-4 py-2 has-[>svg]:px-3.5",
        sm: "h-9 gap-1.5 px-3.5 text-sm has-[>svg]:px-3",
        lg: "h-12 px-6 text-base has-[>svg]:px-5",
        icon: "size-10",
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
    /**
     * Add an ambient brand glow pulse. Reserve for the single most
     * important primary CTA on the page (e.g. dashboard hero).
     * Respects reduced-motion automatically.
     */
    glow?: boolean;
  };

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, asChild = false, glow = false, style, onPointerMove, onPointerLeave, ...props },
  ref,
) {
  const prefersReducedMotion = useReducedMotion();
  const Comp = asChild ? Slot : "button";
  const isPrimaryVariant = variant === undefined || variant === "default";
  const magnetic = !prefersReducedMotion && isPrimaryVariant;
  const showGlow = glow && !prefersReducedMotion;

  const setPointer = (element: HTMLElement, x: number, y: number, hovering: boolean) => {
    const shiftX = ((x - 0.5) * 5).toFixed(2);
    const shiftY = ((y - 0.5) * 4).toFixed(2);

    element.style.setProperty("--button-shift-x", `${shiftX}px`);
    element.style.setProperty("--button-shift-y", `${shiftY}px`);
    element.style.setProperty("--button-pointer-x", x.toFixed(4));
    element.style.setProperty("--button-pointer-y", y.toFixed(4));
    element.dataset.buttonHovering = hovering ? "true" : "false";
  };

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    onPointerMove?.(event as never);

    if (event.defaultPrevented || !magnetic || event.pointerType === "touch") {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width === 0 || bounds.height === 0) return;

    const pointerX = Math.min(Math.max((event.clientX - bounds.left) / bounds.width, 0), 1);
    const pointerY = Math.min(Math.max((event.clientY - bounds.top) / bounds.height, 0), 1);

    setPointer(event.currentTarget as HTMLElement, pointerX, pointerY, true);
  };

  const handlePointerLeave = (event: PointerEvent<HTMLElement>) => {
    onPointerLeave?.(event as never);

    if (!magnetic) return;
    setPointer(event.currentTarget as HTMLElement, 0.5, 0.5, false);
  };

  return (
    <Comp
      ref={ref}
      data-slot="button"
      data-button-hovering="false"
      className={cn(
        buttonVariants({ variant, size, className }),
        magnetic && "button-magnetic",
        showGlow && "brand-glow-pulse",
      )}
      style={{ ...DEFAULT_BUTTON_STYLE, ...style }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      {...props}
    />
  );
});

export { Button, buttonVariants };
