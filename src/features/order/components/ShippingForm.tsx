import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";

export interface ShippingFormValue {
  fullName: string;
  email: string;
  phone: string;
  shippingAddress: string;
  goalId: string | null;
  goalTitle: string;
}

export interface ShippingFormProps {
  value: ShippingFormValue;
  onChange: (next: ShippingFormValue) => void;
  errors?: Partial<Record<keyof ShippingFormValue, string>>;
  goalOptions?: Array<{ id: string; title: string }>;
}

export function ShippingForm({ value, onChange, errors, goalOptions = [] }: ShippingFormProps) {
  function set<K extends keyof ShippingFormValue>(key: K, v: ShippingFormValue[K]) {
    onChange({ ...value, [key]: v });
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label htmlFor="order-fullname">Họ và tên</Label>
        <Input
          id="order-fullname"
          value={value.fullName}
          onChange={(e) => set("fullName", e.target.value)}
        />
        {errors?.fullName && <p className="mt-1 text-xs text-destructive">{errors.fullName}</p>}
      </div>
      <div>
        <Label htmlFor="order-email">Email</Label>
        <Input
          id="order-email"
          type="email"
          value={value.email}
          onChange={(e) => set("email", e.target.value)}
        />
        {errors?.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
      </div>
      <div>
        <Label htmlFor="order-phone">Số điện thoại</Label>
        <Input
          id="order-phone"
          value={value.phone}
          onChange={(e) => set("phone", e.target.value)}
        />
        {errors?.phone && <p className="mt-1 text-xs text-destructive">{errors.phone}</p>}
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="order-address">Địa chỉ giao hàng</Label>
        <Input
          id="order-address"
          value={value.shippingAddress}
          onChange={(e) => set("shippingAddress", e.target.value)}
        />
        {errors?.shippingAddress && (
          <p className="mt-1 text-xs text-destructive">{errors.shippingAddress}</p>
        )}
      </div>
      {goalOptions.length > 0 && (
        <div className="sm:col-span-2">
          <Label htmlFor="order-goal">Gắn với mục tiêu (tuỳ chọn)</Label>
          <select
            id="order-goal"
            className="w-full rounded border border-[color:var(--border)] bg-card px-3 py-2 text-sm"
            value={value.goalId ?? ""}
            onChange={(e) => {
              const id = e.target.value || null;
              const goal = goalOptions.find((g) => g.id === id);
              onChange({ ...value, goalId: id, goalTitle: goal?.title ?? "" });
            }}
          >
            <option value="">— Không gắn —</option>
            {goalOptions.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
