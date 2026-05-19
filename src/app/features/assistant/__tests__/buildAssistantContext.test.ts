import { describe, expect, it } from "vitest";
import type { AssistantPageContextHint } from "../buildAssistantContext";

describe("AssistantPageContextHint type", () => {
  it("should have correct type structure", () => {
    const pageContextHint: AssistantPageContextHint = {
      pageType: "smart-wizard",
      currentStep: "achievable",
      hint: "Đang kiểm tra mục tiêu có làm được trong điều kiện hiện tại",
    };

    expect(pageContextHint.pageType).toBe("smart-wizard");
    expect(pageContextHint.currentStep).toBe("achievable");
    expect(pageContextHint.hint).toBe("Đang kiểm tra mục tiêu có làm được trong điều kiện hiện tại");
  });

  it("should allow optional currentStep and hint", () => {
    const pageContextHint: AssistantPageContextHint = {
      pageType: "dashboard",
    };

    expect(pageContextHint.pageType).toBe("dashboard");
    expect(pageContextHint.currentStep).toBeUndefined();
    expect(pageContextHint.hint).toBeUndefined();
  });
});
