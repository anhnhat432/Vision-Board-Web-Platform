import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";

import { badgeVariants } from "./badge";
import { buttonVariants } from "./button";
import { Card } from "./card";
import { Dialog, DialogContent, DialogTitle } from "./dialog";
import { Input } from "./input";
import { Sheet, SheetContent, SheetTitle } from "./sheet";

describe("UI primitive visual hierarchy", () => {
  it("keeps the primary button as the only gradient hierarchy without a base shadow", () => {
    const primary = buttonVariants({ variant: "default" });

    expect(primary).toContain("gradient-brand");
    expect(primary).toContain("shadow-none");
    expect(primary).toContain("hover:shadow-[0_18px_38px_-24px_var(--tone-shell-shadow-strong)]");
    expect(primary).not.toContain("shadow-lg");
  });

  it("uses a dark secondary button and white outline tertiary button", () => {
    expect(buttonVariants({ variant: "secondary" })).toContain("bg-slate-950");

    const outline = buttonVariants({ variant: "outline" });
    expect(outline).toContain("border-slate-300");
    expect(outline).toContain("bg-white");
    expect(outline).toContain("text-slate-900");
  });

  it("maps badge status variants to semantic color tokens", () => {
    expect(badgeVariants({ variant: "success" })).toContain("var(--color-success-bg)");
    expect(badgeVariants({ variant: "warning" })).toContain("var(--color-warning-bg)");
    expect(badgeVariants({ variant: "info" })).toContain("var(--color-info-bg)");
    expect(badgeVariants({ variant: "danger" })).toContain("var(--color-danger-bg)");
    expect(badgeVariants({ variant: "neutral" })).toContain("var(--muted)");
    expect(badgeVariants({ variant: "brand" })).toContain("var(--tone-shell-primary)");
  });

  it("uses semantic radius tokens for primitive defaults", () => {
    expect(buttonVariants()).toContain("rounded-[var(--r-control)]");
    expect(buttonVariants({ size: "icon" })).not.toContain("rounded-[var(--r-card)]");
    expect(badgeVariants()).toContain("rounded-[var(--r-pill)]");

    render(<Card data-testid="card" />);
    expect(document.querySelector('[data-testid="card"]')?.className).toContain(
      "rounded-[var(--r-card)]",
    );

    render(<Input aria-label="Name" />);
    expect(document.querySelector('[data-slot="input"]')?.className).toContain(
      "rounded-[var(--r-control)]",
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
