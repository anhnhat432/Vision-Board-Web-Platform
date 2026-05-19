import { useState } from "react";
import { X, Save, Plus } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import type { LeadIndicatorDraft } from "@/app/pages/12WeekSetup/types";

interface TacticsEditorProps {
  tactics: LeadIndicatorDraft[];
  onChange: (tactics: LeadIndicatorDraft[]) => void;
  onClose: () => void;
}

export function TacticsEditor({ tactics, onChange, onClose }: TacticsEditorProps) {
  const [localTactics, setLocalTactics] = useState<LeadIndicatorDraft[]>(tactics);

  const updateTactic = (index: number, updates: Partial<LeadIndicatorDraft>) => {
    setLocalTactics((prev) => prev.map((t, i) => (i === index ? { ...t, ...updates } : t)));
  };

  const addTactic = () => {
    const newTactic: LeadIndicatorDraft = {
      id: `new_${Date.now()}`,
      name: "",
      target: "1",
      unit: "lần",
      type: "optional",
      cadence: "spread",
    };
    setLocalTactics((prev) => [...prev, newTactic]);
  };

  const removeTactic = (index: number) => {
    setLocalTactics((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onChange(localTactics);
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa việc lặp lại</DialogTitle>
          <DialogDescription>
            Chỉnh sửa tên, số lần, đơn vị và loại việc. Ngày trong tuần được tính tự động dựa trên ngày ưu tiên toàn chu
            kỳ.
          </DialogDescription>
        </DialogHeader>

        <Card className="border-0 shadow-none">
          <CardHeader className="sr-only">
            <CardTitle>Danh sách việc lặp lại</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[60vh] space-y-6 overflow-y-auto px-0 pb-1">
            {localTactics.map((tactic, idx) => (
              <div key={tactic.id} className="space-y-4 rounded-[var(--r-control)] border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium" htmlFor={`tactic-name-${idx}`}>
                        Tên việc
                      </label>
                      <Input
                        id={`tactic-name-${idx}`}
                        value={tactic.name}
                        onChange={(e) => updateTactic(idx, { name: e.target.value })}
                        placeholder="Ví dụ: Viết 500 từ mỗi buổi sáng"
                      />
                    </div>

                    <div className="flex gap-3">
                      <div className="w-1/2">
                        <label className="mb-1 block text-sm font-medium" htmlFor={`tactic-target-${idx}`}>
                          Số lần/tuần
                        </label>
                        <Input
                          id={`tactic-target-${idx}`}
                          type="number"
                          min={1}
                          max={7}
                          value={tactic.target}
                          onChange={(e) => updateTactic(idx, { target: e.target.value })}
                        />
                      </div>
                      <div className="w-1/2">
                        <label className="mb-1 block text-sm font-medium" htmlFor={`tactic-unit-${idx}`}>
                          Đơn vị
                        </label>
                        <Input
                          id={`tactic-unit-${idx}`}
                          value={tactic.unit}
                          onChange={(e) => updateTactic(idx, { unit: e.target.value })}
                          placeholder="lần, giờ, buổi..."
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium" htmlFor={`tactic-type-${idx}`}>
                        Loại việc
                      </label>
                      <Select
                        value={tactic.type}
                        onValueChange={(value: "core" | "optional") => updateTactic(idx, { type: value })}
                      >
                        <SelectTrigger className="w-32" id={`tactic-type-${idx}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="core">Cốt lõi</SelectItem>
                          <SelectItem value="optional">Tùy chọn</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {localTactics.length > 2 ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 shrink-0 text-destructive"
                      onClick={() => removeTactic(idx)}
                      aria-label={`Xóa việc lặp lại số ${idx + 1}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>

                {idx < localTactics.length - 1 ? <hr className="border-t" /> : null}
              </div>
            ))}

            <Button variant="outline" className="w-full" onClick={addTactic}>
              <Plus className="mr-2 h-4 w-4" />
              Thêm việc lặp lại
            </Button>
          </CardContent>
        </Card>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Lưu thay đổi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
