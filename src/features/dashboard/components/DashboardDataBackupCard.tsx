import type { ChangeEvent, RefObject } from "react";
import { Download, Upload } from "lucide-react";

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
    <Card className="glass-surface-sm mt-8 rounded-[28px] border shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Sao lưu dữ liệu</CardTitle>
        <CardDescription>Dữ liệu lưu trên trình duyệt này. Xuất bản sao lưu để không mất tiến độ khi đổi thiết bị hoặc xóa dữ liệu trình duyệt.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <Button variant="outline" className="gap-2 rounded-full" onClick={onExport}>
          <Download className="h-4 w-4" />
          Xuất bản sao lưu
        </Button>
        <Button variant="outline" className="gap-2 rounded-full" onClick={onOpenImportPicker}>
          <Upload className="h-4 w-4" />
          Nhập dữ liệu
        </Button>
        <input ref={importInputRef} type="file" accept=".json" className="hidden" onChange={onImport} />
      </CardContent>
    </Card>
  );
}
