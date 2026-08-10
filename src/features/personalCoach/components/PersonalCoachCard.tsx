import type {
  CoachRecommendation,
  PersonalCoachContext,
} from "@shared/personalCoachSchema";
import {
  ArrowRight,
  ChevronDown,
  Compass,
  RefreshCw,
} from "lucide-react";
import { Link } from "react-router";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/app/components/ui/collapsible";
import { usePersonalCoach, type PersonalCoachState } from "../hooks/usePersonalCoach";

interface PersonalCoachCardProps {
  context: PersonalCoachContext | null;
  setupHref: string;
}

interface CoachActionLink {
  href: string;
  label: string;
}

function getActionLink(action: CoachRecommendation["primaryAction"]): CoachActionLink | null {
  switch (action.type) {
    case "open_task":
      return { href: "/12-week-system?tab=today", label: "Mở trong Today" };
    case "open_today":
      return { href: "/12-week-system?tab=today", label: "Mở Today" };
    case "open_week_review":
      return { href: "/12-week-system?tab=week", label: "Review tuần" };
    case "open_week_plan":
      return { href: "/12-week-system?tab=week", label: "Xem kế hoạch tuần" };
    case "none":
      return null;
  }
}

function getStateBadge(state: PersonalCoachState): string {
  switch (state.status) {
    case "idle":
      return "Cần dữ liệu";
    case "loading":
      return "Đang cân nhắc";
    case "ready":
      return state.source === "ai" ? "Theo dữ liệu hiện tại" : "Từ kế hoạch";
    case "offline":
      return "Ngoại tuyến";
    case "rate_limited":
      return "Tạm giới hạn";
    case "error":
      return "Gợi ý dự phòng";
  }
}

function getStateMessage(state: PersonalCoachState): string | null {
  switch (state.status) {
    case "loading":
      return "Coach đang làm mới gợi ý. Bạn vẫn có thể tiếp tục với đề xuất hiện tại.";
    case "offline":
      return "Đang dùng gợi ý từ kế hoạch trên thiết bị. Kết nối lại để làm mới.";
    case "rate_limited":
      return "Lượt Coach đang tạm giới hạn. Kế hoạch của bạn vẫn hoạt động bình thường.";
    case "error":
      return "Coach chưa thể tạo gợi ý cá nhân hóa. Kế hoạch và tiến độ vẫn hoạt động bình thường.";
    case "idle":
    case "ready":
      return null;
  }
}

export function PersonalCoachCard({ context, setupHref }: PersonalCoachCardProps) {
  const { state, retry, isRetrying } = usePersonalCoach(context);

  if (!context || state.status === "idle") {
    return (
      <section
        data-testid="personal-coach-card"
        className="relative overflow-hidden rounded-card border border-app-line bg-app-surface/85 p-5 shadow-app-sm sm:p-6"
        aria-labelledby="personal-coach-empty-title"
      >
        <div className="flex items-start gap-3">
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-app-accent/20 bg-app-accent-subtle text-app-accent"
            aria-hidden="true"
          >
            <Compass className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-app-accent">
              Coach · Quyết định tiếp theo
            </p>
            <h2 id="personal-coach-empty-title" className="mt-2 font-serif text-xl font-bold text-app-ink">
              Coach cần một mục tiêu 12 tuần
            </h2>
            <p className="mt-2 max-w-[60ch] text-sm leading-6 text-app-ink-soft">
              Bạn chưa có chu kỳ 12 tuần đang hoạt động. Tiếp tục luồng thiết lập để Coach có thể gợi ý dựa trên kế hoạch thật.
            </p>
            <Link
              to={setupHref}
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-app-accent/25 bg-app-accent-subtle px-4 py-2 text-sm font-semibold text-app-accent transition-colors hover:bg-app-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/35"
            >
              Tiếp tục thiết lập
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const recommendation = state.recommendation;
  const action = getActionLink(recommendation.primaryAction);
  const stateMessage = getStateMessage(state);
  const canRetry = state.status === "offline" || state.status === "rate_limited" || state.status === "error";

  return (
    <section
      data-testid="personal-coach-card"
      className="relative overflow-hidden rounded-card border border-app-line bg-app-surface/90 p-5 shadow-app-sm sm:p-6"
      aria-labelledby="personal-coach-title"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="flex min-w-0 flex-1 items-start gap-3.5">
          <span
            className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full border border-app-accent/20 bg-app-accent-subtle text-app-accent"
            aria-hidden="true"
          >
            <Compass className="h-5 w-5" />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-app-accent">
                Coach · Quyết định tiếp theo
              </p>
              <span className="rounded-full border border-app-line bg-app-bg-subtle px-2.5 py-1 text-[10px] font-bold text-app-ink-muted">
                {getStateBadge(state)}
              </span>
            </div>

            <h2 id="personal-coach-title" className="mt-2.5 font-serif text-xl font-bold leading-tight text-app-ink">
              {recommendation.title}
            </h2>
            <p className="mt-2 max-w-[62ch] text-[15px] font-medium leading-6 text-app-ink-soft">
              {recommendation.recommendation}
            </p>
            {recommendation.caution ? (
              <p className="mt-2 text-xs font-semibold leading-5 text-app-status-warning">
                {recommendation.caution}
              </p>
            ) : null}

            {stateMessage ? (
              <p
                role={state.status === "loading" ? "status" : undefined}
                className="mt-3 text-xs font-medium leading-5 text-app-ink-muted"
              >
                {stateMessage}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              {action ? (
                <Link
                  to={action.href}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-app-accent/25 bg-app-accent-subtle px-4 py-2 text-sm font-semibold text-app-accent transition-colors hover:bg-app-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/35"
                >
                  {action.label}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              ) : null}

              {canRetry ? (
                <button
                  type="button"
                  onClick={retry}
                  disabled={isRetrying}
                  aria-label="Thử lại gợi ý Coach"
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-app-line bg-app-surface px-4 py-2 text-sm font-semibold text-app-ink-soft transition-colors hover:bg-app-bg hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw className={`h-4 w-4 ${isRetrying ? "animate-spin" : ""}`} aria-hidden="true" />
                  {isRetrying ? "Đang thử lại" : "Thử lại"}
                </button>
              ) : null}
            </div>

            <Collapsible className="mt-3">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="group inline-flex min-h-11 items-center gap-1.5 rounded-full px-1 text-xs font-bold text-app-ink-muted transition-colors hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
                >
                  Vì sao?
                  <ChevronDown
                    className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180"
                    aria-hidden="true"
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ul className="mt-1 max-w-[64ch] space-y-2 border-l border-app-accent/25 pl-4 text-sm leading-5 text-app-ink-soft">
                  {recommendation.rationale.slice(0, 3).map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      </div>
    </section>
  );
}
