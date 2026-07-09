import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MobileActionBar } from "./MobileActionBar";

function renderMobileActionBar(isCurrentStepValid: boolean) {
  const onNext = vi.fn();
  render(
    <MobileActionBar
      stepIndex={0}
      totalSteps={5}
      isCurrentStepValid={isCurrentStepValid}
      isFinalStep={false}
      primaryCtaLabel="Tiếp tục"
      showFinalSecondaryCta={false}
      progressLabel="Bước 1/5"
      showStickyMini
      onBack={vi.fn()}
      onNext={onNext}
    />,
  );
  return { onNext };
}

describe("MobileActionBar", () => {
  it("keeps the primary CTA actionable while the current SMART step is incomplete", async () => {
    const user = userEvent.setup();
    const { onNext } = renderMobileActionBar(false);

    const button = screen.getByRole("button", { name: /Tiếp tục/i });
    expect(button).toBeEnabled();

    await user.click(button);

    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("enables the primary CTA when the current SMART step is valid", () => {
    renderMobileActionBar(true);

    expect(screen.getByRole("button", { name: /Tiếp tục/i })).toBeEnabled();
  });
});
