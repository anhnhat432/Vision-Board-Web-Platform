import { useCallback, useEffect, useMemo, useState, type JSX } from "react";
import {
  BookOpen,
  Briefcase,
  HeartPulse,
  Home,
  Sparkles,
  Sprout,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Textarea } from "@/app/components/ui/textarea";
import { LIFE_AREAS, LIFE_AREA_LABELS } from "@/app/utils/storage-constants";
import type { VisionBoardItem, VisionBoardThemeId } from "@/app/utils/storage-types";
import {
  CURATED_IMAGES_BY_LIFE_AREA,
  CURATED_QUOTES_BY_FEELING,
  SIZE_PRESETS,
  STORY_FEELING_OPTIONS,
  VISION_BOARD_THEMES,
} from "@/app/utils/vision-board-config";
import { cn } from "@/app/components/ui/utils";

export interface VisionBoardStorySeed {
  themeId: VisionBoardThemeId;
  items: VisionBoardItem[];
  storyAnswers: {
    feelings: string[];
    focusAreas: string[];
    coreQuote?: string;
  };
}

export interface VisionBoardStoryWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (seed: VisionBoardStorySeed) => void;
  availableGoals: Array<{ id: string; title: string; category: string }>;
  year: string;
}

type WizardStep = 1 | 2 | 3 | 4;

const LIFE_AREA_ICONS: Record<string, LucideIcon> = {
  Career: Briefcase,
  Finance: Wallet,
  Health: HeartPulse,
  Education: BookOpen,
  Relationships: Users,
  Family: Home,
  "Personal Growth": Sprout,
  Leisure: Sparkles,
};

function getLifeAreaLabel(name: string): string {
  return LIFE_AREA_LABELS[name] ?? name;
}

function getSafeSeed(value: string): string {
  return value.trim().replace(/\s+/g, "_");
}

