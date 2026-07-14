import { ArrowLeft } from "lucide-react";
import { useCallback } from "react";
import { Link, useNavigate } from "react-router";
import { cn } from "./ui/utils";

interface PageBackLinkProps {
  /**
   * Static route path (e.g. "/", "/billing/plan"). When provided the
   * component renders a `<Link>` for proper SEO and prefetch. When omitted
   * the component falls back to `navigate(-1)` with an optional `fallback`
   * path used when history depth is 0 (direct link / PWA launch).
   */
  href?: string;
  /**
   * Fallback route used when `href` is omitted AND `window.history.length`
   * indicates there is nowhere to go back to (e.g. PWA direct launch).
   * Defaults to `"/"`.
   */
  fallback?: string;
  /** Visible label. Defaults to `"Quay lại"`. */
  label?: string;
  /** Accessible label for screen readers. Defaults to the visible label. */
  ariaLabel?: string;
  /** Extra className merged onto the root element. */
  className?: string;
}

const BASE_CLASS =
  "inline-flex items-center gap-1.5 text-sm font-medium text-app-ink-muted hover:text-app-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/40 focus-visible:ring-offset-2 rounded-sm min-h-11 px-1 -ml-1";

/**
 * PageBackLink — consistent, accessible back-navigation link.
 *
 * Use on secondary pages that lack a natural back path (Settings, Order,
 * Achievements, Help, Legal pages). Do NOT use inside wizard step shells
 * (FeasibilityStepShell, SmartGoalStepShell) which already have their own
 * back buttons wired to step state.
 */
export function PageBackLink({
  href,
  fallback = "/",
  label = "Quay lại",
  ariaLabel,
  className,
}: PageBackLinkProps) {
  const navigate = useNavigate();

  const handleClick = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(fallback, { replace: true });
    }
  }, [navigate, fallback]);

  if (href) {
    return (
      <Link
        to={href}
        aria-label={ariaLabel ?? label}
        className={cn(BASE_CLASS, className)}
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {label}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={ariaLabel ?? label}
      className={cn(BASE_CLASS, "cursor-pointer bg-transparent border-0")}
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      {label}
    </button>
  );
}
