import { Wand2 } from "lucide-react";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { VISION_BOARD_TEMPLATES, type VisionBoardTemplate } from "@/app/utils/vision-board-templates";
import { VISION_BOARD_THEMES } from "@/app/utils/vision-board-config";
import type { JSX } from "react";

interface InitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (template: VisionBoardTemplate) => void;
  onStoryMode: () => void;
  onBlank: () => void;
}

export function InitDialog({
  open,
  onOpenChange,
  onSelectTemplate,
  onStoryMode,
  onBlank,
}: InitDialogProps): JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-app-ink">Khởi tạo Vision Board của bạn</DialogTitle>
          <DialogDescription className="text-app-ink-soft">
            Chọn một cách bắt đầu phù hợp để truyền cảm hứng và hình ảnh hóa mục tiêu của bạn.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4 md:grid-cols-2">
          {/* Cột trái: Chọn Template mẫu */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-app-ink-muted">
              1. Dùng Template theo chủ đề
            </h3>
            <p className="text-xs text-app-ink-soft">
              Nạp sẵn bố cục ảnh mẫu, câu nói truyền cảm hứng và biểu tượng phù hợp với chủ đề lựa chọn.
            </p>
            <div className="grid gap-2.5">
              {VISION_BOARD_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => onSelectTemplate(tmpl)}
                  className="w-full text-left rounded-card border border-app-line bg-app-surface p-3 transition hover:border-app-accent hover:bg-app-accent-soft group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-app-ink group-hover:text-app-accent">{tmpl.name}</span>
                    <span
                      className="h-3.5 w-3.5 rounded-full border border-white"
                      style={{
                        background: VISION_BOARD_THEMES.find((t) => t.id === tmpl.themeId)?.preview.gradient,
                      }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-app-ink-muted leading-relaxed">{tmpl.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Cột phải: Các cách khởi tạo khác */}
          <div className="space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-app-ink-muted">
                2. Chế độ kể chuyện (Story Mode)
              </h3>
              <div className="rounded-card border border-app-line bg-app-surface p-4 flex flex-col gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-app-accent-soft text-app-accent">
                  <Wand2 className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-app-ink">Tự động sinh bảng</h4>
                  <p className="mt-1 text-xs text-app-ink-muted leading-relaxed">
                    Trả lời 4 câu hỏi cực nhanh về cảm xúc và lĩnh vực tập trung để hệ thống tự động thiết kế bảng
                    riêng cho bạn.
                  </p>
                </div>
                <Button type="button" onClick={onStoryMode} className="w-full mt-1.5">
                  Bắt đầu Story Mode
                </Button>
              </div>
            </div>

            <div className="pt-4 border-t border-app-line space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-app-ink-muted">
                3. Bắt đầu từ trang trắng
              </h3>
              <p className="text-xs text-app-ink-soft">
                Nếu bạn đã có sẵn ý tưởng, hãy bắt đầu thiết kế thủ công từ đầu.
              </p>
              <Button type="button" variant="outline" onClick={onBlank} className="w-full">
                Tạo bảng trống
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
