import { toPng } from "html-to-image";

export interface ExportOptions {
  ratio: "wallpaper" | "desktop" | "square";
  pixelRatio?: number;
}

const RATIO_SIZES: Record<ExportOptions["ratio"], { width: number; height: number; label: string }> = {
  wallpaper: { width: 1080, height: 1920, label: "Wallpaper điện thoại (9:16)" },
  desktop: { width: 1920, height: 1080, label: "Wallpaper máy tính (16:9)" },
  square: { width: 1200, height: 1200, label: "Vuông (1:1) - chia sẻ mạng xã hội" },
};

export const EXPORT_RATIOS: ExportOptions["ratio"][] = ["wallpaper", "desktop", "square"];

export async function exportVisionBoardToPng(
  canvasElement: HTMLElement,
  options: ExportOptions,
): Promise<string> {
  const size = RATIO_SIZES[options.ratio];

  return toPng(canvasElement, {
    pixelRatio: options.pixelRatio ?? 2,
    canvasWidth: size.width,
    canvasHeight: size.height,
    backgroundColor: undefined,
    cacheBust: true,
    skipFonts: false,
    filter: (node) => {
      if (node instanceof HTMLElement && node.dataset.exportSkip === "true") return false;
      return true;
    },
  });
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function getRatioLabel(ratio: ExportOptions["ratio"]): string {
  return RATIO_SIZES[ratio].label;
}

export function getRatioSize(ratio: ExportOptions["ratio"]): { width: number; height: number } {
  const { width, height } = RATIO_SIZES[ratio];
  return { width, height };
}
