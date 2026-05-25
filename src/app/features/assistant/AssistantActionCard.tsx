import { CheckSquare, Plus, ArrowRight } from "lucide-react";
import type { AssistantAction } from "./parseActions";

interface AssistantActionCardProps {
  action: AssistantAction;
  onExecute: (action: AssistantAction) => Promise<void>;
  status: "pending" | "executing" | "done" | "error";
  errorMessage?: string;
}

function getIconForAction(type: AssistantAction["type"]) {
  switch (type) {
    case "create_task":
      return <Plus size={16} className="text-indigo-600" />;
    case "mark_task_done":
      return <CheckSquare size={16} className="text-green-600" />;
    case "navigate_to":
      return <ArrowRight size={16} className="text-blue-600" />;
  }
}

export function AssistantActionCard({ action, onExecute, status, errorMessage }: AssistantActionCardProps) {
  const handleClick = async () => {
    if (status === "executing" || status === "done") return;
    await onExecute(action);
  };

  return (
    <div className="mt-2 rounded-lg border border-app-line bg-app-bg p-3">
      <div className="flex items-start gap-2">
        <div className="mt-0.5">{getIconForAction(action.type)}</div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">{action.label}</p>
          {status === "error" && errorMessage && (
            <p className="mt-1 text-xs text-red-600">{errorMessage}</p>
          )}
        </div>
        <button
          type="button"
          onClick={handleClick}
          disabled={status === "executing" || status === "done"}
          className={`rounded px-3 py-1.5 text-xs font-medium transition ${
            status === "done"
              ? "bg-green-100 text-green-700 cursor-default"
              : status === "error"
              ? "bg-red-100 text-red-700 cursor-default"
              : "bg-indigo-600 text-white hover:bg-indigo-700"
          }`}
        >
          {status === "executing" && (
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent align-middle mr-1" />
          )}
          {status === "pending" && "Đồng ý"}
          {status === "executing" && "Đang làm..."}
          {status === "done" && "Đã làm"}
          {status === "error" && "Lỗi"}
        </button>
      </div>
    </div>
  );
}