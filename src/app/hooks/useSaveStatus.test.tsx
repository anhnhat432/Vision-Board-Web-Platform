import { render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AutoSaveIndicator } from "../components/AutoSaveIndicator";
import { SAVE_STATUS } from "../utils/user-facing-copy";
import { useSaveStatus, type UseSaveStatusOptions } from "./useSaveStatus";

/**
 * Task 17.2 — timing của save-status ở lớp UI (Req 13.4, 13.5, 13.7).
 *
 * `useSaveStatus` sở hữu toàn bộ timing: "đang lưu" bám cờ `saving` (Req 13.4),
 * "đã lưu" giữ tối thiểu 2s (Req 13.5), lỗi lưu có ưu tiên cao nhất (Req 13.7).
 * Test dùng fake timers để kiểm chứng cửa sổ 300ms / 2s một cách tất định.
 */
describe("useSaveStatus — timing lưu (fake timers)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('hiển thị "đang lưu" ngay trong 300ms và duy trì tới khi lưu xong (Req 13.4)', () => {
    const { result, rerender } = renderHook((props: UseSaveStatusOptions) => useSaveStatus(props), {
      initialProps: { saving: false, lastSavedAt: null, dirty: true } as UseSaveStatusOptions,
    });

    expect(result.current).toBe("idle");

    // Thao tác lưu bắt đầu → "saving" xuất hiện tức thì (thoả "trong 300ms").
    rerender({ saving: true, lastSavedAt: null, dirty: true });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe("saving");

    // Lưu vẫn đang diễn ra → duy trì "saving" cho tới khi kết thúc.
    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(result.current).toBe("saving");
  });

  it('giữ trạng thái "đã lưu" tối thiểu 2 giây sau khi lưu thành công (Req 13.5)', () => {
    const savedAt = new Date();
    const { result, rerender } = renderHook((props: UseSaveStatusOptions) => useSaveStatus(props), {
      initialProps: { saving: true, lastSavedAt: null, dirty: true } as UseSaveStatusOptions,
    });

    expect(result.current).toBe("saving");

    // Lưu hoàn tất: có lastSavedAt mới, không còn saving.
    rerender({ saving: false, lastSavedAt: savedAt, dirty: true });
    expect(result.current).toBe("saved");

    // Vẫn trong cửa sổ giữ tối thiểu 2s.
    act(() => {
      vi.advanceTimersByTime(1_999);
    });
    expect(result.current).toBe("saved");

    // Qua mốc 2s và vẫn còn thay đổi chưa lưu (dirty) → rời "saved".
    act(() => {
      vi.advanceTimersByTime(2);
    });
    expect(result.current).toBe("idle");
  });

  it('trạng thái lỗi lưu có ưu tiên cao nhất và không tự đổi (Req 13.7)', () => {
    const savedAt = new Date();
    const { result, rerender } = renderHook((props: UseSaveStatusOptions) => useSaveStatus(props), {
      initialProps: { saving: false, lastSavedAt: savedAt, dirty: false } as UseSaveStatusOptions,
    });

    expect(result.current).toBe("saved");

    rerender({ saving: false, lastSavedAt: savedAt, dirty: false, errored: true });
    expect(result.current).toBe("error");

    // Lỗi thắng cả saving.
    rerender({ saving: true, lastSavedAt: savedAt, dirty: false, errored: true });
    expect(result.current).toBe("error");
  });
});

/**
 * Harness mô phỏng đúng cách form Core_Flow nối `useSaveStatus` với
 * `AutoSaveIndicator` (copy `SAVE_STATUS`). Kiểm chứng save-status hiển thị đúng
 * và giá trị người dùng nhập KHÔNG bị đổi khi thao tác lưu bị từ chối (Req 13.7).
 */
interface SaveHarnessProps {
  saving: boolean;
  errored?: boolean;
  lastSavedAt: Date | null;
}

function SaveHarness({ saving, errored = false, lastSavedAt }: SaveHarnessProps) {
  const [value, setValue] = useState("nội dung ban đầu");
  const status = useSaveStatus({ saving, errored, lastSavedAt, dirty: true });
  return (
    <div>
      <input aria-label="ghi chú" value={value} onChange={(event) => setValue(event.target.value)} />
      <AutoSaveIndicator status={status} lastSavedAt={lastSavedAt} />
    </div>
  );
}

describe("Save-status wiring — nhãn hiển thị theo timing (fake timers)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('hiển thị "Đang lưu..." trong khi lưu rồi "Đã lưu cục bộ" khi xong (Req 13.4, 13.5)', () => {
    const { rerender } = render(<SaveHarness saving lastSavedAt={null} />);

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.getByText(SAVE_STATUS.saving)).toBeInTheDocument();

    const savedAt = new Date();
    rerender(<SaveHarness saving={false} lastSavedAt={savedAt} />);
    expect(screen.getByText(new RegExp(SAVE_STATUS.saved))).toBeInTheDocument();
  });
});

describe("Save-status wiring — không mất dữ liệu khi lưu bị từ chối", () => {
  // Kịch bản tương tác bàn phím dùng real timers (userEvent không tương thích với
  // fake timers trong môi trường test này). Không phụ thuộc timing chính xác.
  it("lưu bị từ chối → hiển thị lỗi lưu và giữ nguyên giá trị đã nhập (Req 13.7)", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<SaveHarness saving lastSavedAt={null} />);

    const input = screen.getByLabelText<HTMLInputElement>("ghi chú");
    await user.clear(input);
    await user.type(input, "công việc tuần này");
    expect(input.value).toBe("công việc tuần này");

    // Thao tác lưu thất bại.
    rerender(<SaveHarness saving={false} errored lastSavedAt={null} />);

    expect(screen.getByText(SAVE_STATUS.error)).toBeInTheDocument();
    // Giá trị người dùng nhập không bị reset/clear.
    expect(screen.getByLabelText<HTMLInputElement>("ghi chú").value).toBe("công việc tuần này");
  });
});
