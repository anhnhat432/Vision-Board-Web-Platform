import { useEffect, useMemo, useRef, useState } from "react";
import { CircleAlert, ClipboardList, Package, Sparkles, Truck } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { useSyncedUserData } from "../hooks/useSyncedUserData";
import { APP_STORAGE_KEYS, getLifeAreaLabel, type Goal, type VisionBoard } from "../utils/storage";
import { createLocalOrder, getKitTypeLabel, type OrderKitType } from "../utils/order-storage";
import { parsePendingSMARTGoal, type PendingSMARTGoal } from "@/lib/smart-goal";
import { useAuthContext } from "@/lib/auth/AuthContext";
import { createOrder } from "@/services/orderService";
import { saveOrderLink } from "@/lib/api/orderLinkStore";
import { getBackendGoalId } from "@/lib/api/goalLinkStore";

type FormState = {
  selectedGoalId: string;
  fullName: string;
  email: string;
  phone: string;
  shippingAddress: string;
  keywords: string;
  note: string;
  kitType: OrderKitType;
};

type OrderPageRouteState = {
  goalId?: string;
  visionBoardId?: string;
};

function getOrderPageRouteState(state: unknown): OrderPageRouteState {
  if (!state || typeof state !== "object") return {};

  const record = state as Record<string, unknown>;
  return {
    goalId: typeof record.goalId === "string" ? record.goalId : undefined,
    visionBoardId: typeof record.visionBoardId === "string" ? record.visionBoardId : undefined,
  };
}

