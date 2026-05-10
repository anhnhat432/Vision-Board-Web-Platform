import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { WizardStepPip } from "./WizardStepPip";

const steps = [
  { id: "specific", label: "Specific", shortLabel: "S" },
  { id: "measurable", label: "Measurable", shortLabel: "M" },
  { id: "review", label: "Review", shortLabel: "R" },
] as const;

describe("WizardStepPip", () => {
  it("marks the active step with aria-current across the flow", () => {
    const { rerender } = render(<WizardStepPip steps={steps} currentStep={0} />);

    expect(screen.getByText("Specific").closest("li")).toHaveAttribute("aria-current", "step");

    rerender(<WizardStepPip steps={steps} currentStep={1} />);
    expect(screen.getByText("Measurable").closest("li")).toHaveAttribute("aria-current", "step");

    rerender(<WizardStepPip steps={steps} currentStep={2} />);
    expect(screen.getByText("Review").closest("li")).toHaveAttribute("aria-current", "step");
  });

  it("allows completed steps to jump and keeps pending steps disabled", async () => {
    const user = userEvent.setup();
    const onJumpToStep = vi.fn();

    render(<WizardStepPip steps={steps} currentStep={1} onJumpToStep={onJumpToStep} />);

    await user.click(screen.getByRole("button", { name: /Specific/i }));
    expect(onJumpToStep).toHaveBeenCalledWith(0);

    await user.click(screen.getByRole("button", { name: /Review/i }));
    expect(onJumpToStep).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: /Review/i })).toBeDisabled();
  });

  it("renders a compact mobile progress summary when requested", () => {
    render(<WizardStepPip steps={steps} currentStep={1} mobileMode="compact" />);

    expect(screen.getByText("Bước 2/3")).toBeInTheDocument();
    expect(screen.getAllByText("Measurable").length).toBeGreaterThan(0);
    expect(screen.getByRole("progressbar", { name: "Tiến độ wizard" })).toHaveAttribute(
      "aria-valuenow",
      "2",
    );
  });

  it("matches the visual shell snapshot", () => {
    const { container } = render(<WizardStepPip steps={steps} currentStep={1} onJumpToStep={vi.fn()} />);

    expect(container.firstChild).toMatchInlineSnapshot(`
      <div
        class="rounded-[var(--r-tile)] border border-slate-200/80 bg-slate-50/72 p-2"
      >
        <ol
          aria-label="Tiến độ các bước"
          class="flex gap-2 overflow-x-auto"
        >
          <li
            class="min-w-fit flex-1"
          >
            <button
              class="flex h-full w-full items-center gap-2 rounded-[var(--r-control)] px-3 py-2 text-left text-xs font-semibold tracking-normal transition-colors text-slate-600 hover:bg-white"
              type="button"
            >
              <span
                aria-hidden="true"
                class="flex size-6 shrink-0 items-center justify-center rounded-[var(--r-pill)] border text-[11px] font-bold border-primary/30 bg-primary/10 text-primary"
              >
                <svg
                  class="lucide lucide-check size-3.5"
                  fill="none"
                  height="24"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  viewBox="0 0 24 24"
                  width="24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M20 6 9 17l-5-5"
                  />
                </svg>
              </span>
              <span
                class="sm:hidden"
              >
                S
              </span>
              <span
                class="hidden sm:inline"
              >
                Specific
              </span>
            </button>
          </li>
          <li
            aria-current="step"
            class="min-w-fit flex-1"
          >
            <button
              class="flex h-full w-full items-center gap-2 rounded-[var(--r-control)] px-3 py-2 text-left text-xs font-semibold tracking-normal transition-colors bg-slate-50 text-slate-900 ring-2 ring-primary/40 cursor-default"
              disabled=""
              type="button"
            >
              <span
                aria-hidden="true"
                class="flex size-6 shrink-0 items-center justify-center rounded-[var(--r-pill)] border text-[11px] font-bold border-primary bg-primary text-white"
              >
                2
              </span>
              <span
                class="sm:hidden"
              >
                M
              </span>
              <span
                class="hidden sm:inline"
              >
                Measurable
              </span>
            </button>
          </li>
          <li
            class="min-w-fit flex-1"
          >
            <button
              class="flex h-full w-full items-center gap-2 rounded-[var(--r-control)] px-3 py-2 text-left text-xs font-semibold tracking-normal transition-colors text-slate-400 cursor-default"
              disabled=""
              type="button"
            >
              <span
                aria-hidden="true"
                class="flex size-6 shrink-0 items-center justify-center rounded-[var(--r-pill)] border text-[11px] font-bold border-slate-300 bg-white text-slate-400"
              >
                3
              </span>
              <span
                class="sm:hidden"
              >
                R
              </span>
              <span
                class="hidden sm:inline"
              >
                Review
              </span>
            </button>
          </li>
        </ol>
      </div>
    `);
  });
});
