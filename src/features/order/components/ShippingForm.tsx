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

const fieldClass =
  "w-full h-11 border border-[var(--order-border)] rounded-[11px] px-[14px] text-[13.5px] text-[var(--order-text)] bg-white outline-none font-[inherit] transition-all focus:border-[var(--order-accent)] focus:shadow-[0_0_0_3px_var(--order-accent-soft)]";
const labelClass = "block text-xs font-semibold text-[var(--order-text-soft)] mb-[7px]";

export function ShippingForm({ value, onChange, errors, goalOptions = [] }: ShippingFormProps) {
  function set<K extends keyof ShippingFormValue>(key: K, v: ShippingFormValue[K]) {
    onChange({ ...value, [key]: v });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className={labelClass} htmlFor="order-fullname">Họ và tên</label>
        <input
          id="order-fullname"
          type="text"
          className={fieldClass}
          value={value.fullName}
          onChange={(e) => set("fullName", e.target.value)}
        />
        {errors?.fullName && <p className="mt-1 text-xs text-destructive">{errors.fullName}</p>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-[14px]">
        <div>
          <label className={labelClass} htmlFor="order-email">Email</label>
          <input
            id="order-email"
            type="email"
            className={fieldClass}
            value={value.email}
            onChange={(e) => set("email", e.target.value)}
          />
          {errors?.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
        </div>
        <div>
          <label className={labelClass} htmlFor="order-phone">Số điện thoại</label>
          <input
            id="order-phone"
            type="tel"
            className={fieldClass}
            value={value.phone}
            onChange={(e) => set("phone", e.target.value)}
          />
          {errors?.phone && <p className="mt-1 text-xs text-destructive">{errors.phone}</p>}
        </div>
      </div>
      <div>
        <label className={labelClass} htmlFor="order-address">Địa chỉ giao hàng</label>
        <input
          id="order-address"
          type="text"
          className={fieldClass}
          value={value.shippingAddress}
          onChange={(e) => set("shippingAddress", e.target.value)}
        />
        {errors?.shippingAddress && <p className="mt-1 text-xs text-destructive">{errors.shippingAddress}</p>}
      </div>
      {goalOptions.length > 0 && (
        <div>
          <label className={labelClass} htmlFor="order-goal">Gắn với mục tiêu (tuỳ chọn)</label>
          <select
            id="order-goal"
            className="w-full h-11 rounded-[11px] border border-[var(--order-border)] bg-white px-[14px] text-[13.5px] text-[var(--order-text)] outline-none font-[inherit]"
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
