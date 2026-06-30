import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { EXPORT_RATIOS, type ExportOptions, getRatioLabel } from "@/app/utils/vision-board-export";
import { useState, type JSX } from "react";

function getExportRatioDescription(ratio: ExportOptions["ratio"]): string {
  if (ratio === "wallpaper") return "Để làm hình nền điện thoại - gợi nhắc mỗi lần mở máy.";
  if (ratio === "desktop") return "Để làm hình nền máy tính.";
  return "Để chia sẻ lên Instagram, Facebook.";
}

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (ratio: ExportOptions["ratio"]) => Promise<void>;
}

export function ExportDialog({ open, onOpenChange, onExport }: ExportDialogProps): JSX.Element {
  const [selectedRatio, setSelectedRatio] = useState<ExportOptions["ratio"]>("wallpaper");
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport(selectedRatio);
      onOpenChange(false);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tải bảng về máy</DialogTitle>
          <DialogDescription>
            Chọn tỉ lệ phù hợp với mục đích sử dụng. Bảng sẽ được render thành ảnh PNG chất lượng cao.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          {EXPORT_RATIOS.map((ratio) => (
            <button
              key={ratio}
              type="button"
              onClick={() => setSelectedRatio(ratio)}
              className={`w-full rounded-card border p-3 text-left transition ${
                selectedRatio === ratio
                  ? "border-app-accent bg-app-accent-soft"
                  : "border-app-line bg-app-surface hover:border-app-accent/50"
              }`}
            >
              <p className="text-sm font-semibold text-app-ink">{getRatioLabel(ratio)}</p>
              <p className="text-xs text-app-ink-soft">{getExportRatioDescription(ratio)}</p>
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            Hủy
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? "Đang xuất..." : "Tải về"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
