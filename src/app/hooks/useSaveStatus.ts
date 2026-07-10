/**
 * Hook lớp UI cho save-status của form Core_Flow (Req 13.4, 13.5).
 *
 * Trạng thái loại trừ lẫn nhau được phân giải bằng pure helper
 * `resolveSaveStatus`; hook này chỉ sở hữu phần *timing thuộc lớp UI*:
 * - giữ trạng thái "đã lưu" tối thiểu `savedHoldMs` (mặc định 2000ms) kể từ mỗi
 *   lần lưu thành công (Req 13.5), kể cả khi người dùng vừa chỉnh sửa tiếp;
 * - trạng thái "đang lưu" bám theo cờ `saving` do lời gọi truyền vào (Req 13.4);
 * - "đã lưu" tiếp tục hiển thị ổn định khi không còn thay đổi chưa lưu.
 *
 * Hook không đọc/ghi storage và không đổi Storage_Contract.
 */
import { useEffect, useRef, useState } from "react";

import { resolveSaveStatus, type SaveStatus } from "../utils/save-status";

export interface UseSaveStatusOptions {
  /** thao tác lưu đang diễn ra */
  saving: boolean;
  /** lần lưu gần nhất thất bại (Req 13.7) */
  errored?: boolean;
  /** thời điểm lưu thành công gần nhất; đổi giá trị = có lần lưu mới */
  lastSavedAt: Date | null;
  /** còn thay đổi chưa lưu; khi true và ngoài cửa sổ giữ, không hiển thị "đã lưu" */
  dirty?: boolean;
  /** cửa sổ giữ tối thiểu "đã lưu" (ms), mặc định 2000ms (Req 13.5) */
  savedHoldMs?: number;
}

/**
 * Trả về đúng một `SaveStatus` để truyền cho UI save-status (ví dụ
 * `AutoSaveIndicator`, dùng copy `SAVE_STATUS`).
 */
export function useSaveStatus({
  saving,
  errored = false,
  lastSavedAt,
  dirty = false,
  savedHoldMs = 2000,
}: UseSaveStatusOptions): SaveStatus {
  const [holdActive, setHoldActive] = useState(false);
  const lastSavedTsRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const ts = lastSavedAt ? lastSavedAt.getTime() : null;
    if (ts === null || ts === lastSavedTsRef.current) return;

    lastSavedTsRef.current = ts;
    setHoldActive(true);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setHoldActive(false);
      timerRef.current = null;
    }, savedHoldMs);
  }, [lastSavedAt, savedHoldMs]);

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    },
    [],
  );

  // "đã lưu" hiển thị khi: còn trong cửa sổ giữ tối thiểu (Req 13.5), hoặc đã
  // lưu xong và không còn thay đổi chưa lưu (trạng thái ổn định).
  const savedHoldActive = holdActive || (!dirty && lastSavedAt !== null);

  return resolveSaveStatus({ saving, errored, savedHoldActive });
}
