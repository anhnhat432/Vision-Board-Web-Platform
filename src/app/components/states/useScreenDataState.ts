import { useCallback, useEffect, useState } from "react";

/**
 * Trạng thái dữ liệu chuẩn hoá cho mọi Core_Flow_Screen. Tại bất kỳ thời điểm
 * nào, một màn hình chỉ hiển thị ĐÚNG MỘT trong bốn trạng thái này
 * (Requirement 7.7 — loại trừ lẫn nhau).
 */
export type ScreenStateKind = "loading" | "empty" | "error" | "ready";

/**
 * Ngưỡng timeout mặc định cho việc tải dữ liệu. Nếu quá ngưỡng này mà chưa
 * hoàn tất, màn hình chuyển sang trạng thái lỗi kèm hành động thử lại
 * (Requirement 7.6).
 */
export const SCREEN_DATA_STATE_TIMEOUT_MS = 30_000;

export type ScreenLoadStatus = "loading" | "ready" | "error";

export interface UseScreenDataStateOptions {
  /** Trạng thái tải thô từ nguồn dữ liệu (hook/async source). */
  status: ScreenLoadStatus;
  /**
   * Tải xong nhưng không có bản ghi nào để hiển thị → trạng thái rỗng
   * (Requirement 7.2). Chỉ có ý nghĩa khi `status === "ready"`.
   */
  isEmpty?: boolean;
  /**
   * Hành động khởi động lại việc tải. Được gọi khi người dùng kích hoạt
   * control thử lại (Requirement 7.5). Hàm này KHÔNG được xoá/reset dữ liệu
   * cục bộ — chỉ tải lại.
   */
  onRetry?: () => void;
  /** Cho phép override ngưỡng timeout (chủ yếu phục vụ test). */
  timeoutMs?: number;
}

export interface ScreenDataStateResult {
  /** Trạng thái đã phân giải — luôn đúng một giá trị. */
  kind: ScreenStateKind;
  /** Đã quá ngưỡng timeout khi đang tải hay chưa. */
  timedOut: boolean;
  /** Kích hoạt thử lại: gỡ chốt timeout và gọi `onRetry`. */
  retry: () => void;
}

/**
 * Hàm thuần phân giải trạng thái hiển thị từ các đầu vào. Tách riêng để dễ
 * kiểm chứng (Property 5 — máy trạng thái màn hình).
 */
export function resolveScreenStateKind(status: ScreenLoadStatus, isEmpty: boolean, timedOut: boolean): ScreenStateKind {
  if (status === "error" || timedOut) return "error";
  if (status === "loading") return "loading";
  return isEmpty ? "empty" : "ready";
}

/**
 * Hook chuẩn hoá máy trạng thái tải/rỗng/lỗi/sẵn-sàng cho Core_Flow_Screen.
 *
 * - Đảm bảo loại trừ lẫn nhau: trả về đúng một `kind` (Requirement 7.7).
 * - Timeout guard: quá `timeoutMs` khi đang tải → chuyển `error` (Requirement 7.6).
 * - Thử lại: `retry()` gỡ chốt timeout, gọi `onRetry` để tải lại và đưa hệ về
 *   trạng thái tải (Requirement 7.5). Không đụng tới dữ liệu cục bộ.
 */
export function useScreenDataState({
  status,
  isEmpty = false,
  onRetry,
  timeoutMs = SCREEN_DATA_STATE_TIMEOUT_MS,
}: UseScreenDataStateOptions): ScreenDataStateResult {
  const [timedOut, setTimedOut] = useState(false);
  // Mỗi lần thử lại tăng nonce để tái khởi động bộ đếm timeout ngay cả khi
  // `status` vẫn đang ở "loading".
  const [retryNonce, setRetryNonce] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: retryNonce trong deps là chủ đích — mỗi lần retry() tăng nonce để tái khởi động bộ đếm timeout ngay cả khi status vẫn ở "loading" (Requirement 7.5).
  useEffect(() => {
    if (status !== "loading") {
      // Rời khỏi trạng thái tải (thành công hoặc lỗi tường minh) → gỡ chốt
      // timeout để lần tải kế tiếp có cửa sổ 30s mới.
      setTimedOut(false);
      return;
    }

    if (timeoutMs <= 0) return;

    const timer = setTimeout(() => setTimedOut(true), timeoutMs);
    return () => clearTimeout(timer);
  }, [status, timeoutMs, retryNonce]);

  const retry = useCallback(() => {
    setTimedOut(false);
    setRetryNonce((nonce) => nonce + 1);
    onRetry?.();
  }, [onRetry]);

  const kind = resolveScreenStateKind(status, isEmpty, timedOut);

  return { kind, timedOut, retry };
}
