import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useDirtyFormGuard } from "./useDirtyFormGuard";

function GuardHarness({ isDirty, flushPendingSave }: { isDirty: boolean; flushPendingSave: () => void }) {
  useDirtyFormGuard(isDirty, flushPendingSave);
  return null;
}

describe("useDirtyFormGuard", () => {
  it("flushes pending save before unload when form is dirty", () => {
    const flushPendingSave = vi.fn();
    render(<GuardHarness isDirty flushPendingSave={flushPendingSave} />);

    const event = new Event("beforeunload", { cancelable: true }) as BeforeUnloadEvent;
    let returnValueVal = "";
    Object.defineProperty(event, "returnValue", {
      get: () => returnValueVal,
      set: (val) => { returnValueVal = val; },
      configurable: true,
    });
    window.dispatchEvent(event);

    expect(flushPendingSave).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
    expect(returnValueVal).toBe("");
  });

  it("flushes pending save on unmount when form is dirty", () => {
    const flushPendingSave = vi.fn();
    const { unmount } = render(<GuardHarness isDirty flushPendingSave={flushPendingSave} />);

    unmount();

    expect(flushPendingSave).toHaveBeenCalledTimes(1);
  });
});
