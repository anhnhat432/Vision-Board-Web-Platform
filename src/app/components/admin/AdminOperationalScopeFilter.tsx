import type { AdminOperationalScope } from "@/services/adminService";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

export interface AdminOperationalScopeFilterProps {
  value: AdminOperationalScope;
  onChange(value: AdminOperationalScope): void;
}

function isAdminOperationalScope(value: string): value is AdminOperationalScope {
  return value === "real" || value === "excluded" || value === "all";
}

export function AdminOperationalScopeFilter({ value, onChange }: AdminOperationalScopeFilterProps) {
  return (
    <Select value={value} onValueChange={(next) => isAdminOperationalScope(next) && onChange(next)}>
      <SelectTrigger aria-label="Phạm vi dữ liệu">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="real">Dữ liệu thật</SelectItem>
        <SelectItem value="excluded">Test & nội bộ</SelectItem>
        <SelectItem value="all">Tất cả</SelectItem>
      </SelectContent>
    </Select>
  );
}