export function VisionBoardStoryWizard({
  open,
  onOpenChange,
  onComplete,
  availableGoals,
  year,
}: VisionBoardStoryWizardProps): JSX.Element {
  const [step, setStep] = useState<WizardStep>(1);
  const [feelings, setFeelings] = useState<string[]>([]);
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [coreQuote, setCoreQuote] = useState("");
  const [selectedThemeId, setSelectedThemeId] = useState<VisionBoardThemeId>("aurora");

  const resetWizard = useCallback(() => {
    setStep(1);
    setFeelings([]);
    setFocusAreas([]);
    setCoreQuote("");
    setSelectedThemeId("aurora");
  }, []);

  useEffect(() => {
    if (!open) resetWizard();
  }, [open, resetWizard]);

  const suggestions = useMemo(() => {
    return CURATED_QUOTES_BY_FEELING.filter((group) => feelings.includes(group.feelingId))
      .flatMap((group) => group.quotes)
      .slice(0, 6);
  }, [feelings]);

  const toggleFeeling = (feelingId: string) => {
    setFeelings((current) => {
      if (current.includes(feelingId)) return current.filter((id) => id !== feelingId);
      if (current.length >= 3) return current;
      return [...current, feelingId];
    });
  };

  const toggleFocusArea = (areaName: string) => {
    setFocusAreas((current) => {
      if (current.includes(areaName)) return current.filter((name) => name !== areaName);
      if (current.length >= 3) return current;
      return [...current, areaName];
    });
  };

  const buildSeed = (): VisionBoardStorySeed => {
    const items: VisionBoardItem[] = [];
    const ts = Date.now();
    const theme = VISION_BOARD_THEMES.find((item) => item.id === selectedThemeId) ?? VISION_BOARD_THEMES[0];
    const goalsInFocus = focusAreas
      .flatMap((area) => availableGoals.filter((goal) => goal.category === area))
      .slice(0, 4);

    goalsInFocus.forEach((goal, index) => {
      items.push({
        id: `wiz_goal_${goal.id}_${ts}_${index}`,
        type: "goal_card",
        content: goal.id,
        x: 6 + (index % 2) * 48,
        y: 8 + Math.floor(index / 2) * 28,
        width: SIZE_PRESETS.M.width,
        height: 140,
        lifeAreaId: goal.category,
        style: { sizePreset: "M" },
      });
    });

    focusAreas.forEach((area, index) => {
      if (goalsInFocus.some((goal) => goal.category === area)) return;

      const curated = CURATED_IMAGES_BY_LIFE_AREA.find((image) => image.lifeAreaName === area);
      if (!curated) return;

      items.push({
        id: `wiz_img_${getSafeSeed(area)}_${ts}_${index}`,
        type: "image",
        content: curated.url,
        x: 50 + (index % 2) * 22,
        y: 45 + Math.floor(index / 2) * 22,
        width: SIZE_PRESETS.M.width,
        height: Math.round(SIZE_PRESETS.M.width * 0.75),
        lifeAreaId: area,
        style: { sizePreset: "M", imageFrame: "polaroid" },
      });
    });

    const trimmedCore = coreQuote.trim();
    const quotePool = CURATED_QUOTES_BY_FEELING.filter((group) => feelings.includes(group.feelingId)).flatMap(
      (group) => group.quotes,
    );
    const fallbackQuote = quotePool[Math.floor(Math.random() * quotePool.length)] ?? "";
    const finalQuote = trimmedCore || fallbackQuote;

    if (finalQuote) {
      items.push({
        id: `wiz_quote_${ts}`,
        type: "quote",
        content: finalQuote,
        x: 18,
        y: 38,
        width: SIZE_PRESETS.L.width,
        height: 140,
        style: { sizePreset: "L", quoteFont: theme.defaultQuoteFont },
      });
    }

    return {
      themeId: selectedThemeId,
      items,
      storyAnswers: {
        feelings: [...feelings],
        focusAreas: [...focusAreas],
        coreQuote: trimmedCore || undefined,
      },
    };
  };

  const completeWizard = () => {
    onComplete(buildSeed());
    onOpenChange(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) resetWizard();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader className="pr-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle>Tạo bảng theo câu chuyện của bạn</DialogTitle>
              <DialogDescription>Trả lời nhanh vài câu để có một bản nháp vision board có chủ đích.</DialogDescription>
            </div>
            <span className="rounded-full border border-app-line bg-app-bg px-3 py-1 text-sm font-semibold text-app-accent">
              {step}/4
            </span>
          </div>
        </DialogHeader>

        <div className="transition-opacity duration-200">
          {step === 1 && (
            <section className="space-y-5" aria-labelledby="vision-story-step-1">
              <div>
                <h2 id="vision-story-step-1" className="text-2xl font-bold tracking-tight text-slate-950">
                  Năm {year} bạn muốn cảm thấy như thế nào?
                </h2>
                <p className="mt-2 text-sm leading-6 text-app-ink-soft">
                  Chọn đúng 3 từ phản ánh năng lượng bạn muốn nuôi dưỡng.
                </p>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {STORY_FEELING_OPTIONS.map((feeling) => {
                  const active = feelings.includes(feeling.id);
                  const disabled = !active && feelings.length >= 3;
                  return (
                    <button
                      key={feeling.id}
                      type="button"
                      aria-pressed={active}
                      disabled={disabled}
                      onClick={() => toggleFeeling(feeling.id)}
                      className={cn(
                        "rounded-full border px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45",
                        active
                          ? "border-violet-300 bg-violet-100 text-app-accent"
                          : "border-app-line bg-app-surface text-slate-700 hover:border-app-accent/50 hover:bg-app-bg",
                      )}
                    >
                      {feeling.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-sm font-semibold text-app-ink-soft">Đã chọn {feelings.length}/3</p>
            </section>
          )}

          {step === 2 && (
            <section className="space-y-5" aria-labelledby="vision-story-step-2">
              <div>
                <h2 id="vision-story-step-2" className="text-2xl font-bold tracking-tight text-slate-950">
                  Vùng nào bạn muốn nâng cấp mạnh nhất?
                </h2>
                <p className="mt-2 text-sm leading-6 text-app-ink-soft">
                  Chọn 1 đến 3 vùng. Bảng sẽ tập trung vào chúng.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {LIFE_AREAS.map((area) => {
                  const Icon = LIFE_AREA_ICONS[area.name] ?? Sparkles;
                  const active = focusAreas.includes(area.name);
                  const disabled = !active && focusAreas.length >= 3;
                  const goalCount = availableGoals.filter((goal) => goal.category === area.name).length;
                  return (
                    <button
                      key={area.name}
                      type="button"
                      aria-pressed={active}
                      disabled={disabled}
                      onClick={() => toggleFocusArea(area.name)}
                      className={cn(
                        "min-h-32 rounded-[var(--r-card)] border bg-white p-4 text-left shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-45",
                        active
                          ? "border-app-accent bg-app-accent-soft ring-2 ring-app-accent/50"
                          : "border-slate-200 hover:border-app-accent/50 hover:bg-app-bg/60",
                      )}
                    >
                      <Icon className="h-5 w-5" style={{ color: area.color }} aria-hidden="true" />
                      <span className="mt-3 block font-semibold text-app-ink">{getLifeAreaLabel(area.name)}</span>
                      {goalCount > 0 && (
                        <span className="mt-2 block text-xs text-app-accent">🎯 {goalCount} mục tiêu sẽ được ghim</span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-sm font-semibold text-app-ink-soft">Đã chọn {focusAreas.length}/3 vùng</p>
            </section>
          )}

          {step === 3 && (
            <section className="space-y-5" aria-labelledby="vision-story-step-3">
              <div>
                <h2 id="vision-story-step-3" className="text-2xl font-bold tracking-tight text-slate-950">
                  Một câu nói nào đang trong đầu bạn?
                </h2>
                <p className="mt-2 text-sm leading-6 text-app-ink-soft">
                  Bỏ qua nếu bạn muốn dùng gợi ý của chúng tôi.
                </p>
              </div>
              <Textarea
                rows={2}
                value={coreQuote}
                onChange={(event) => setCoreQuote(event.target.value)}
                placeholder="Ví dụ: Tôi đang xây một cuộc sống mình thật sự muốn..."
                aria-label="Câu nói trọng tâm"
              />
              {suggestions.length > 0 && (
                <div className="grid gap-3 md:grid-cols-2">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setCoreQuote(suggestion)}
                      className="rounded-[var(--r-card)] border border-app-line bg-app-surface p-4 text-left text-sm leading-6 text-slate-700 shadow-sm transition-colors hover:border-app-accent/50 hover:bg-app-bg"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          {step === 4 && (
            <section className="space-y-5" aria-labelledby="vision-story-step-4">
              <div>
                <h2 id="vision-story-step-4" className="text-2xl font-bold tracking-tight text-slate-950">
                  Chọn không gian cho bảng
                </h2>
                <p className="mt-2 text-sm leading-6 text-app-ink-soft">
                  Bạn có thể đổi theme bất cứ lúc nào sau khi tạo bảng.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
                {VISION_BOARD_THEMES.map((theme) => {
                  const active = selectedThemeId === theme.id;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSelectedThemeId(theme.id)}
                      className={cn(
                        "rounded-[var(--r-card)] border border-app-line bg-app-surface p-3 text-left shadow-sm transition-all hover:border-violet-200",
                        active && "ring-2 ring-app-accent ring-offset-2",
                      )}
                    >
                      <span
                        className="block h-20 rounded-[var(--r-tile)]"
                        style={{ background: theme.preview.gradient }}
                        aria-hidden="true"
                      />
                      <span className="mt-3 block font-semibold text-app-ink">{theme.label}</span>
                      <span className="mt-1 block text-sm leading-5 text-app-ink-muted">{theme.description}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        <DialogFooter>
          {step > 1 && (
            <Button type="button" variant="outline" onClick={() => setStep((current) => (current - 1) as WizardStep)}>
              Quay lại
            </Button>
          )}
          {step < 4 ? (
            <Button
              type="button"
              onClick={() => setStep((current) => (current + 1) as WizardStep)}
              disabled={(step === 1 && feelings.length !== 3) || (step === 2 && focusAreas.length < 1)}
            >
              Tiếp tục
            </Button>
          ) : (
            <Button type="button" onClick={completeWizard}>
              Tạo bảng
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
