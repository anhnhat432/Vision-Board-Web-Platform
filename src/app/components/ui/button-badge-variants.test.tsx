import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";

import { badgeVariants } from "./badge";
import { Button, buttonVariants } from "./button";
import { Card } from "./card";
import { Dialog, DialogContent, DialogTitle } from "./dialog";
import { Input } from "./input";
import { Sheet, SheetContent, SheetTitle } from "./sheet";

describe("UI primitive visual hierarchy", () => {
  it("keeps the primary button as the only gradient hierarchy with a tonal shadow", () => {
    const primary = buttonVariants({ variant: "default" });

    expect(primary).toContain("gradient-brand");
    expect(primary).toContain("var(--tone-shell-shadow-strong)");
    expect(primary).not.toContain("shadow-lg");
  });

  it("uses a dark secondary button and tokenized outline tertiary button", () => {
    expect(buttonVariants({ variant: "secondary" })).toContain("bg-foreground");

    const outline = buttonVariants({ variant: "outline" });
    expect(outline).toContain("border-[color:var(--border)]");
    expect(outline).toContain("bg-card");
    expect(outline).toContain("text-foreground");
  });

  it("limits button magnetic motion to the primary hierarchy", () => {
    const originalMatchMedia = window.matchMedia;
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: (query: string): MediaQueryList => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }),
    });

    try {
      render(
        <>
          <Button>Primary action</Button>
          <Button variant="secondary">Secondary action</Button>
          <Button variant="outline">Outline action</Button>
        </>,
      );

      expect(document.querySelector("button:nth-of-type(1)")?.className).toContain("button-magnetic");
      expect(document.querySelector("button:nth-of-type(2)")?.className).not.toContain("button-magnetic");
      expect(document.querySelector("button:nth-of-type(3)")?.className).not.toContain("button-magnetic");
    } finally {
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        configurable: true,
        value: originalMatchMedia,
      });
    }
  });

  it("maps badge status variants to app tokens", () => {
    expect(badgeVariants({ variant: "success" })).toContain("bg-app-accent-soft");
    expect(badgeVariants({ variant: "warning" })).toContain("bg-app-warm-soft");
    expect(badgeVariants({ variant: "info" })).toContain("bg-app-bg");
    expect(badgeVariants({ variant: "danger" })).toContain("var(--color-danger-bg");
    expect(badgeVariants({ variant: "neutral" })).toContain("bg-app-bg");
    expect(badgeVariants({ variant: "brand" })).toContain("bg-app-accent");
  });

  it("uses semantic radius tokens for primitive defaults", () => {
    expect(buttonVariants()).toContain("rounded-[var(--r-control)]");
    expect(buttonVariants({ size: "icon" })).not.toContain("rounded-[var(--r-card)]");
    expect(badgeVariants()).toContain("rounded-full");

    render(<Card data-testid="card" />);
    expect(document.querySelector('[data-testid="card"]')?.className).toContain(
      "rounded-[var(--r-card)]",
    );

    render(<Input aria-label="Name" />);
    expect(document.querySelector('[data-slot="input"]')?.className).toContain(
      "rounded-[var(--r-input)]",
    );

    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Dialog title</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    expect(document.querySelector('[data-slot="dialog-content"]')?.className).toContain(
      "rounded-[var(--r-card)]",
    );

    render(
      <Sheet open>
        <SheetContent>
          <SheetTitle>Sheet title</SheetTitle>
        </SheetContent>
      </Sheet>,
    );
    expect(document.querySelector('[data-slot="sheet-content"]')?.className).toContain(
      "rounded-l-[var(--r-card)]",
    );
  });
});
