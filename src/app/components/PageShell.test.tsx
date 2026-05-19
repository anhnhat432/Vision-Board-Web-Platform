import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PageShell } from "./PageShell";

describe("PageShell", () => {
  it("uses the shared desktop page rhythm and default content width", () => {
    render(
      <PageShell>
        <div>Shared page content</div>
      </PageShell>,
    );

    const content = screen.getByText("Shared page content");
    const inner = content.parentElement;
    const outer = inner?.parentElement;

    expect(inner).toHaveClass("mx-auto", "w-full", "max-w-5xl");
    expect(outer).toHaveClass("min-h-screen", "px-4", "pb-12", "pt-8", "sm:px-6", "lg:px-8");
  });

  it("maps wider product pages to the same max width as the dashboard shell", () => {
    render(
      <PageShell maxWidth="xl">
        <div>Wide page content</div>
      </PageShell>,
    );

    expect(screen.getByText("Wide page content").parentElement).toHaveClass("max-w-6xl");
  });
});
