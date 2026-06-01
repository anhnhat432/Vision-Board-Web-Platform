import {
  Heart,
  Image as ImageIcon,
  MessageSquareQuote,
  Moon,
  Sparkles,
  Star,
  Sun,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import type { JSX } from "react";

import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { LIFE_AREA_LABELS } from "@/app/utils/storage-constants";
import type { VisionBoardItem } from "@/app/utils/storage-types";
import { IMAGE_FRAME_STYLES, QUOTE_FONT_STYLES, SIZE_PRESETS } from "@/app/utils/vision-board-config";
import { GoalCardChip } from "./GoalCardChip";

const ICON_COMPONENTS = { Star, Heart, Target, Trophy, Zap, Sun, Moon, Sparkles };
type IconName = keyof typeof ICON_COMPONENTS;

export interface VisionBoardItemRendererProps {
  item: VisionBoardItem;
  goalsById: Record<string, { title: string; category: string; deadline: string; progress: number }>;
}

export function VisionBoardItemRenderer({ item, goalsById }: VisionBoardItemRendererProps): JSX.Element {
  const width = item.style?.sizePreset ? SIZE_PRESETS[item.style.sizePreset].width : item.width;

  if (item.type === "image") {
    const frameId = item.style?.imageFrame ?? "shadow";
    const frame = IMAGE_FRAME_STYLES.find((itemFrame) => itemFrame.id === frameId) ?? IMAGE_FRAME_STYLES[0];
    const areaLabel = item.lifeAreaId ? (LIFE_AREA_LABELS[item.lifeAreaId] ?? item.lifeAreaId) : null;

    return (
      <div
        className={`${frame.wrapperClassName} vision-frame-${frame.id}`}
        data-frame-id={frame.id}
        style={{ width: `${width}px`, position: "relative" }}
      >
        {frame.decorationsLayout === "washi" && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-2 left-4 h-5 w-16 -rotate-6 rounded-sm bg-app-warm opacity-80"
          />
        )}
        {!item.content && <ImageIcon className="mx-auto h-10 w-10 text-app-ink-muted" aria-hidden="true" />}
        <ImageWithFallback
          src={item.content}
          alt="Phần tử vision board"
          className={frame.imageClassName}
          style={{ width: "100%" }}
        />
        {frame.decorationsLayout === "polaroid" && (
          <div className="mt-2 px-1 pb-1 text-center text-xs uppercase tracking-widest text-app-ink-soft">
            {areaLabel ?? "Tầm nhìn"}
          </div>
        )}
      </div>
    );
  }

  if (item.type === "quote") {
    const fontId = item.style?.quoteFont ?? "default";
    const font = QUOTE_FONT_STYLES.find((itemFont) => itemFont.id === fontId) ?? QUOTE_FONT_STYLES[0];

    return (
      <div
        className="rounded-2xl border border-app-line bg-app-surface p-5 shadow-[var(--shadow-3)]"
        style={{ width: `${width}px` }}
      >
        <div className="flex items-center gap-2 text-app-accent">
          <MessageSquareQuote className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-[0.18em]">Câu nói</span>
        </div>
        <p
          className={`mt-3 leading-relaxed ${font.className}`}
          style={font.fontFamily ? { fontFamily: font.fontFamily } : undefined}
        >
          {item.content}
        </p>
      </div>
    );
  }

  if (item.type === "icon") {
    const Icon = ICON_COMPONENTS[item.content as IconName] ?? Sparkles;
    const size = item.style?.sizePreset ? { S: 80, M: 96, L: 128, XL: 160 }[item.style.sizePreset] : 96;

    return (
      <div
        className="flex items-center justify-center rounded-2xl bg-app-accent text-white shadow-[var(--shadow-3)]"
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        <Icon className="h-10 w-10" style={{ width: size * 0.4, height: size * 0.4 }} />
      </div>
    );
  }

  if (item.type === "goal_card") {
    const goal = goalsById[item.content];
    return <GoalCardChip goal={goal} lifeAreaId={item.lifeAreaId} width={width} />;
  }

  return <span aria-hidden="true" />;
}
