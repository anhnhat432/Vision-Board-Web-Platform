import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { renderAppRoute, resetTestStorage, seedPendingSetupContext } from "@/test/app-flow-helpers";

describe("12-week setup Guided Canvas", () => {
  beforeEach(() => {
    resetTestStorage();
    seedPendingSetupContext();
  });

  it("keeps the setup context focused on the current 12-week destination", async () => {
    renderAppRoute("/12-week-setup");

    expect(await screen.findByRole("heading", { level: 1, name: "Tạo kế hoạch 12 tuần" })).toBeInTheDocument();
    expect(screen.getByText("Mục tiêu 12 tuần")).toBeInTheDocument();
    expect(screen.getByText("Ra mắt flow 12 tuần dễ dùng hơn")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Lộ trình hành trình 12 tuần" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Dựa trên mục tiêu SMART/i)).not.toBeInTheDocument();
  });
});
