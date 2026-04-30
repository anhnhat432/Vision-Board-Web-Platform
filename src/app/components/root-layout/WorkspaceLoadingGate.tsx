import { CheckCircle2, RefreshCw } from "lucide-react";

import { Toaster } from "../ui/sonner";
import type { WorkspaceGateStage } from "./useWorkspaceGate";

export function WorkspaceLoadingGate({ stage }: { stage: WorkspaceGateStage }) {
  const stageCopy: Record<WorkspaceGateStage, { title: string; description: string }> = {
    "redirect-login": {
      title: "Đang chuyển tới đăng nhập",
      description: "Bạn cần đăng nhập trước để dữ liệu mục tiêu và kế hoạch được lưu theo tài khoản.",
    },
    auth: {
      title: "Đang kiểm tra tài khoản",
      description: "Mình đang xác nhận phiên đăng nhập trước khi mở workspace của bạn.",
    },
    profile: {
      title: "Đang mở workspace của bạn",
      description: "Mình đang nối profile backend để biết đây là người dùng mới hay người dùng đã có dữ liệu.",
    },
    sync: {
      title: "Đang đồng bộ dữ liệu",
      description: "Mình đang kiểm tra mục tiêu và kế hoạch 12 tuần đã lưu trên backend trước khi quyết định màn tiếp theo.",
    },
  };
  const copy = stageCopy[stage];
  const steps = [
    {
      label: "Xác thực đăng nhập",
      done: stage === "profile" || stage === "sync",
      active: stage === "auth" || stage === "redirect-login",
    },
    {
      label: "Nối backend profile",
      done: stage === "sync",
      active: stage === "profile",
    },
    {
      label: "Đồng bộ workspace",
      done: false,
      active: stage === "sync",
    },
  ];

  return (
    <div className="app-shell flex min-h-screen items-center justify-center px-4" data-route-tone="default">
      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-lg border border-slate-200/80 bg-white/94 p-6 text-center shadow-[0_22px_60px_-40px_rgba(15,23,42,0.38)] sm:p-7">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Dear Our Future
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-normal text-slate-950">{copy.title}</h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-slate-600" role="status" aria-live="polite">
            {copy.description}
          </p>

          <div className="mt-6 space-y-2 text-left">
            {steps.map((step) => (
              <div
                key={step.label}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm ${
                  step.done
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : step.active
                      ? "border-sky-200 bg-sky-50 text-sky-800"
                      : "border-slate-200 bg-slate-50 text-slate-500"
                }`}
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                    step.done
                      ? "bg-emerald-600 text-white"
                      : step.active
                        ? "bg-sky-600 text-white"
                        : "bg-white text-slate-400"
                  }`}
                >
                  {step.done ? <CheckCircle2 className="h-4 w-4" /> : <RefreshCw className="h-3.5 w-3.5" />}
                </div>
                <span className="font-medium">{step.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Toaster />
    </div>
  );
}
