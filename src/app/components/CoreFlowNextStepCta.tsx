import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router";

import { getAppMode } from "../utils/app-mode";
import {
  CORE_FLOW_NEXT_STEP_CTA_LABEL,
  CORE_FLOW_STEP_ROUTE,
  isRegisteredRoute,
} from "../utils/core-flow-navigation";
import { type CoreFlowCompletion, type CoreFlowStepId, resolveCoreFlowPosition } from "../utils/core-flow-position";
import { InlineStatusMessage } from "./states";
import { Button } from "./ui/button";
import { cn } from "./ui/utils";

interface CoreFlowNextStepCtaProps {
  /** Bước Core_Flow của màn hình hiện tại. */
  currentStepId: CoreFlowStepId;
  /** Trạng thái hoàn tất các bước, dùng để phân giải bước kế tiếp. */
  completion: CoreFlowCompletion;
  /**
   * Ghi đè bước kế tiếp khi luồng thực tế của màn hình khác thứ tự chuẩn
   * (ví dụ LifeBalance gộp bước chọn trọng tâm nên đi thẳng tới `smart_goal`).
   * Mặc định lấy `nextStepId` từ `resolveCoreFlowPosition`.
   */
  nextStepId?: CoreFlowStepId;
  /**
   * Màn hình hiện tại đã hoàn tất chưa (Req 2.2). Chỉ hiển thị Primary_CTA "next"
   * khi `ready === true`. Mặc định `true`.
   */
  ready?: boolean;
  /** Ghi đè nhãn CTA mặc định theo bước kế tiếp. */
  label?: string;
  /**
   * Ghi đè hành vi khi bấm để chạy side-effect (lưu dữ liệu, tracking, set
   * localStorage…) trước khi điều hướng. Nếu không truyền, mặc định `navigate`
   * tới route bước kế tiếp.
   */
  onActivate?: () => void;
  className?: string;
}

/**
 * Primary_CTA "bước kế tiếp" cho các màn hình Core_Flow (Req 2.2–2.7).
 *
 * - Không có bước kế tiếp → không render (Req 2.3).
 * - Route bước kế tiếp chưa đăng ký / bị chặn → ẩn CTA, hiển thị chỉ báo
 *   "bước kế tiếp hiện chưa truy cập được" (Req 2.7).
 * - Màn hình chưa hoàn tất (`ready === false`) → không render CTA "next" (Req 2.2).
 * - Ngược lại render đúng một `Button size="lg"` (quy ước Primary_CTA) trỏ tới
 *   route đã đăng ký (Req 2.4, 2.6).
 */
export function CoreFlowNextStepCta({
  currentStepId,
  completion,
  nextStepId: nextStepIdOverride,
  ready = true,
  label,
  onActivate,
  className,
}: CoreFlowNextStepCtaProps) {
  const navigate = useNavigate();
  const { nextStepId: resolvedNextStepId } = resolveCoreFlowPosition(currentStepId, completion);
  const nextStepId = nextStepIdOverride ?? resolvedNextStepId;

  // Req 2.3: không tồn tại bước kế tiếp → không render Primary_CTA "next".
  if (!nextStepId) return null;

  const target = CORE_FLOW_STEP_ROUTE[nextStepId];

  // Req 2.6, 2.7: chỉ dùng route đã đăng ký. Nếu route bị chặn/chưa đăng ký,
  // ẩn CTA và hiển thị chỉ báo.
  if (!isRegisteredRoute(target, getAppMode())) {
    return (
      <InlineStatusMessage tone="warning" className={className} testId="core-flow-next-unavailable">
        Bước kế tiếp hiện chưa truy cập được.
      </InlineStatusMessage>
    );
  }

  // Req 2.2: chỉ hiển thị CTA "next" khi màn hình hiện tại đã hoàn tất.
  if (!ready) return null;

  const handleClick = () => {
    if (onActivate) {
      onActivate();
      return;
    }
    navigate(target);
  };

  return (
    <Button
      type="button"
      size="lg"
      onClick={handleClick}
      data-core-flow-primary-cta
      className={cn("min-h-11 w-full sm:w-auto", className)}
    >
      {label ?? CORE_FLOW_NEXT_STEP_CTA_LABEL[nextStepId]}
      <ArrowRight aria-hidden="true" />
    </Button>
  );
}
