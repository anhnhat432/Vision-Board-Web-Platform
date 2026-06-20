import { Save } from "lucide-react";

interface DashboardFooterProps {
  lastSavedLabel: string;
}

export function DashboardFooter({ lastSavedLabel }: DashboardFooterProps) {
  return (
    <footer className="border-t border-app-line py-5 text-xs text-app-ink-muted">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="flex items-center gap-1.5">
          <Save className="h-3.5 w-3.5" aria-hidden="true" />
          Đã lưu cục bộ · {lastSavedLabel}
        </span>
        <div className="flex items-center gap-1">
          <span>Trang chính · 12-Week Year</span>
          <span aria-hidden="true" className="mx-1">
            ·
          </span>
          <a
            href="https://deerflow.tech"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-app-accent font-semibold transition-colors duration-150 flex items-center gap-0.5"
          >
            ✦ Created By Deerflow
          </a>
        </div>
      </div>
    </footer>
  );
}
