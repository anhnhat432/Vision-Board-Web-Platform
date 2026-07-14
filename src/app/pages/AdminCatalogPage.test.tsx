import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ authedFetch: vi.fn(), getApiBaseUrl: vi.fn() }));

vi.mock("@/lib/api/apiClient", () => ({ getApiBaseUrl: api.getApiBaseUrl }));
vi.mock("@/lib/auth/authedFetch", () => ({ authedFetch: api.authedFetch }));

Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", {
  configurable: true,
  value: () => false,
});
Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
  configurable: true,
  value: () => undefined,
});

const frame = {
  itemId: "frame-oak",
  type: "frame",
  label: "Khung gỗ sồi",
  priceVnd: 99000,
  sortOrder: 1,
  isActive: true,
};

function response(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: vi.fn().mockResolvedValue(body) } as unknown as Response;
}

describe("AdminCatalogPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.getApiBaseUrl.mockReturnValue("https://api.example.test/api");
    api.authedFetch.mockResolvedValue(response({ data: [frame] }));
  });

  it("loads the endpoint and exposes labelled tabs, panel, and table", async () => {
    const { AdminCatalogPage } = await import("./AdminCatalogPage");
    render(<AdminCatalogPage />);

    expect(await screen.findByRole("tab", { name: /Khung gỗ/ })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Catalog Khung gỗ" })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Danh sách Khung gỗ" })).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "Giá Khung gỗ sồi" })).toHaveValue(99000);
    expect(api.authedFetch).toHaveBeenCalledWith(
      "https://api.example.test/api/admin/order-catalog",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("rolls back price and active state after failed optimistic requests", async () => {
    const user = userEvent.setup();
    api.authedFetch
      .mockResolvedValueOnce(response({ data: [frame] }))
      .mockRejectedValueOnce(new Error("price write failed"))
      .mockRejectedValueOnce(new Error("active write failed"));
    const { AdminCatalogPage } = await import("./AdminCatalogPage");
    render(<AdminCatalogPage />);

    fireEvent.blur(await screen.findByRole("spinbutton", { name: "Giá Khung gỗ sồi" }), {
      target: { value: "120000" },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("price write failed");
    expect(screen.getByText(/99\.000/)).toBeInTheDocument();

    await user.click(screen.getByRole("switch", { name: "Khung gỗ sồi: đang bán" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("active write failed"));
    await waitFor(() =>
      expect(screen.getByRole("switch", { name: "Khung gỗ sồi: đang bán" })).toBeChecked(),
    );
  });

  it("rejects an invalid thumbnail before upload", async () => {
    const { AdminCatalogPage } = await import("./AdminCatalogPage");
    render(<AdminCatalogPage />);
    await screen.findByText("Khung gỗ sồi");

    fireEvent.change(screen.getByLabelText("Tải ảnh cho Khung gỗ sồi"), {
      target: { files: [new File(["x"], "bad.gif", { type: "image/gif" })] },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("PNG, JPEG hoặc WebP");
    expect(api.authedFetch).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Đổi ảnh Khung gỗ sồi" })).toBeInTheDocument();
  });
});
