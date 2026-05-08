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
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium tracking-normal transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-ring active:translate-y-0 active:scale-[0.985]",
  {
    variants: {
      variant: {
        default:
          "border-transparent gradient-brand text-primary-foreground shadow-lg hover:shadow-xl hover:scale-[1.01]",
        destructive:
          "border-transparent bg-destructive text-white shadow-lg hover:bg-destructive/90 hover:shadow-xl hover:scale-[1.01] focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border-slate-300 bg-white/78 text-foreground shadow-sm hover:border-slate-400 hover:bg-white hover:text-accent-foreground hover:shadow-md hover:scale-[1.01] dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "border border-white/60 bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/95 hover:shadow-md hover:scale-[1.01]",
        ghost:
          "text-slate-600 hover:bg-white/82 hover:text-slate-900 hover:shadow-sm hover:scale-[1.01] dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 py-2.5 has-[>svg]:px-4",
        sm: "h-10 gap-1.5 px-4 has-[>svg]:px-3",
        lg: "h-12 px-7 text-base has-[>svg]:px-5",
        icon: "size-10 rounded-2xl",
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
  };

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, asChild = false, style, onPointerMove, onPointerLeave, ...props },
  ref,
) {
  const prefersReducedMotion = useReducedMotion();
  const Comp = asChild ? Slot : "button";
  const magnetic = !prefersReducedMotion && variant !== "link";

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
      className={cn(buttonVariants({ variant, size, className }), magnetic && "button-magnetic")}
      style={{ ...DEFAULT_BUTTON_STYLE, ...style }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      {...props}
    />
  );
});

export { Button, buttonVariants };
