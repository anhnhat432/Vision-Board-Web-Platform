import { useState } from "react";
import { X, Save, Plus } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
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
    setLocalTactics((prev) =>
      prev.map((t, i) => (i === index ? { ...t, ...updates } : t))
    );
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-auto">
        <CardHeader className="sticky top-0 bg-background z-10">
          <div className="flex items-center justify-between">
            <CardTitle>Chỉnh sửa việc lặp lại</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Chỉnh sửa tên, số lần, đơn vị và loại việc. Ngày trong tuần được tính tự động dựa trên ngày ưu tiên toàn chu kỳ.
          </p>
        </CardHeader>

        <CardContent className="space-y-6 pb-6">
          {localTactics.map((tactic, idx) => (
            <div key={tactic.id} className="rounded-md border p-4 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  {/* Name */}
                  <div>
                    <label className="text-sm font-medium mb-1 block" htmlFor={`tactic-name-${idx}`}>Tên việc</label>
                    <Input
                      id={`tactic-name-${idx}`}
                      value={tactic.name}
                      onChange={(e) => updateTactic(idx, { name: e.target.value })}
                      placeholder="Ví dụ: Viết 500 từ mỗi buổi sáng"
                    />
                  </div>

                  {/* Target and Unit */}
                  <div className="flex gap-3">
                    <div className="w-1/2">
                      <label className="text-sm font-medium mb-1 block" htmlFor={`tactic-target-${idx}`}>Số lần/tuần</label>
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
                      <label className="text-sm font-medium mb-1 block" htmlFor={`tactic-unit-${idx}`}>Đơn vị</label>
                      <Input
                        id={`tactic-unit-${idx}`}
                        value={tactic.unit}
                        onChange={(e) => updateTactic(idx, { unit: e.target.value })}
                        placeholder="lần, giờ, buổi..."
                      />
                    </div>
                  </div>

                  {/* Type */}
                  <div>
                    <label className="text-sm font-medium mb-1 block" htmlFor={`tactic-type-${idx}`}>Loại việc</label>
                    <Select
                      value={tactic.type}
                      onValueChange={(value: "core" | "optional") =>
                        updateTactic(idx, { type: value })
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="core">Cốt lõi</SelectItem>
                        <SelectItem value="optional">Tùy chọn</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Remove button */}
                {localTactics.length > 2 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 shrink-0 text-destructive"
                    onClick={() => removeTactic(idx)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {idx < localTactics.length - 1 && <hr className="border-t" />}
            </div>
          ))}

          {/* Add tactic button */}
          <Button variant="outline" className="w-full" onClick={addTactic}>
            <Plus className="mr-2 h-4 w-4" />
            Thêm việc lặp lại
          </Button>
        </CardContent>
      </Card>

      {/* Sticky Footer */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t bg-background p-4 flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>
          Hủy
        </Button>
        <Button onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" />
          Lưu thay đổi
        </Button>
      </div>
    </div>
  );
}