function readStoredJson(key: string): unknown {
  const raw = localStorage.getItem(key);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function sanitizePrefillText(value: string, maxLength = 48) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function getPreferredGoal(goals: Goal[], routeGoalId?: string) {
  const candidateIds = [
    routeGoalId,
    localStorage.getItem(APP_STORAGE_KEYS.latest12WeekGoalId),
    localStorage.getItem(APP_STORAGE_KEYS.latest12WeekSystemGoalId),
    localStorage.getItem(APP_STORAGE_KEYS.latest12WeekPlanGoalId),
  ];

  for (const candidateId of candidateIds) {
    if (!candidateId) continue;
    const matchedGoal = goals.find((goal) => goal.id === candidateId);
    if (matchedGoal) return matchedGoal;
  }

  return goals[0] ?? null;
}

function getPreferredVisionBoard(boards: VisionBoard[], routeVisionBoardId?: string) {
  if (routeVisionBoardId) {
    const matchedBoard = boards.find((board) => board.id === routeVisionBoardId);
    if (matchedBoard) return matchedBoard;
  }

  return boards[boards.length - 1] ?? null;
}

function buildSuggestedKeywords(goal: Goal | null, board: VisionBoard | null, pendingGoal: PendingSMARTGoal | null) {
  const candidates = [
    goal?.title ?? "",
    goal ? getLifeAreaLabel(goal.category) : "",
    goal?.focusArea ?? "",
    pendingGoal?.focusArea ?? "",
    board?.name ?? "",
  ];

  return Array.from(new Set(candidates.map((value) => sanitizePrefillText(value, 36)).filter(Boolean)))
    .slice(0, 4)
    .join(", ");
}

function buildSuggestedNote(goal: Goal | null, board: VisionBoard | null, pendingGoal: PendingSMARTGoal | null) {
  const goalTitle = goal ? sanitizePrefillText(goal.title, 72) : "";
  const goalArea = goal ? getLifeAreaLabel(goal.category) : "";
  const boardName = board ? sanitizePrefillText(board.name, 56) : "";
  const draftGoal = pendingGoal ? sanitizePrefillText(pendingGoal.specific, 96) : "";
  const draftFocusArea = pendingGoal ? sanitizePrefillText(pendingGoal.focusArea, 48) : "";

  if (goalTitle && boardName) {
    return `Ưu tiên kit bám theo mục tiêu "${goalTitle}" và tham chiếu vision board "${boardName}".`;
  }

  if (goalTitle) {
    return `Ưu tiên kit bám theo mục tiêu "${goalTitle}" trong nhóm ${goalArea}.`;
  }

  if (boardName) {
    return `Ưu tiên kit tham chiếu vision board "${boardName}" để giữ cùng mood và keyword.`;
  }

  if (draftGoal && draftFocusArea) {
    return `Ưu tiên kit xoay quanh mục tiêu "${draftGoal}" trong định hướng "${draftFocusArea}".`;
  }

  if (draftGoal) {
    return `Ưu tiên kit xoay quanh định hướng hiện tại: ${draftGoal}.`;
  }

  return "";
}

export function OrderPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { userData } = useSyncedUserData();
  const routeState = useMemo(() => getOrderPageRouteState(location.state), [location.state]);
  const didApplyInitialContextRef = useRef(false);
  const lastSuggestedKeywordsRef = useRef("");
  const lastSuggestedNoteRef = useRef("");
  const [goals, setGoals] = useState<Goal[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [referenceBoard, setReferenceBoard] = useState<VisionBoard | null>(null);
  const [pendingGoalDraft, setPendingGoalDraft] = useState<PendingSMARTGoal | null>(null);
  const [hasTriedSubmit, setHasTriedSubmit] = useState(false);
  const [form, setForm] = useState<FormState>({
    selectedGoalId: "none",
    fullName: "",
    email: "",
    phone: "",
    shippingAddress: "",
    keywords: "",
    note: "",
    kitType: "vision-kit",
  });

  useEffect(() => {
    if (!userData) return;

    const nextGoals = userData.goals;
    const preferredGoal = getPreferredGoal(nextGoals, routeState.goalId);
    const routeBoard = getPreferredVisionBoard(userData.visionBoards, routeState.visionBoardId);
    const preferredBoard = routeState.visionBoardId || !preferredGoal ? routeBoard : null;
    const storedFocusArea = localStorage.getItem(APP_STORAGE_KEYS.selectedFocusArea)?.trim() ?? "";
    const pendingGoal = parsePendingSMARTGoal(readStoredJson(APP_STORAGE_KEYS.pendingSmartGoal), storedFocusArea);
    const routeHasExplicitContext = Boolean(routeState.goalId || routeState.visionBoardId);
    const shouldApplyPreferredContext = !didApplyInitialContextRef.current || routeHasExplicitContext;
    didApplyInitialContextRef.current = true;

    setGoals(nextGoals);
    setSelectedGoal((currentGoal) => {
      if (shouldApplyPreferredContext) return preferredGoal;
      if (!currentGoal) return null;
      return nextGoals.find((goal) => goal.id === currentGoal.id) ?? preferredGoal;
    });
    setReferenceBoard((currentBoard) => {
      if (shouldApplyPreferredContext) return preferredBoard;
      if (!currentBoard) return null;
      return userData.visionBoards.find((board) => board.id === currentBoard.id) ?? null;
    });
    setPendingGoalDraft(pendingGoal);
    setForm((current) => {
      const selectedGoalId = shouldApplyPreferredContext
        ? (preferredGoal?.id ?? "none")
        : current.selectedGoalId !== "none" && !nextGoals.some((goal) => goal.id === current.selectedGoalId)
          ? (preferredGoal?.id ?? "none")
          : current.selectedGoalId;
      const selectedGoalForSuggestions = nextGoals.find((goal) => goal.id === selectedGoalId) ?? null;
      const suggestedKeywords = buildSuggestedKeywords(selectedGoalForSuggestions, preferredBoard, pendingGoal);
      const suggestedNote = buildSuggestedNote(selectedGoalForSuggestions, preferredBoard, pendingGoal);
      const shouldRefreshKeywords =
        current.keywords.trim().length === 0 || current.keywords === lastSuggestedKeywordsRef.current;
      const shouldRefreshNote = current.note.trim().length === 0 || current.note === lastSuggestedNoteRef.current;

      lastSuggestedKeywordsRef.current = suggestedKeywords;
      lastSuggestedNoteRef.current = suggestedNote;

      return {
        ...current,
        selectedGoalId,
        keywords: shouldRefreshKeywords ? suggestedKeywords : current.keywords,
        note: shouldRefreshNote ? suggestedNote : current.note,
      };
    });
    document.title = "Tạo đơn kit - Dear Our Future";
  }, [routeState.goalId, routeState.visionBoardId, userData]);

  const suggestedKitSummary = useMemo(() => {
    if (selectedGoal && referenceBoard) {
      return `Kit sẽ bám theo mục tiêu "${selectedGoal.title}" trong nhóm ${getLifeAreaLabel(
        selectedGoal.category,
      )} và tham chiếu board "${referenceBoard.name}".`;
    }

    if (!selectedGoal) {
      if (referenceBoard) {
        return `Kit đang lấy ngữ cảnh ban đầu từ vision board "${referenceBoard.name}" để gợi ý keyword và ghi chú.`;
      }

      if (pendingGoalDraft?.specific) {
        return "Kit đang gợi ý từ mục tiêu bạn vừa xây dựng trong flow hiện tại. Bạn có thể chỉnh lại toàn bộ nội dung trước khi tạo đơn.";
      }

      return "Đơn này sẽ được tạo như một kit độc lập, chưa liên kết với mục tiêu cụ thể nào.";
    }

    return `Kit sẽ bám theo mục tiêu "${selectedGoal.title}" trong nhóm ${getLifeAreaLabel(selectedGoal.category)}.`;
  }, [pendingGoalDraft, referenceBoard, selectedGoal]);

  const prefillHint = useMemo(() => {
    const sources: string[] = [];
    if (selectedGoal || pendingGoalDraft) sources.push("mục tiêu");
    if (referenceBoard) sources.push("vision board");
    if (sources.length === 0) return "";
    return `Đã gợi ý sẵn từ ${sources.join(" và ")} hiện có. Bạn vẫn có thể chỉnh lại trước khi tạo đơn.`;
  }, [pendingGoalDraft, referenceBoard, selectedGoal]);
  const flowSourceSummary = useMemo(() => {
    if (selectedGoal && referenceBoard) {
      return `Bạn đang đi tiếp từ mục tiêu và board tham chiếu hiện có. Sau khi tạo đơn, trang trạng thái sẽ giữ nguyên ngữ cảnh này.`;
    }

    if (selectedGoal) {
      return "Bạn đang đi tiếp từ flow mục tiêu. Order page đã tự gắn mục tiêu này cho đơn hiện tại.";
    }

    if (referenceBoard) {
      return "Bạn đang đi tiếp từ vision board. Các gợi ý keyword và ghi chú đã được lấy sang đơn hiện tại.";
    }

    if (pendingGoalDraft) {
      return "Bạn đang đi tiếp từ flow goal hiện tại. Đơn này vẫn có thể chỉnh tay trước khi lưu local.";
    }

    return "Đây là một đơn local độc lập. Bạn có thể tự chọn goal hoặc tạo đơn ngay từ trạng thái hiện tại.";
  }, [pendingGoalDraft, referenceBoard, selectedGoal]);

  const keywordList = useMemo(
    () =>
      form.keywords
        .split(",")
        .map((keyword) => keyword.trim())
        .filter(Boolean),
    [form.keywords],
  );

  const fieldErrors = useMemo(
    () => ({
      fullName: form.fullName.trim().length === 0,
      email: form.email.trim().length === 0,
      shippingAddress: form.shippingAddress.trim().length === 0,
    }),
    [form.email, form.fullName, form.shippingAddress],
  );
  const missingRequiredCount = useMemo(() => Object.values(fieldErrors).filter(Boolean).length, [fieldErrors]);
  const showInlineErrors = hasTriedSubmit && missingRequiredCount > 0;

  const handleFieldChange = <TKey extends keyof FormState>(field: TKey, value: FormState[TKey]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleGoalChange = (goalId: string) => {
    const nextGoal = goals.find((goal) => goal.id === goalId) ?? null;
    const suggestedKeywords = buildSuggestedKeywords(nextGoal, referenceBoard, pendingGoalDraft);
    const suggestedNote = buildSuggestedNote(nextGoal, referenceBoard, pendingGoalDraft);

    setSelectedGoal(nextGoal);
    setForm((current) => {
      const shouldRefreshKeywords =
        current.keywords.trim().length === 0 || current.keywords === lastSuggestedKeywordsRef.current;
      const shouldRefreshNote = current.note.trim().length === 0 || current.note === lastSuggestedNoteRef.current;

      lastSuggestedKeywordsRef.current = suggestedKeywords;
      lastSuggestedNoteRef.current = suggestedNote;

      return {
        ...current,
        selectedGoalId: goalId,
        keywords: shouldRefreshKeywords ? suggestedKeywords : current.keywords,
        note: shouldRefreshNote ? suggestedNote : current.note,
      };
    });
  };

  const handleSubmit = () => {
    setHasTriedSubmit(true);

    if (!form.fullName.trim() || !form.email.trim() || !form.shippingAddress.trim()) {
      toast.error("Vui lòng điền đủ họ tên, email và địa chỉ nhận kit.");
      return;
    }

    setHasTriedSubmit(false);

    const order = createLocalOrder({
      goalId: selectedGoal?.id ?? null,
      goalTitle: selectedGoal?.title,
      focusArea: selectedGoal ? getLifeAreaLabel(selectedGoal.category) : "Tự chọn",
      fullName: form.fullName,
      email: form.email,
      phone: form.phone,
      shippingAddress: form.shippingAddress,
      keywords: form.keywords.split(","),
      note: form.note,
      kitType: form.kitType,
    });

    // Fire-and-forget: persist order to backend if authenticated.
    // Fails silently — the local order is already saved and the web continues.
    if (user) {
      const backendGoalId = selectedGoal?.id ? getBackendGoalId(selectedGoal.id) : null;

      void createOrder({
        kitType: form.kitType,
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        shippingAddress: {
          line1: form.shippingAddress.trim(),
          city: "N/A",
          country: "VN",
        },
        note: form.note.trim() || undefined,
        goalId: backendGoalId ?? undefined,
      })
        .then((backendOrder) => {
          saveOrderLink(order.id, backendOrder.id);
        })
        .catch((orderSyncError: unknown) => {
          console.warn("Backend order creation failed silently.", orderSyncError);
        });
    }

    toast.success("Đơn kit đã được tạo.");
    navigate(`/order-status/${order.id}`);
  };

  const summaryItems = [
    {
      label: "Loại kit",
      value: getKitTypeLabel(form.kitType),
      note: "Có thể thay đổi ngay trong form trước khi tạo đơn.",
      icon: Package,
    },
    {
      label: "Liên kết mục tiêu",
      value: selectedGoal ? "Đã gắn mục tiêu" : "Đơn độc lập",
      note: selectedGoal ? selectedGoal.title : "Bạn vẫn có thể tạo kit mà không gắn vào goal.",
      icon: Sparkles,
    },
    {
      label: "Trạng thái tạo mới",
      value: "Chờ xác nhận",
      note: "Đơn được lưu cục bộ bằng localStorage ở bước này.",
      icon: Truck,
    },
  ];

  return (
    <div className="space-y-8 pb-12">
      <Card className="hero-surface overflow-hidden border-0 text-white">
        <CardContent className="relative p-5 sm:p-6 lg:p-8">
          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_320px]">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-4 py-1.5 text-sm text-white/82">
                <Package className="h-4 w-4" />
                Tạo đơn kit
              </div>

              <div className="space-y-4">
                <h1 className="max-w-3xl text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
                  Tạo đơn kit cá nhân hóa từ mục tiêu hiện tại.
                </h1>
                <p className="max-w-3xl text-base leading-8 text-white/82 lg:text-lg">
                  Đây là bước local-first tối thiểu để chốt nhu cầu, người nhận và định hướng kit. Chưa kết nối backend
                  hay fulfillment thật, nhưng đủ để nhóm kiểm tra flow đặt đơn sớm.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Badge variant="outline" className="rounded-full border-white/18 bg-white/12 px-4 py-2 text-white">
                  {getKitTypeLabel(form.kitType)}
                </Badge>
                <Badge variant="outline" className="rounded-full border-white/18 bg-white/12 px-4 py-2 text-white">
                  {selectedGoal ? "Đã gắn mục tiêu" : "Đơn độc lập"}
                </Badge>
              </div>

              <p className="max-w-2xl text-sm leading-7 text-white/70">
                Sau khi tạo, bạn có thể xem lại đơn gần nhất hoặc theo dõi trạng thái ngay trong flow Order hiện tại.
              </p>
            </div>

            <div className="rounded-2xl border border-white/14 bg-white/12 p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">Tóm tắt nhanh</p>
              <div className="mt-4 space-y-2.5">
                {summaryItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div key={item.label} className="rounded-2xl border border-white/10 bg-black/12 px-4 py-3.5">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
                        <Icon className="h-3.5 w-3.5" />
                        {item.label}
                      </div>
                      <p className="mt-2 text-base font-semibold text-white">{item.value}</p>
                      <p className="mt-1 text-xs leading-6 text-white/64">{item.note}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Tạo đơn mới</CardTitle>
            <CardDescription>Giữ form gọn, rõ và dễ quét trong bước local-first đầu tiên.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Mục tiêu & cấu hình kit
                </p>
                <p className="text-sm text-slate-600">
                  Chọn mục tiêu nếu bạn muốn kit bám theo một hành trình cụ thể, hoặc giữ đơn ở dạng độc lập.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="order-goal">Gắn với mục tiêu</Label>
                  <Select value={form.selectedGoalId} onValueChange={handleGoalChange}>
                    <SelectTrigger id="order-goal" aria-label="Chọn mục tiêu cho đơn hàng">
                      <SelectValue placeholder="Chọn mục tiêu" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Không gắn mục tiêu</SelectItem>
                      {goals.map((goal) => (
                        <SelectItem key={goal.id} value={goal.id}>
                          {goal.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="order-kit-type">Loại kit</Label>
                  <Select
                    value={form.kitType}
                    onValueChange={(value: OrderKitType) => handleFieldChange("kitType", value)}
                  >
                    <SelectTrigger id="order-kit-type" aria-label="Chọn loại kit">
                      <SelectValue placeholder="Chọn loại kit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vision-kit">Vision Kit</SelectItem>
                      <SelectItem value="focus-kit">Focus Kit</SelectItem>
                      <SelectItem value="reset-kit">Reset Kit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Tóm tắt cấu hình hiện tại
                </p>
                <p className="mt-2 text-base font-semibold text-slate-900">
                  {selectedGoal ? selectedGoal.title : "Đơn này chưa gắn mục tiêu cụ thể"}
                </p>
                <p className="mt-1 text-sm leading-7 text-slate-600">{suggestedKitSummary}</p>
                <div className="mt-3 space-y-1 border-t border-slate-200/80 pt-3">
                  <p className="text-sm text-slate-500">{flowSourceSummary}</p>
                  {referenceBoard ? (
                    <p className="text-sm text-slate-500">Board tham chiếu: {referenceBoard.name}</p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="space-y-4 border-t border-slate-100 pt-6">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Người nhận</p>
                <p className="text-sm text-slate-600">
                  Thông tin tối thiểu để tạo đơn và theo dõi lại trong local order flow.
                </p>
                <p className="text-sm text-slate-500">Các trường có ghi “Bắt buộc” cần hoàn tất trước khi tạo đơn.</p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="grid gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="order-full-name">Họ và tên</Label>
                    <span className="text-xs text-slate-400">Bắt buộc</span>
                  </div>
                  <Input
                    id="order-full-name"
                    value={form.fullName}
                    onChange={(event) => handleFieldChange("fullName", event.target.value)}
                    placeholder="Nguyễn Văn A"
                    aria-invalid={showInlineErrors && fieldErrors.fullName}
                  />
                  {showInlineErrors && fieldErrors.fullName ? (
                    <p className="text-sm text-rose-600">Vui lòng nhập họ và tên người nhận.</p>
                  ) : (
                    <p className="text-sm text-slate-500">Dùng tên người nhận để dễ đối chiếu đơn demo.</p>
                  )}
                </div>

                <div className="grid gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="order-email">Email</Label>
                    <span className="text-xs text-slate-400">Bắt buộc</span>
                  </div>
                  <Input
                    id="order-email"
                    type="email"
                    value={form.email}
                    onChange={(event) => handleFieldChange("email", event.target.value)}
                    placeholder="ban@example.com"
                    aria-invalid={showInlineErrors && fieldErrors.email}
                  />
                  {showInlineErrors && fieldErrors.email ? (
                    <p className="text-sm text-rose-600">Vui lòng nhập email để lưu và nhận diện đơn.</p>
                  ) : (
                    <p className="text-sm text-slate-500">Email hiện được dùng cho flow local, chưa có gửi thư thật.</p>
                  )}
                </div>
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="order-phone">Số điện thoại</Label>
                  <span className="text-xs text-slate-400">Tùy chọn</span>
                </div>
                <Input
                  id="order-phone"
                  value={form.phone}
                  onChange={(event) => handleFieldChange("phone", event.target.value)}
                  placeholder="090..."
                />
                <p className="text-sm text-slate-500">
                  Thêm số điện thoại nếu bạn muốn trang trạng thái đủ thông tin hơn cho demo.
                </p>
              </div>
            </div>

            <div className="space-y-4 border-t border-slate-100 pt-6">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Nội dung giao kit</p>
                <p className="text-sm text-slate-600">
                  Thêm địa chỉ, keyword và ghi chú để kit dễ bám đúng mục tiêu hoặc chủ đề bạn muốn.
                </p>
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="order-address">Địa chỉ nhận hàng</Label>
                  <span className="text-xs text-slate-400">Bắt buộc</span>
                </div>
                <Textarea
                  id="order-address"
                  rows={4}
                  value={form.shippingAddress}
                  onChange={(event) => handleFieldChange("shippingAddress", event.target.value)}
                  placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
                  aria-invalid={showInlineErrors && fieldErrors.shippingAddress}
                />
                {showInlineErrors && fieldErrors.shippingAddress ? (
                  <p className="text-sm text-rose-600">Vui lòng thêm địa chỉ nhận hàng trước khi tạo đơn.</p>
                ) : (
                  <p className="text-sm text-slate-500">Gợi ý: ghi đủ số nhà, phường/xã, quận/huyện và tỉnh/thành.</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="order-keywords">Keyword cho kit</Label>
                <Input
                  id="order-keywords"
                  value={form.keywords}
                  onChange={(event) => handleFieldChange("keywords", event.target.value)}
                  placeholder="focus, confidence, study"
                />
                <p className="text-sm text-slate-500">
                  {keywordList.length > 0
                    ? `${keywordList.length} keyword sẽ được lưu cùng đơn này.`
                    : "Bạn có thể nhập nhiều keyword, ngăn cách bằng dấu phẩy."}
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="order-note">Ghi chú thêm</Label>
                <Textarea
                  id="order-note"
                  rows={4}
                  value={form.note}
                  onChange={(event) => handleFieldChange("note", event.target.value)}
                  placeholder="Ví dụ: muốn kit thiên về học tập, tối giản, dễ mang theo..."
                />
                {prefillHint ? <p className="text-sm text-slate-500">{prefillHint}</p> : null}
              </div>
            </div>

            {showInlineErrors ? (
              <Alert className="border-rose-200 bg-rose-50/85 text-rose-700">
                <CircleAlert className="h-4 w-4" />
                <AlertTitle>Cần hoàn tất thông tin bắt buộc</AlertTitle>
                <AlertDescription className="text-rose-700/90">
                  Còn {missingRequiredCount} trường bắt buộc chưa điền. Hãy kiểm tra lại họ tên, email và địa chỉ nhận
                  hàng trước khi tạo đơn.
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Hoàn tất bước tạo đơn
                </p>
                <p className={`text-sm ${showInlineErrors ? "text-rose-600" : "text-slate-600"}`}>
                  {showInlineErrors
                    ? "Điền xong các trường bắt buộc để chuyển sang trang trạng thái đơn."
                    : "Đơn sẽ được lưu local và chuyển ngay sang Order Status sau khi tạo."}
                </p>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <Button className="w-full sm:w-auto" onClick={handleSubmit}>
                  <Package className="h-4 w-4" />
                  Tạo đơn kit
                </Button>
                <Button variant="outline" className="w-full sm:w-auto" onClick={() => navigate("/order-status")}>
                  <ClipboardList className="h-4 w-4" />
                  Xem trạng thái đơn gần nhất
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Phạm vi của bước này</CardTitle>
            <CardDescription>Giữ implementation an toàn và nhỏ, chỉ phục vụ local order flow hiện tại.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Lưu dữ liệu</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Đơn được lưu cục bộ bằng localStorage trong bước triển khai đầu tiên.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Chưa xử lý backend</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Chưa có thanh toán thật, fulfillment thật, đồng bộ nhiều thiết bị hoặc xử lý đơn ở phía admin.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Đi tiếp sau khi tạo</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Bạn có thể mở trang trạng thái đơn để xem timeline, chi tiết kit và chuyển trạng thái demo cục bộ.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
