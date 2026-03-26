import { Component, type ErrorInfo, type ReactNode } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class TabErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("TabErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="border border-red-200/70 bg-red-50/80 shadow-[0_22px_60px_-36px_rgba(220,38,38,0.12)]">
          <CardContent className="flex min-h-[220px] flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-400">
              {this.props.fallbackTitle ?? "Đã có lỗi xảy ra"}
            </p>
            <p className="text-base font-semibold text-slate-900">
              Phần này không tải được. Hãy thử lại.
            </p>
            <p className="mx-auto max-w-xl text-sm leading-7 text-slate-500">
              {this.state.error?.message ?? "Lỗi ngoài dự kiến."}
            </p>
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
