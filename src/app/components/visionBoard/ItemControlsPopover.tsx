import type { JSX } from "react";
import { Trash2, X } from "lucide-react";

import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { LIFE_AREAS, LIFE_AREA_LABELS } from "@/app/utils/storage-constants";
import type { VisionBoardItem } from "@/app/utils/storage-types";
import { IMAGE_FRAME_STYLES, QUOTE_FONT_STYLES, SIZE_PRESETS } from "@/app/utils/vision-board-config";

export interface ItemControlsPopoverProps {
  item: VisionBoardItem;
  onUpdate: (id: string, updates: Partial<VisionBoardItem>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  className?: string;
}

export function ItemControlsPopover(props: ItemControlsPopoverProps): JSX.Element {
  const { item, onUpdate, onDelete, onClose, className } = props;
  const currentSize = item.style?.sizePreset ?? "M";
  const currentFrame = item.style?.imageFrame ?? "shadow";
  const currentFont = item.style?.quoteFont ?? "default";

  const updateStyle = (patch: Partial<NonNullable<VisionBoardItem["style"]>>) => {
    onUpdate(item.id, {
      style: { ...item.style, ...patch },
      ...(patch.sizePreset ? { width: SIZE_PRESETS[patch.sizePreset].width } : {}),
    });
  };

  return (
    <Card className={`shadow-md ${className ?? ""}`}>
      <CardContent className="p-4 stack-tight">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-app-ink">Chỉnh phần tử</h4>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onClose} aria-label="Đóng">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div>
          <p className="text-xs font-semibold text-app-ink-muted">Kích thước</p>
          <div className="mt-1.5 grid grid-cols-4 gap-1">
            {(["S", "M", "L", "XL"] as const).map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => updateStyle({ sizePreset: size })}
                className={`rounded-md border px-2 py-1.5 text-xs font-medium transition ${
                  currentSize === size
                    ? "border-app-accent bg-app-accent-soft text-app-accent"
                    : "border-app-line bg-app-surface text-app-ink-soft hover:border-app-accent/50"
                }`}
              >
                {SIZE_PRESETS[size].label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-app-ink-muted">Life area</p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => onUpdate(item.id, { lifeAreaId: undefined })}
              className={`rounded-full border px-2.5 py-0.5 text-xs transition ${
                !item.lifeAreaId
                  ? "border-slate-400 bg-app-bg text-app-ink"
                  : "border-app-line bg-app-surface text-app-ink-muted"
              }`}
            >
              Không
            </button>
            {LIFE_AREAS.map((area) => (
              <button
                key={area.name}
                type="button"
                onClick={() => onUpdate(item.id, { lifeAreaId: area.name })}
                className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition ${
                  item.lifeAreaId === area.name
                    ? "border-app-accent bg-app-accent-soft text-app-accent"
                    : "border-app-line bg-app-surface text-app-ink-soft hover:border-app-accent/50"
                }`}
              >
                {LIFE_AREA_LABELS[area.name]}
              </button>
            ))}
          </div>
        </div>

        {item.type === "image" && (
          <div>
            <p className="text-xs font-semibold text-app-ink-muted">Khung ảnh</p>
            <div className="mt-1.5 grid grid-cols-4 gap-1">
              {IMAGE_FRAME_STYLES.map((frame) => (
                <button
                  key={frame.id}
                  type="button"
                  onClick={() => updateStyle({ imageFrame: frame.id })}
                  className={`rounded-md border px-2 py-1.5 text-xs font-medium transition ${
                    currentFrame === frame.id
                      ? "border-app-accent bg-app-accent-soft text-app-accent"
                      : "border-app-line bg-app-surface text-app-ink-soft"
                  }`}
                >
                  {frame.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {item.type === "quote" && (
          <div>
            <p className="text-xs font-semibold text-app-ink-muted">Kiểu chữ</p>
            <div className="mt-1.5 grid grid-cols-2 gap-1">
              {QUOTE_FONT_STYLES.map((font) => (
                <button
                  key={font.id}
                  type="button"
                  onClick={() => updateStyle({ quoteFont: font.id })}
                  className={`rounded-md border px-2 py-2 text-left transition ${
                    currentFont === font.id ? "border-app-accent bg-app-accent-soft" : "border-app-line bg-app-surface"
                  }`}
                >
                  <p
                    className={`text-sm ${font.className}`}
                    style={font.fontFamily ? { fontFamily: font.fontFamily } : undefined}
                  >
                    Aa
                  </p>
                  <p className="mt-0.5 text-xs text-app-ink-muted">{font.label}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        <Button
          variant="destructive"
          size="sm"
          className="mt-2 w-full"
          onClick={() => {
            onDelete(item.id);
            onClose();
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Xóa khỏi bảng
        </Button>
      </CardContent>
    </Card>
  );
}
