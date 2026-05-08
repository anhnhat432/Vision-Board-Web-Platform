import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PublicVisitorHero } from "./PublicVisitorHero";

function renderHero() {
  return render(
    <PublicVisitorHero
      isDemo={true}
      onStartDemo={vi.fn()}
      onSignIn={vi.fn()}
      onSignUp={vi.fn()}
    />,
  );
}

describe("PublicVisitorHero", () => {
  it("keeps demo landing focused on one primary CTA plus optional signup", () => {
    renderHero();

    const hero = screen
      .getByRole("heading", {
        name: /Biến tầm nhìn thành mục tiêu rõ ràng/i,
      })
      .closest("[data-slot='card']");
    expect(hero).not.toBeNull();

    const scope = within(hero as HTMLElement);
    expect(scope.getByRole("button", { name: /Dùng thử miễn phí/i })).toBeInTheDocument();
    expect(scope.getByRole("button", { name: /Đăng ký để đồng bộ sau/i })).toBeInTheDocument();
    expect(scope.queryByRole("button", { name: /^Đăng nhập$/i })).not.toBeInTheDocument();
  });
});
