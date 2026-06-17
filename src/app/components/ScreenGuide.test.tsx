import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { SCREEN_GUIDE_SEEN_STORAGE_PREFIX } from "../utils/storage-constants";
import { ScreenGuide, startScreenGuide } from "./ScreenGuide";

const FIRST_RUN_GUIDANCE_COMPLETED_KEY = "visionboard_first_run_guidance_completed_at";

const guideProps = {
  screenId: "test-screen",
  title: "Cách dùng màn này",
  intro: "Một hướng dẫn ngắn cho người mới.",
  steps: [
    { label: "Bước 1.", text: "Nhìn khu vực chính trước." },
    { label: "Bước 2.", text: "Bấm hành động tiếp theo khi đã sẵn sàng." },
  ],
  tip: "Bạn luôn có thể mở lại hướng dẫn từ nút này.",
};

function seenKey(screenId = guideProps.screenId) {
  return `${SCREEN_GUIDE_SEEN_STORAGE_PREFIX}${screenId}`;
}

describe("ScreenGuide", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("auto-opens only the first time and still lets the user reopen it", async () => {
    const { unmount } = render(<ScreenGuide {...guideProps} autoOpen />);

    expect(await screen.findByRole("dialog", { name: guideProps.title })).toBeInTheDocument();
    expect(localStorage.getItem(seenKey())).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "Đã hiểu" }));
    await new Promise((resolve) => window.setTimeout(resolve, 550));
    expect(screen.queryByRole("dialog", { name: guideProps.title })).not.toBeInTheDocument();

    unmount();
    render(<ScreenGuide {...guideProps} autoOpen />);

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: guideProps.title })).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: `Hướng dẫn nhanh: ${guideProps.title}` }));
    expect(await screen.findByRole("dialog", { name: guideProps.title })).toBeInTheDocument();
  });

  it("opens a pending guide request when the screen guide mounts after the event", async () => {
    startScreenGuide("lazy-screen", { force: true });

    render(<ScreenGuide {...guideProps} screenId="lazy-screen" autoOpen={false} />);

    expect(await screen.findByRole("dialog", { name: guideProps.title })).toBeInTheDocument();
    expect(localStorage.getItem(seenKey("lazy-screen"))).toBe("true");
  });

  it("does not auto-open on later screens after first-run guidance already completed", async () => {
    localStorage.setItem(FIRST_RUN_GUIDANCE_COMPLETED_KEY, new Date().toISOString());

    render(<ScreenGuide {...guideProps} screenId="later-screen" autoOpen />);

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: guideProps.title })).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole("button")[0]);
    expect(await screen.findByRole("dialog", { name: guideProps.title })).toBeInTheDocument();
  });
});
