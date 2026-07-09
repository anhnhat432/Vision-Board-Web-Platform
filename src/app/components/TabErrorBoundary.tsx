import { Component, type ErrorInfo, type ReactNode } from "react";
import { captureFrontendException } from "@/lib/monitoring/sentry";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const SAFE_TAB_ERROR_DESCRIPTION =
  "Chi tiết lỗi đã được ẩn để bảo vệ dữ liệu của bạn. Hãy thử lại hoặc tải lại trang nếu phần này vẫn chưa mở được.";
const MAX_COMPONENT_STACK_LENGTH = 1_000;

function getSafeComponentStack(errorInfo: ErrorInfo): string | undefined {
  const componentStack = errorInfo.componentStack?.trim();
  if (!componentStack) return undefined;

  if (componentStack.length <= MAX_COMPONENT_STACK_LENGTH) return componentStack;
  return `${componentStack.slice(0, MAX_COMPONENT_STACK_LENGTH)}...[truncated]`;
}

export class TabErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const componentStack = getSafeComponentStack(errorInfo);

    console.error("TabErrorBoundary caught", {
      errorName: error.name || "Error",
      componentStackPresent: Boolean(errorInfo.componentStack),
    });
    captureFrontendException(error, {
      boundary: "TabErrorBoundary",
      tags: {
        boundary: "TabErrorBoundary",
      },
      extra: {
        componentStackPresent: Boolean(componentStack),
        ...(componentStack ? { componentStack } : {}),
      },
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="border border-red-200/70 bg-red-50/80 shadow-lg">
          <CardContent className="flex min-h-[220px] flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-400">
              {this.props.fallbackTitle ?? "Đã có lỗi xảy ra"}
            </p>
            <p className="text-base font-semibold text-app-ink">Phần này không tải được. Hãy thử lại.</p>
            <p className="mx-auto max-w-xl text-sm leading-7 text-app-ink-muted">{SAFE_TAB_ERROR_DESCRIPTION}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Thử lại
            </Button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
