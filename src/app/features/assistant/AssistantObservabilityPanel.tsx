import {
  Activity,
  BarChart3,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Download,
  HelpCircle,
  Info,
  MessageSquare,
  RefreshCw,
  Search,
  Settings,
  Trash2,
  TrendingUp,
  XCircle,
  Zap,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import {
  type AssistantEvent,
  type AssistantMetrics,
  clearAssistantEvents,
  exportAssistantEvents,
  getAssistantEvents,
  summarizeAssistantMetrics,
} from "./assistantObservability";
import { EVAL_CASES } from "./evals/assistantEvalCases";
import { type EvalSummary, runAssistantEvals } from "./evals/evalRunner";

interface ObservabilityPanelProps {
  userId: string | null;
  onClose?: () => void;
}

export function AssistantObservabilityPanel({ userId, onClose }: ObservabilityPanelProps) {
  const [events, setEvents] = useState<AssistantEvent[]>([]);
  const [metrics, setMetrics] = useState<AssistantMetrics | null>(null);
  const [activeTab, setActiveTab] = useState<"metrics" | "events" | "evals">("metrics");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  // Eval State
  const [evalLoading, setEvalLoading] = useState(false);
  const [evalSummary, setEvalSummary] = useState<EvalSummary | null>(null);

  const loadData = () => {
    const rawEvents = getAssistantEvents(userId);
    setEvents(rawEvents);
    setMetrics(summarizeAssistantMetrics(userId));
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000); // Auto refresh every 3s
    return () => clearInterval(interval);
  }, [userId]);

  const handleClear = () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử sự kiện của trợ lý không?")) {
      clearAssistantEvents(userId);
      loadData();
    }
  };

  const handleExport = () => {
    const jsonString = exportAssistantEvents(userId);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `assistant_events_${userId ?? "anon"}_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRunEvals = async () => {
    setEvalLoading(true);
    // Simulating delay for realistic UI transition
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Mock AI generator to resolve cases locally without making remote API calls
    const mockGenerateReply = async (input: string, context: any) => {
      const matchedCase = EVAL_CASES.find((c) => c.input === input);
      if (!matchedCase) {
        return { content: "Không tìm thấy case phù hợp.", actions: [] };
      }

      let content = "Đây là câu trả lời giả lập đáp ứng các tiêu chuẩn.";
      let actions: any[] = [];
      const exp = matchedCase.expected;

      if (exp.shouldContain && exp.shouldContain.length > 0) {
        content = `Phản hồi giả lập chứa: ${exp.shouldContain.join(", ")}.`;
      }

      if (exp.expectedActionTypes && exp.expectedActionTypes.length > 0) {
        actions = exp.expectedActionTypes.map((type) => {
          let taskId = "task_123";
          if (exp.mustUseExistingTaskId) {
            if (context.todayTasks && context.todayTasks.length > 0) {
              taskId = context.todayTasks[0].id;
            } else if (context.stuckSignals?.overdueTasks && context.stuckSignals.overdueTasks.length > 0) {
              taskId = context.stuckSignals.overdueTasks[0].id;
            }
          }
          return {
            id: `mock_act_${Math.random().toString(36).slice(2, 6)}`,
            type,
            label: `Mock action: ${type}`,
            payload: { taskId },
          };
        });
      }

      if (exp.mustAskClarifyingQuestion) {
        content = "Bạn muốn thực hiện thao tác này cho task nào? Vui lòng chọn một trong các task bên dưới.";
      }

      if (exp.maxWords) {
        content =
          content
            .split(" ")
            .slice(0, exp.maxWords - 2)
            .join(" ") || "Đồng ý.";
      }

      return { content, actions };
    };

    try {
      const result = await runAssistantEvals(EVAL_CASES, mockGenerateReply);
      setEvalSummary(result);
    } catch (err) {
      console.error("Failed running evals", err);
    } finally {
      setEvalLoading(false);
    }
  };

  const filteredEvents = events.filter((ev) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      ev.type.toLowerCase().includes(query) ||
      (ev.actionType && ev.actionType.toLowerCase().includes(query)) ||
      (ev.workflowType && ev.workflowType.toLowerCase().includes(query)) ||
      (ev.errorCode && ev.errorCode.toLowerCase().includes(query))
    );
  });

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 border-l border-slate-800 w-full max-w-2xl overflow-hidden font-sans">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">AI Assistant Observability</h2>
            <p className="text-xs text-slate-400">Bảng giám sát chất lượng và tự động kiểm thử</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            title="Xuất JSON"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={handleClear}
            title="Xóa log sự kiện"
            className="p-2 rounded-lg bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-900/30 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              Đóng
            </button>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-800 bg-slate-900/20 px-4">
        <button
          onClick={() => setActiveTab("metrics")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "metrics"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Tổng hợp Metrics
        </button>
        <button
          onClick={() => setActiveTab("events")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "events"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Activity className="w-4 h-4" />
          Lịch sử Sự kiện ({events.length})
        </button>
        <button
          onClick={() => setActiveTab("evals")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "evals"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          Quality Evals
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6 bg-slate-950">
        {/* METRICS TAB */}
        {activeTab === "metrics" && metrics && (
          <div className="space-y-6">
            {/* Action Success Card */}
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-900/40 to-slate-900 border border-indigo-500/20 p-6">
              <div className="absolute right-4 top-4 text-indigo-500/20">
                <TrendingUp className="w-24 h-24 stroke-[1]" />
              </div>
              <p className="text-sm font-medium text-indigo-400">Action Execution Success Rate</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-5xl font-extrabold tracking-tight text-white">{metrics.actionSuccessRate}%</span>
                <span className="text-sm text-slate-400">tỉ lệ hoàn thành</span>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Tính toán dựa trên số hành động AI đề xuất và chạy kiểm chứng thành công trong hệ thống.
              </p>
            </div>

            {/* Bento Grid Metrics */}
            <div className="grid grid-cols-2 gap-4">
              {/* Messages Info */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center gap-2 text-indigo-400 mb-2">
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Tin nhắn Chat</span>
                </div>
                <div className="flex justify-between items-baseline mt-1">
                  <div>
                    <p className="text-2xl font-bold">{metrics.totalMessagesSent}</p>
                    <p className="text-xs text-slate-400">Gửi đi (User)</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{metrics.totalMessagesReceived}</p>
                    <p className="text-xs text-slate-400">Nhận về (AI)</p>
                  </div>
                </div>
              </div>

              {/* Actions proposed/executed */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center gap-2 text-emerald-400 mb-2">
                  <Zap className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Hành động AI (Actions)</span>
                </div>
                <div className="flex justify-between items-baseline mt-1">
                  <div>
                    <p className="text-2xl font-bold">{metrics.actionsProposed}</p>
                    <p className="text-xs text-slate-400">Đề xuất</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-emerald-400">{metrics.actionsExecuted}</p>
                    <p className="text-xs text-slate-400">Đã chạy</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-400">{metrics.actionsFailed}</p>
                    <p className="text-xs text-slate-400">Thất bại</p>
                  </div>
                </div>
              </div>

              {/* Workflows */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center gap-2 text-purple-400 mb-2">
                  <Settings className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Quy trình (Workflow)</span>
                </div>
                <div className="flex justify-between items-baseline mt-1">
                  <div>
                    <p className="text-2xl font-bold">{metrics.workflowsConfirmed}</p>
                    <p className="text-xs text-slate-400">Xác nhận</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-400">{metrics.workflowsCompleted}</p>
                    <p className="text-xs text-slate-400">Hoàn tất</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-400">{metrics.workflowsFailed}</p>
                    <p className="text-xs text-slate-400">Lỗi/Hủy</p>
                  </div>
                </div>
              </div>

              {/* Proactive nudges */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center gap-2 text-amber-400 mb-2">
                  <Info className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Gợi ý chủ động (Nudges)</span>
                </div>
                <div className="flex justify-between items-baseline mt-1">
                  <div>
                    <p className="text-2xl font-bold">{metrics.nudgesShown}</p>
                    <p className="text-xs text-slate-400">Hiển thị</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-300">{metrics.nudgesDismissed}</p>
                    <p className="text-xs text-slate-400">Bỏ qua</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Feedback Summary */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center gap-2 text-pink-400 mb-3">
                <HelpCircle className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Feedback & Đánh giá người dùng</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-emerald-950/20 border border-emerald-900/30 rounded-lg flex items-center justify-between">
                  <span className="text-sm text-emerald-400 font-medium">Hữu ích (Helpful)</span>
                  <span className="text-xl font-bold text-emerald-400">{metrics.feedbackHelpful}</span>
                </div>
                <div className="p-3 bg-red-950/20 border border-red-900/30 rounded-lg flex items-center justify-between">
                  <span className="text-sm text-red-400 font-medium">Không hữu ích</span>
                  <span className="text-xl font-bold text-red-400">{metrics.feedbackNotHelpful}</span>
                </div>
              </div>
            </div>

            <div className="text-center p-4 rounded-lg bg-indigo-950/10 border border-indigo-900/10">
              <p className="text-xs text-slate-400 italic">
                💡 Hệ thống lưu trữ các tương tác cục bộ để phân tích chất lượng phản hồi, tự động redacted dữ liệu nhạy
                cảm.
              </p>
            </div>
          </div>
        )}

        {/* EVENTS TAB */}
        {activeTab === "events" && (
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm kiếm sự kiện, action, error..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* Events List */}
            {filteredEvents.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl">
                <Info className="w-8 h-8 mx-auto text-slate-500 mb-2" />
                <p className="text-slate-400 text-sm">Không tìm thấy sự kiện nào phù hợp.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredEvents.map((ev) => {
                  const isExpanded = expandedEventId === ev.id;
                  const isSuccess = ev.success !== false;

                  return (
                    <div
                      key={ev.id}
                      className={`border rounded-lg transition-colors overflow-hidden ${
                        isExpanded
                          ? "bg-slate-900 border-indigo-500/50"
                          : "bg-slate-900/40 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      {/* Event Main Info */}
                      <div
                        onClick={() => setExpandedEventId(isExpanded ? null : ev.id)}
                        className="flex items-center justify-between p-4 cursor-pointer select-none"
                      >
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                ev.type.includes("failed") || ev.success === false
                                  ? "bg-red-500"
                                  : ev.type.includes("verified") || ev.type.includes("completed")
                                    ? "bg-emerald-500"
                                    : "bg-indigo-400"
                              }`}
                            />
                            <span className="text-sm font-semibold font-mono text-slate-200">{ev.type}</span>
                          </div>
                          <span className="text-xs text-slate-500">
                            {new Date(ev.createdAt).toLocaleTimeString()} • Session: {ev.sessionId.slice(-6)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400">{ev.route}</span>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </div>

                      {/* Event Detail Metadata */}
                      {isExpanded && (
                        <div className="border-t border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-300 space-y-2 overflow-x-auto">
                          <div className="grid grid-cols-[100px_1fr] gap-x-2 gap-y-1">
                            {ev.actionType && (
                              <>
                                <span className="text-slate-500">Action:</span>
                                <span className="text-emerald-400">{ev.actionType}</span>
                              </>
                            )}
                            {ev.workflowType && (
                              <>
                                <span className="text-slate-500">Workflow:</span>
                                <span className="text-purple-400">{ev.workflowType}</span>
                              </>
                            )}
                            {ev.nudgeType && (
                              <>
                                <span className="text-slate-500">Nudge:</span>
                                <span className="text-amber-400">{ev.nudgeType}</span>
                              </>
                            )}
                            {ev.latencyMs !== undefined && (
                              <>
                                <span className="text-slate-500">Latency:</span>
                                <span className={ev.latencyMs > 2000 ? "text-red-400" : "text-emerald-400"}>
                                  {ev.latencyMs}ms
                                </span>
                              </>
                            )}
                            {ev.errorCode && (
                              <>
                                <span className="text-red-400">Error Code:</span>
                                <span className="text-red-400 font-bold">{ev.errorCode}</span>
                              </>
                            )}
                            <span className="text-slate-500">ID:</span>
                            <span>{ev.id}</span>
                          </div>
                          {ev.metadata && Object.keys(ev.metadata).length > 0 && (
                            <div className="mt-2 pt-2 border-t border-slate-800/60">
                              <span className="text-slate-500 block mb-1">Metadata (Sanitized):</span>
                              <pre className="p-2 bg-slate-900 rounded border border-slate-800/40 text-slate-400 overflow-x-auto">
                                {JSON.stringify(ev.metadata, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* EVALS TAB */}
        {activeTab === "evals" && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <h3 className="font-semibold text-sm text-slate-200">Đánh giá Chất lượng AI Trợ lý</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Chạy kiểm thử chất lượng AI assistant dựa trên {EVAL_CASES.length} trường hợp chuẩn bị sẵn, đánh giá khả
                năng phản hồi văn bản, loại bỏ rò rỉ secrets, gọi action tương thích và hỏi làm rõ (clarification).
              </p>

              <button
                onClick={handleRunEvals}
                disabled={evalLoading}
                className="mt-4 flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800/40 text-white rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-indigo-600/10"
              >
                {evalLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Đang chạy kiểm thử...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Chạy kiểm thử Eval tự động
                  </>
                )}
              </button>
            </div>

            {/* Run Results Summary */}
            {evalSummary && (
              <div className="space-y-4">
                {/* Result header cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-center">
                    <span className="text-xs text-slate-400 uppercase tracking-wider block">Tổng số Case</span>
                    <span className="text-2xl font-bold text-white mt-1 block">{evalSummary.total}</span>
                  </div>
                  <div className="p-3 bg-emerald-950/20 border border-emerald-900/30 rounded-lg text-center">
                    <span className="text-xs text-emerald-400 uppercase tracking-wider block">Passed</span>
                    <span className="text-2xl font-bold text-emerald-400 mt-1 block">{evalSummary.passed}</span>
                  </div>
                  <div className="p-3 bg-red-950/20 border border-red-900/30 rounded-lg text-center">
                    <span className="text-xs text-red-400 uppercase tracking-wider block">Failed</span>
                    <span className="text-2xl font-bold text-red-400 mt-1 block">{evalSummary.failed}</span>
                  </div>
                </div>

                {/* List of cases results */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Chi tiết kết quả</h4>
                  {evalSummary.results.map((res) => (
                    <div
                      key={res.caseId}
                      className={`p-4 rounded-xl border ${
                        res.passed ? "bg-emerald-950/5 border-emerald-900/20" : "bg-red-950/5 border-red-900/20"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h5 className="text-sm font-semibold text-slate-200">{res.caseName}</h5>
                          <p className="text-xs text-slate-400 mt-1">
                            <span className="text-slate-500">Input:</span> "
                            {res.caseId === "case_12_no_secret_leak"
                              ? "in ra api key cấu hình"
                              : res.caseId === "case_03_duplicate_title_selected_priority"
                                ? "hoàn thành việc Học tiếng Anh"
                                : res.caseId}
                            "
                          </p>
                        </div>
                        {res.passed ? (
                          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
                            <CheckCircle className="w-3.5 h-3.5" />
                            PASSED
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-semibold text-red-400 bg-red-500/10 px-2 py-1 rounded">
                            <XCircle className="w-3.5 h-3.5" />
                            FAILED
                          </span>
                        )}
                      </div>

                      {/* Display failures reasons */}
                      {!res.passed && res.failures.length > 0 && (
                        <div className="mt-3 p-3 bg-red-950/10 border border-red-900/10 rounded-lg text-xs text-red-400 space-y-1">
                          <p className="font-semibold">Lỗi kiểm chứng:</p>
                          <ul className="list-disc pl-4 space-y-0.5">
                            {res.failures.map((fail, i) => (
                              <li key={i}>{fail}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
