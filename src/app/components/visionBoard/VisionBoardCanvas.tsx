import { Trash2 } from "lucide-react";
import type React from "react";
import { type JSX, useRef, useState } from "react";

import { Button } from "@/app/components/ui/button";
import { ParallaxCard } from "@/app/components/ui/parallax-card";
import { LIFE_AREA_LABELS, LIFE_AREAS } from "@/app/utils/storage-constants";
import type { VisionBoardItem, VisionBoardThemeId } from "@/app/utils/storage-types";
import { VISION_BOARD_THEMES } from "@/app/utils/vision-board-config";
import { VisionBoardItemRenderer } from "./VisionBoardItemRenderer";

export interface VisionBoardCanvasProps {
  items: VisionBoardItem[];
  themeId?: VisionBoardThemeId;
  showZones: boolean;
  focusAreaIds?: string[];
  goalsById: Record<string, { title: string; category: string; deadline: string; progress: number }>;
  onItemPositionChange: (id: string, x: number, y: number) => void;
  onItemDelete: (id: string) => void;
  onItemSelect?: (id: string | null) => void;
  selectedItemId?: string | null;
  exportRef?: React.Ref<HTMLDivElement>;
  className?: string;
  emptyStateSlot?: React.ReactNode;
}

interface DragState {
  offsetX: number;
  offsetY: number;
  pointerId: number;
}

export function VisionBoardCanvas({
  items,
  themeId = "aurora",
  showZones,
  focusAreaIds,
  goalsById,
  onItemPositionChange,
  onItemDelete,
  onItemSelect,
  selectedItemId,
  exportRef,
  className,
  emptyStateSlot,
}: VisionBoardCanvasProps): JSX.Element {
  const theme = VISION_BOARD_THEMES.find((item) => item.id === themeId) ?? VISION_BOARD_THEMES[0];
  const zoneAreas = focusAreaIds?.length ? LIFE_AREAS.filter((area) => focusAreaIds.includes(area.name)) : LIFE_AREAS;
  const cols = zoneAreas.length <= 4 ? 2 : 4;
  const rows = Math.ceil(zoneAreas.length / cols);

  return (
    <div
      ref={exportRef}
      className={`relative h-[450px] min-w-0 overflow-hidden sm:h-[580px] lg:h-[620px] xl:h-[600px] ${className ?? ""}`}
      style={{ background: theme.canvasBackground }}
      data-theme-id={theme.id}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage: `linear-gradient(${theme.gridColor} 1px, transparent 1px), linear-gradient(90deg, ${theme.gridColor} 1px, transparent 1px)`,
          backgroundSize: "36px 36px",
        }}
      />

      {showZones &&
        zoneAreas.map((area, index) => {
          const col = index % cols;
          const row = Math.floor(index / cols);
          const width = 100 / cols;
          const height = 100 / rows;

          return (
            <div
              key={area.name}
              className="pointer-events-none absolute border border-dashed"
              style={{
                left: `${col * width}%`,
                top: `${row * height}%`,
                width: `${width}%`,
                height: `${height}%`,
                backgroundColor: `${area.color}10`,
                borderColor: `${area.color}55`,
              }}
            >
              <span
                className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wider"
                style={{ backgroundColor: `${area.color}26`, color: area.color }}
              >
                {LIFE_AREA_LABELS[area.name] ?? area.name}
              </span>
            </div>
          );
        })}

      <button
        type="button"
        className="absolute inset-0 h-full w-full cursor-default border-0 bg-transparent p-0"
        onClick={() => onItemSelect?.(null)}
        aria-label="Bỏ chọn phần tử"
        tabIndex={selectedItemId ? 0 : -1}
        data-export-skip="true"
      />

      {items.length === 0 && emptyStateSlot}
      {items.map((item) => (
        <DraggableItem
          key={item.id}
          item={item}
          goalsById={goalsById}
          isSelected={selectedItemId === item.id}
          onUpdate={onItemPositionChange}
          onDelete={onItemDelete}
          onSelect={onItemSelect}
        />
      ))}
    </div>
  );
}

interface DraggableItemProps {
  item: VisionBoardItem;
  goalsById: VisionBoardCanvasProps["goalsById"];
  isSelected: boolean;
  onUpdate: (id: string, x: number, y: number) => void;
  onDelete: (id: string) => void;
  onSelect?: (id: string | null) => void;
}

function DraggableItem({ item, goalsById, isSelected, onUpdate, onDelete, onSelect }: DraggableItemProps): JSX.Element {
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef<DragState | null>(null);

  const updatePosition = (clientX: number, clientY: number, container: HTMLElement) => {
    const dragState = dragStateRef.current;
    if (!dragState) return;

    const rect = container.getBoundingClientRect();
    const x = ((clientX - rect.left - dragState.offsetX) / rect.width) * 100;
    const y = ((clientY - rect.top - dragState.offsetY) / rect.height) * 100;

    onUpdate(item.id, Math.max(0, Math.min(95, x)), Math.max(0, Math.min(95, y)));
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    if ((event.target as HTMLElement).closest("button")) return;

    const container = event.currentTarget.parentElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const offsetX = event.clientX - rect.left - (rect.width * item.x) / 100;
    const offsetY = event.clientY - rect.top - (rect.height * item.y) / 100;

    dragStateRef.current = {
      offsetX,
      offsetY,
      pointerId: event.pointerId,
    };

    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    onSelect?.(item.id);
    updatePosition(event.clientX, event.clientY, container);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current || dragStateRef.current.pointerId !== event.pointerId) return;

    const container = event.currentTarget.parentElement;
    if (!container) return;

    updatePosition(event.clientX, event.clientY, container);
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current || dragStateRef.current.pointerId !== event.pointerId) return;

    dragStateRef.current = null;
    setIsDragging(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      className={`absolute cursor-move touch-none select-none transition-transform duration-300 hover:scale-[1.015] ${
        isSelected ? "rounded-xl ring-2 ring-app-accent ring-offset-2" : ""
      }`}
      style={{
        left: `${item.x}%`,
        top: `${item.y}%`,
        width: `${item.width}px`,
        opacity: isDragging ? 0.56 : 1,
      }}
    >
      <div className="group relative">
        <ParallaxCard maxTilt={5}>
          <VisionBoardItemRenderer item={item} goalsById={goalsById} />
        </ParallaxCard>
        <Button
          size="icon"
          variant="destructive"
          className="absolute -right-2 -top-2 h-8 w-8 rounded-full opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
          onClick={() => onDelete(item.id)}
          aria-label="Xóa phần tử"
          data-export-skip="true"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
