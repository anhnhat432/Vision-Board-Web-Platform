"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "./utils";

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  trackColor,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root> & {
  /** Optional inline color for the filled range (e.g. a life-area hex color) */
  trackColor?: string;
}) {
  const _values = React.useMemo(
    () => (Array.isArray(value) ? value : Array.isArray(defaultValue) ? defaultValue : [min, max]),
    [value, defaultValue, min, max],
  );

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        "relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className="relative grow overflow-hidden rounded-[var(--r-pill)] bg-slate-100 border border-white/70 shadow-inner data-[orientation=horizontal]:h-2 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-2"
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className="absolute data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full rounded-[var(--r-pill)] shadow-sm"
          style={
            trackColor
              ? { background: trackColor }
              : {
                  background:
                    "linear-gradient(90deg, rgba(37,99,235,0.92) 0%, rgba(8,145,178,0.9) 52%, rgba(16,185,129,0.88) 100%)",
                }
          }
        />
      </SliderPrimitive.Track>
      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          // biome-ignore lint/suspicious/noArrayIndexKey: thumb position is stable and index-based in Radix slider.
          key={index}
          className="block size-5 shrink-0 rounded-[var(--r-pill)] bg-white border-2 shadow-sm transition-transform transition-shadow duration-150 hover:scale-110 hover:shadow-md focus-visible:scale-110 focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
          style={trackColor ? { borderColor: trackColor } : { borderColor: "rgba(8,145,178,0.72)" }}
        />
      ))}
    </SliderPrimitive.Root>
  );
}

export { Slider };
