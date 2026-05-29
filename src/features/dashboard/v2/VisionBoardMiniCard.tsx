import { ArrowRight, Images, Sparkles } from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import type { VisionBoard } from "@/app/utils/storage-types";

interface VisionBoardMiniCardProps {
  visionBoards: VisionBoard[];
}

export function VisionBoardMiniCard({ visionBoards }: VisionBoardMiniCardProps) {
  const navigate = useNavigate();
  const latestBoard = visionBoards[visionBoards.length - 1];

  if (!latestBoard) {
    return (
      <Card className="border border-app-line bg-app-surface overflow-hidden rounded-xl">
        <CardHeader className="p-5 pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-app-ink">
            <Images className="h-4.5 w-4.5 text-app-accent" />
            Bảng tầm nhìn
          </CardTitle>
          <CardDescription className="text-sm">
            Biến hình dung tương lai thành hiện thực.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-5 pb-5 pt-0 flex flex-col gap-4">
          <p className="text-sm text-app-ink-soft leading-relaxed">
            Bạn chưa tạo bảng tầm nhìn nào cho chu kỳ này. Lưu giữ mong ước tương lai bằng hình ảnh và châm ngôn chánh niệm.
          </p>
          <Button
            onClick={() => navigate("/vision-board")}
            className="w-full bg-app-accent text-white hover:bg-app-accent/90 text-sm font-medium py-2 rounded-lg flex items-center justify-center gap-1.5"
          >
            Tạo bảng đầu tiên
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Lấy tối đa 4 item (ảnh hoặc quote) để hiển thị grid preview
  const previewItems = latestBoard.items
    .filter((item) => item.type === "image" || item.type === "quote")
    .slice(0, 4);

  return (
    <Card className="border border-app-line bg-app-surface overflow-hidden rounded-xl">
      <CardHeader className="p-5 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-app-ink">
              <Images className="h-4.5 w-4.5 text-app-accent" />
              Bảng tầm nhìn
            </CardTitle>
            <CardDescription className="text-xs truncate mt-1 max-w-[180px]">
              {latestBoard.name} ({latestBoard.year})
            </CardDescription>
          </div>
          <span className="rounded-full border border-app-line bg-app-bg px-2.5 py-0.5 text-xs font-medium text-app-ink-muted shrink-0">
            {latestBoard.items.length} phần tử
          </span>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5 pt-0 flex flex-col gap-4">
        {previewItems.length === 0 ? (
          <div className="flex h-28 items-center justify-center rounded-lg border border-dashed border-app-line bg-app-bg/50">
            <Sparkles className="h-6 w-6 text-app-ink-muted/50" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 aspect-[4/3] w-full overflow-hidden rounded-lg bg-app-bg p-2 border border-app-line/40">
            {previewItems.map((item) => (
              <div
                key={item.id}
                className="relative overflow-hidden rounded-md bg-app-surface border border-white/60 shadow-sm flex items-center justify-center p-1"
              >
                {item.type === "image" ? (
                  <ImageWithFallback
                    src={item.content}
                    alt="Tầm nhìn"
                    className="h-full w-full object-cover rounded-[4px]"
                  />
                ) : (
                  <p className="text-[10px] italic leading-relaxed text-app-ink-soft text-center px-1 font-serif line-clamp-3 select-none">
                    "{item.content}"
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 text-sm py-2 rounded-lg border-app-line bg-app-surface text-app-ink hover:bg-app-bg"
            onClick={() => navigate("/vision-board-gallery")}
          >
            Thư viện
          </Button>
          <Button
            className="flex-1 bg-app-accent text-white hover:bg-app-accent/90 text-sm font-medium py-2 rounded-lg flex items-center justify-center gap-1"
            onClick={() => navigate(`/vision-board/${latestBoard.id}`)}
          >
            Mở bảng
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
