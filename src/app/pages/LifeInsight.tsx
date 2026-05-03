import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { ArrowRight, Check, Compass, Sparkles, Target, TrendingDown, TrendingUp } from "lucide-react";

import { CoreFlowGateState } from "../components/CoreFlowGateState";
import { CoreFlowProgress } from "../components/CoreFlowProgress";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { SimpleRadarChart } from "../components/SimpleRadarChart";
import { useSyncedUserData } from "../hooks/useSyncedUserData";
import { trackAnalyticsEvent } from "../utils/analytics";
import { hasRealLifeBalance } from "../utils/core-flow-guard";
import { APP_STORAGE_KEYS, clearGoalPlanningDrafts, getLifeAreaLabel } from "../utils/storage";
import {
  clearUserIntent,
  getUserIntentId,
  getUserIntentOptions,
  setUserIntent,
  type UserIntentId,
} from "../utils/user-intent";

export function LifeInsight() {
  const navigate = useNavigate();
  const { userData } = useSyncedUserData();
  const lifeAreas = userData?.currentWheelOfLife ?? [];
  const hasLifeBalance = hasRealLifeBalance(userData);
  const [selectedAreaName, setSelectedAreaName] = useState<string | null>(null);
  const [selectedIntent, setSelectedIntent] = useState<UserIntentId | null>(null);

  useEffect(() => {
    setSelectedIntent(getUserIntentId());
  }, []);

  const handleIntentSelect = (intent: UserIntentId) => {
    setSelectedIntent(intent);
    setUserIntent(intent);
    trackAnalyticsEvent("user_intent_selected", {
      source: "life_balance",
      intent_id: intent,
    });
  };

  const handleIntentClear = () => {
    setSelectedIntent(null);
    clearUserIntent();
    trackAnalyticsEvent("user_intent_cleared", { source: "life_balance" });
  };

  const intentOptions = getUserIntentOptions();

  const lowestArea = useMemo(() => {
    if (lifeAreas.length === 0) return null;
    return [...lifeAreas].sort((a, b) => a.score - b.score)[0];
  }, [lifeAreas]);

  const strongestArea = useMemo(() => {
    if (lifeAreas.length === 0) return null;
    return [...lifeAreas].sort((a, b) => b.score - a.score)[0];
  }, [lifeAreas]);

  const averageScore = useMemo(() => {
    if (lifeAreas.length === 0) return 0;
    return lifeAreas.reduce((sum, area) => sum + area.score, 0) / lifeAreas.length;
  }, [lifeAreas]);

  const focusArea = useMemo(() => {
    if (!lowestArea) return null;
    if (!selectedAreaName) return lowestArea;
    return lifeAreas.find((a) => a.name === selectedAreaName) ?? lowestArea;
  }, [lowestArea, selectedAreaName, lifeAreas]);

  const radarData = useMemo(
    () =>
      lifeAreas.map((area) => ({
        subject: getLifeAreaLabel(area.name),
        value: area.score,
        fullMark: 10,
      })),
    [lifeAreas],
  );

  if (!userData) {
    return (
      <CoreFlowGateState
        currentStepId="life_insight"
        eyebrow="Life Insight"
        title="Đang tải dữ liệu insight"
        description="Mình đang đọc dữ liệu bánh xe cuộc sống để gợi ý lĩnh vực bạn nên ưu tiên tiếp theo."
        loading
      />
    );
  }

  if (!hasLifeBalance || !lowestArea || !strongestArea || !focusArea) {
    return (
      <CoreFlowGateState
        currentStepId="life_balance"
        eyebrow="Life Insight"
        title="Chưa có dữ liệu cân bằng cuộc sống"
        description="Trước khi tạo SMART Goal, bạn cần hoàn thành Life Balance để hệ thống biết nên ưu tiên khu vực nào."
        actionLabel="Đi tới Onboarding"
        onAction={() => navigate("/onboarding")}
        secondaryActionLabel="Mở Life Balance"
        onSecondaryAction={() => navigate("/life-balance")}
      />
    );
  }

  const handleStartGoalSetup = () => {
    clearGoalPlanningDrafts();
    localStorage.setItem(APP_STORAGE_KEYS.selectedFocusArea, focusArea.name);
    navigate("/smart-goal-setup");
  };

  const isCustomSelection = selectedAreaName !== null && selectedAreaName !== lowestArea.name;
  const focusAreaLabel = getLifeAreaLabel(focusArea.name);
  const lowestAreaLabel = getLifeAreaLabel(lowestArea.name);
  const strongestAreaLabel = getLifeAreaLabel(strongestArea.name);
  const scoreGapFromAverage = Math.max(0, averageScore - focusArea.score);

  return (
    <div className="app-shell min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mx-auto w-full max-w-6xl space-y-6"
      >
        <CoreFlowProgress currentStepId="life_insight" />

        <Card className="hero-surface overflow-hidden border-0 text-white">
          <CardContent className="relative p-5 sm:p-6 lg:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),_transparent_24%),radial-gradient(circle_at_bottom_left,_rgba(255,255,255,0.1),_transparent_24%)] opacity-90" />

            <div className="relative max-w-4xl">
              <div className="space-y-5 sm:space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-4 py-1.5 text-sm text-white/82">
                  <Compass className="h-4 w-4" />
                  Life Insight
                </div>

                <div className="space-y-4">
                  <h1 className="max-w-3xl text-3xl font-bold tracking-normal sm:text-4xl lg:text-5xl">
                    Bạn đã có một tín hiệu rất rõ về nơi mình nên ưu tiên tiếp theo.
                  </h1>
                  <p className="max-w-2xl text-base leading-8 text-white/82 lg:text-lg">
                    Hệ thống gợi ý lĩnh vực có điểm thấp nhất. Bạn cũng có thể chọn lại bên dưới nếu muốn tập trung vào
                    một khu vực khác phù hợp hơn với lúc này.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Badge variant="outline" className="rounded-full border-white/18 bg-white/12 px-4 py-2 text-white">
                    <Target className="mr-1 h-3.5 w-3.5" />
                    Ưu tiên: {getLifeAreaLabel(focusArea.name)}
                  </Badge>
                  <Badge variant="outline" className="rounded-full border-white/18 bg-white/12 px-4 py-2 text-white">
                    <TrendingUp className="mr-1 h-3.5 w-3.5" />
                    Điểm trung bình: {averageScore.toFixed(1)}/10
                  </Badge>
                  {isCustomSelection && (
                    <Badge
                      variant="outline"
                      className="rounded-full border-amber-300/50 bg-amber-400/20 px-4 py-2 text-white"
                    >
                      Bạn đã chọn thủ công
                    </Badge>
                  )}
                </div>

                <div
                  data-testid="life-insight-recommendation-card"
                  className="grid gap-3 rounded-[24px] border border-white/14 bg-white/12 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] sm:grid-cols-[minmax(0,1.35fr)_minmax(220px,0.65fr)]"
                >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/58">
                      Vì sao chọn trọng tâm này?
                    </p>
                    <h2 className="mt-2 text-xl font-bold text-white">
                      {isCustomSelection
                        ? `Bạn đang chọn ${focusAreaLabel} thay cho gợi ý ${lowestAreaLabel}.`
                        : `${focusAreaLabel} là điểm thấp nhất trong bánh xe hiện tại.`}
                    </h2>
                    <p className="mt-2 text-sm leading-7 text-white/74">
                      Dùng một lĩnh vực đủ cụ thể giúp bước SMART Goal không bị rộng. Sau khi chọn xong, phần tiếp theo
                      sẽ ép trọng tâm này thành mục tiêu đo được và có thời hạn.
                    </p>
                  </div>

                  <div className="grid gap-2 text-sm">
                    <div className="rounded-[18px] border border-white/10 bg-black/12 px-4 py-3">
                      <p className="text-white/56">Điểm hiện tại</p>
                      <p className="mt-1 text-lg font-bold text-white">{focusArea.score}/10</p>
                    </div>
                    <div className="rounded-[18px] border border-white/10 bg-black/12 px-4 py-3">
                      <p className="text-white/56">Lệch so với trung bình</p>
                      <p className="mt-1 text-lg font-bold text-white">
                        {scoreGapFromAverage > 0 ? `-${scoreGapFromAverage.toFixed(1)}` : "0.0"}
                      </p>
                    </div>
                    <div className="rounded-[18px] border border-white/10 bg-black/12 px-4 py-3">
                      <p className="text-white/56">Lực đỡ hiện có</p>
                      <p className="mt-1 font-semibold text-white">{strongestAreaLabel}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    data-testid="life-insight-primary-cta"
                    variant="outline"
                    className="hero-cta w-full justify-center border-white/18 bg-white text-slate-900 hover:bg-white/92 sm:w-auto"
                    onClick={handleStartGoalSetup}
                  >
                    Tạo mục tiêu với {getLifeAreaLabel(focusArea.name)}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="border-white/18 bg-white/12 text-white hover:bg-white/18 hover:text-white"
                    onClick={() => navigate("/")}
                  >
                    Về bảng điều khiển
                  </Button>
                </div>
              </div>

              <div className="hidden rounded-[32px] border border-white/14 bg-white/12 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/60">Snapshot hiện tại</p>

                <div className="mt-6 space-y-4">
                  <div className="rounded-[24px] border border-white/10 bg-black/12 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-white/55">Đang tập trung vào</p>
                    <p className="mt-2 text-2xl font-bold text-white">{getLifeAreaLabel(focusArea.name)}</p>
                    <p className="mt-1 text-sm text-white/68">{focusArea.score}/10</p>
                  </div>
                  <div className="rounded-[24px] border border-white/10 bg-black/12 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-white/55">Điểm mạnh hiện tại</p>
                    <p className="mt-2 text-2xl font-bold text-white">{getLifeAreaLabel(strongestArea.name)}</p>
                    <p className="mt-1 text-sm text-white/68">{strongestArea.score}/10</p>
                  </div>
                  <div className="rounded-[24px] border border-white/10 bg-black/12 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-white/55">Thông điệp</p>
                    <p className="mt-2 text-sm leading-7 text-white/74">
                      Đừng cố sửa mọi thứ cùng lúc. Chỉ cần chọn một điểm yếu nhất, rồi biến nó thành một hướng đi đủ rõ
                      để hành động.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mx-auto max-w-5xl space-y-5">
          <details className="rounded-[28px] border border-white/70 bg-white/82 p-5 shadow-[0_20px_50px_-38px_rgba(15,23,42,0.2)] lg:p-6">
            <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900">
              Đổi lĩnh vực trọng tâm
            </summary>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Hệ thống gợi ý <strong>{getLifeAreaLabel(lowestArea.name)}</strong> vì đây là điểm thấp nhất. Nếu lúc này
              bạn muốn ưu tiên khu vực khác, chọn lại bên dưới.
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {lifeAreas.map((area) => {
                const isSelected = focusArea.name === area.name;
                const isRecommended = area.name === lowestArea.name;
                return (
                  <button
                    key={area.name}
                    type="button"
                    onClick={() => setSelectedAreaName(area.name === lowestArea.name ? null : area.name)}
                    className={`relative rounded-[18px] border p-4 text-left transition-all hover:-translate-y-0.5 ${
                      isSelected
                        ? "border-violet-300 bg-violet-50 shadow-[0_8px_24px_-12px_rgba(109,40,217,0.35)]"
                        : "border-white/70 bg-white/72 hover:border-white hover:bg-white"
                    }`}
                  >
                    {isRecommended && (
                      <span className="absolute -top-2 left-3 rounded-full bg-violet-600 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-white">
                        Gợi ý
                      </span>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: area.color }} />
                      {isSelected && <Check className="h-4 w-4 text-violet-600" />}
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-900">{getLifeAreaLabel(area.name)}</p>
                    <p className="mt-1 text-xs font-medium" style={{ color: area.color }}>
                      {area.score}/10
                    </p>
                  </button>
                );
              })}
            </div>
          </details>

          <details
            data-testid="life-insight-intent-picker"
            className="rounded-[28px] border border-white/70 bg-white/82 p-5 shadow-[0_20px_50px_-38px_rgba(15,23,42,0.2)] lg:p-6"
            open={selectedIntent !== null}
          >
            <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900">
              Bạn đang muốn làm điều gì trong 12 tuần tới?
            </summary>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Chọn một mô tả gần nhất để app gợi ý cho sát hơn. Không bắt buộc — bạn có thể bỏ qua, thay đổi hoặc xoá
              bất cứ lúc nào.
            </p>
            <div
              role="radiogroup"
              aria-label="Chọn điều bạn muốn làm trong 12 tuần tới"
              className="mt-5 grid gap-2 sm:grid-cols-2"
            >
              {intentOptions.map((option) => {
                const isSelected = selectedIntent === option.id;
                return (
                  <label
                    key={option.id}
                    data-intent-id={option.id}
                    className={`cursor-pointer rounded-[18px] border p-4 text-left transition-all hover:-translate-y-0.5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-violet-300 ${
                      isSelected
                        ? "border-violet-300 bg-violet-50 shadow-[0_8px_24px_-12px_rgba(109,40,217,0.35)]"
                        : "border-white/70 bg-white/72 hover:border-white hover:bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="life-insight-intent"
                      value={option.id}
                      checked={isSelected}
                      onChange={() => handleIntentSelect(option.id)}
                      className="sr-only"
                    />
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">{option.label}</p>
                      {isSelected && <Check className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" aria-hidden="true" />}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{option.description}</p>
                  </label>
                );
              })}
            </div>
            {selectedIntent !== null && (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <p className="text-xs text-slate-500">
                  Lựa chọn này được lưu trên trình duyệt này để gợi ý bước SMART và kế hoạch 12 tuần.
                </p>
                <button
                  type="button"
                  onClick={handleIntentClear}
                  className="text-xs font-semibold text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline"
                >
                  Bỏ chọn
                </button>
              </div>
            )}
          </details>

          <details className="rounded-[28px] border border-white/70 bg-white/82 p-5 shadow-[0_20px_50px_-38px_rgba(15,23,42,0.2)] lg:p-6">
            <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900">
              Xem bức tranh tổng thể
            </summary>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Biểu đồ này cho thấy toàn bộ bánh xe cuộc sống hiện tại để bạn không nhìn một chiều.
            </p>
            <SimpleRadarChart className="mx-auto mt-5 max-w-[460px]" data={radarData} height={320} fillOpacity={0.2} />

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div
                className="rounded-[20px] border p-4"
                style={{
                  borderColor: `${lowestArea.color}33`,
                  background: `${lowestArea.color}12`,
                }}
              >
                <div className="flex items-center gap-2" style={{ color: lowestArea.color }}>
                  <TrendingDown className="h-4 w-4" />
                  <p className="text-xs font-semibold uppercase tracking-[0.16em]">Nút thắt hiện tại</p>
                </div>
                <p className="mt-3 text-lg font-semibold text-slate-900">{getLifeAreaLabel(lowestArea.name)}</p>
                <p className="mt-1 text-sm text-slate-600">Đây là khu vực nên trở thành trọng tâm tiếp theo.</p>
              </div>

              <div
                className="rounded-[20px] border p-4"
                style={{
                  borderColor: `${strongestArea.color}33`,
                  background: `${strongestArea.color}12`,
                }}
              >
                <div className="flex items-center gap-2" style={{ color: strongestArea.color }}>
                  <Sparkles className="h-4 w-4" />
                  <p className="text-xs font-semibold uppercase tracking-[0.16em]">Lực đỡ hiện có</p>
                </div>
                <p className="mt-3 text-lg font-semibold text-slate-900">{getLifeAreaLabel(strongestArea.name)}</p>
                <p className="mt-1 text-sm text-slate-600">
                  Tận dụng điểm mạnh này để kéo khu vực đang yếu lên cùng.
                </p>
              </div>
            </div>
          </details>

          <Card>
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between lg:p-6">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Trọng tâm hiện tại
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {getLifeAreaLabel(focusArea.name)} ({focusArea.score}/10)
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Tiếp theo là biến trọng tâm này thành một mục tiêu SMART đủ rõ để hành động.
                </p>
              </div>
              <Button className="w-full sm:w-auto" onClick={handleStartGoalSetup}>
                Tạo mục tiêu với {getLifeAreaLabel(focusArea.name)}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
}
