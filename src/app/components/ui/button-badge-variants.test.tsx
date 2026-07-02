import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { badgeVariants } from "./badge";
import { Button, buttonVariants } from "./button";
import { Card } from "./card";
import { Dialog, DialogContent, DialogTitle } from "./dialog";
import { Input } from "./input";
import { Sheet, SheetContent, SheetTitle } from "./sheet";

describe("UI primitive visual hierarchy", () => {
  it("keeps the primary button as a solid app accent action", () => {
    const primary = buttonVariants({ variant: "default" });

    expect(primary).toContain("bg-app-accent");
    expect(primary).toContain("text-white");
    expect(primary).not.toContain("gradient-brand");
  });

  it("uses app tokens for secondary and outline button hierarchy", () => {
    expect(buttonVariants({ variant: "secondary" })).toContain("bg-app-accent-soft");

    const outline = buttonVariants({ variant: "outline" });
    expect(outline).toContain("border-app-line");
    expect(outline).toContain("bg-app-surface");
    expect(outline).toContain("text-app-ink");
  });

  it("applies the four-state interaction pattern across button variants", () => {
    const primary = buttonVariants({ variant: "default" });
    expect(primary).toContain("hover:bg-app-accent-hover");
    expect(primary).toContain("active:scale-[0.98]");
    expect(primary).toContain("focus-visible:ring-app-accent/35");
    expect(primary).toContain("disabled:opacity-50");

    const ghost = buttonVariants({ variant: "ghost" });
    expect(ghost).toContain("hover:bg-app-ink/5");
    expect(ghost).toContain("active:scale-[0.98]");

    const outline = buttonVariants({ variant: "outline" });
    expect(outline).toContain("hover:border-app-accent/35");
    expect(outline).toContain("hover:bg-app-accent-soft/20");

    const link = buttonVariants({ variant: "link" });
    expect(link).toContain("text-app-accent");
    expect(link).toContain("hover:underline");
    expect(link).not.toContain("hover:opacity-");
  });

  it("renders the loading state without changing button width", () => {
    render(
      <Button loading aria-label="Saving">
        Lưu
      </Button>,
    );

    const btn = document.querySelector('[data-slot="button"]');
    expect(btn?.getAttribute("aria-busy")).toBe("true");
    expect(btn?.getAttribute("data-loading")).toBe("true");
    expect(btn?.hasAttribute("disabled")).toBe(true);
    expect(btn?.querySelector(".animate-spin")).toBeTruthy();
    expect(btn?.querySelector(".opacity-60")?.textContent).toBe("Lưu");
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
    expect(badgeVariants()).toContain("rounded-[var(--r-control)]");

    render(<Card data-testid="card" />);
    expect(document.querySelector('[data-testid="card"]')?.className).toContain("rounded-card");

    render(<Input aria-label="Name" />);
    expect(document.querySelector('[data-slot="input"]')?.className).toContain("rounded-[var(--r-input)]");

    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Dialog title</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    expect(document.querySelector('[data-slot="dialog-content"]')?.className).toContain("rounded-[var(--r-card)]");

    render(
      <Sheet open>
        <SheetContent>
          <SheetTitle>Sheet title</SheetTitle>
        </SheetContent>
      </Sheet>,
    );
    expect(document.querySelector('[data-slot="sheet-content"]')?.className).toContain("rounded-l-[var(--r-card)]");
  });
});
