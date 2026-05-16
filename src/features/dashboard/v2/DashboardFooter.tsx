interface DashboardFooterProps {
  lastSavedLabel: string;
}

export function DashboardFooter({ lastSavedLabel }: DashboardFooterProps) {
  return (
    <footer className="border-t border-app-line py-5 text-[12px] text-app-ink-muted">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span>Đã lưu cục bộ · {lastSavedLabel}</span>
        <span>Trang chính · 12-Week Year</span>
      </div>
    </footer>
  );
}
