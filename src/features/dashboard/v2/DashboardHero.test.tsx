import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { DashboardHero } from "./DashboardHero";

describe("DashboardHero", () => {
  it("renders compact identity and local-save context without motivational competition", () => {
    render(
      <MemoryRouter>
        <DashboardHero
          caption="THỨ BẢY, 08/08/2026"
          currentWeek={4}
          totalWeeks={12}
          displayName="An"
          lastSavedLabel="vừa xong"
        />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("dashboard-context-strip")).toHaveTextContent("Chào An");
    expect(screen.getByText("Tuần 4 / 12")).toBeInTheDocument();
    expect(screen.getByText("Đã lưu cục bộ · vừa xong")).toBeInTheDocument();
    expect(screen.queryByText("Mở kế hoạch 12 tuần")).not.toBeInTheDocument();
    expect(screen.queryByAltText("Bảng tầm nhìn")).not.toBeInTheDocument();
  });
});
