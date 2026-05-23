import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";

export interface NotesFieldValue {
  keywords: string[];
  note: string;
}

export interface NotesFieldProps {
  value: NotesFieldValue;
  onChange: (next: NotesFieldValue) => void;
}

export function NotesField({ value, onChange }: NotesFieldProps) {
  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="order-keywords">Từ khoá in lên kit (phân cách bằng dấu phẩy)</Label>
        <Input
          id="order-keywords"
          value={value.keywords.join(", ")}
          onChange={(e) =>
            onChange({
              ...value,
              keywords: e.target.value
                .split(",")
                .map((k) => k.trim())
                .filter(Boolean),
            })
          }
        />
      </div>
      <div>
        <Label htmlFor="order-note">Ghi chú cho shop</Label>
        <Textarea
          id="order-note"
          rows={3}
          value={value.note}
          onChange={(e) => onChange({ ...value, note: e.target.value })}
        />
      </div>
    </div>
  );
}
