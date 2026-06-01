import { Download, Upload } from "lucide-react";
import type { ChangeEvent, RefObject } from "react";

import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";

interface DashboardDataBackupCardProps {
  importInputRef: RefObject<HTMLInputElement | null>;
  onExport: () => void;
  onImport: (event: ChangeEvent<HTMLInputElement>) => void;
  onOpenImportPicker: () => void;
}

export function DashboardDataBackupCard({
  importInputRef,
  onExport,
  onImport,
  onOpenImportPicker,
}: DashboardDataBackupCardProps) {
  return (
    <Card className="surface-flat rounded-xl shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Sao lưu dữ liệu</CardTitle>
        <CardDescription>
          Tiến trình lưu trên thiết bị này. Tải bản dự phòng để không mất tiến độ khi đổi thiết bị hoặc xóa dữ liệu.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <Button variant="outline" className="gap-2 rounded-[var(--r-control)]" onClick={onExport}>
          <Download className="h-4 w-4" />
          Tải bản dự phòng
        </Button>
        <Button variant="outline" className="gap-2 rounded-[var(--r-control)]" onClick={onOpenImportPicker}>
          <Upload className="h-4 w-4" />
          Nhập dữ liệu
        </Button>
        <input ref={importInputRef} type="file" accept=".json" className="hidden" onChange={onImport} />
      </CardContent>
    </Card>
  );
}
