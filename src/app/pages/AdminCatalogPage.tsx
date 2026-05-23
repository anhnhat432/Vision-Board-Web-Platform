import { useCallback, useEffect, useState } from "react";

import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import type { CatalogItem, CatalogItemType } from "@/features/order/catalog/types";
import { formatVnd } from "@/features/order/lib/pricing";

async function adminFetch<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

interface CatalogResponse {
  data: CatalogItem[];
}

export function AdminCatalogPage() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const json = await adminFetch<CatalogResponse>("/api/admin/order-catalog");
      setItems(json.data);
    } catch (err) {
      setError(`Không tải được catalog: ${err}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function updatePrice(itemId: string, priceVnd: number) {
    setSaving(itemId);
    const prev = items;
    setItems(items.map((i) => (i.itemId === itemId ? { ...i, priceVnd } : i)));
    try {
      await adminFetch(`/api/admin/order-catalog/${encodeURIComponent(itemId)}`, {
        method: "PUT",
        body: JSON.stringify({ priceVnd }),
      });
    } catch (err) {
      setItems(prev);
      setError(`Lỗi lưu giá: ${err}`);
    } finally {
      setSaving(null);
    }
  }

  async function toggleActive(itemId: string, isActive: boolean) {
    setSaving(itemId);
    const prev = items;
    setItems(items.map((i) => (i.itemId === itemId ? { ...i, isActive } : i)));
    try {
      await adminFetch(`/api/admin/order-catalog/${encodeURIComponent(itemId)}/active`, {
        method: "PATCH",
        body: JSON.stringify({ isActive }),
      });
    } catch (err) {
      setItems(prev);
      setError(`Lỗi đổi trạng thái: ${err}`);
    } finally {
      setSaving(null);
    }
  }

  function renderTab(type: CatalogItemType) {
    const list = items
      .filter((i) => i.type === type)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    if (list.length === 0) {
      return <p className="mt-3 text-sm text-muted-foreground">Chưa có item nào.</p>;
    }
    return (
      <table className="mt-3 w-full text-sm">
        <thead className="text-left text-muted-foreground">
          <tr>
            <th className="py-2">Item ID</th>
            <th>Tên</th>
            <th>Giá (đ)</th>
            <th>Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {list.map((item) => (
            <tr key={item.itemId} className="border-t border-[color:var(--border)]">
              <td className="py-2 font-mono text-xs">{item.itemId}</td>
              <td>{item.label}</td>
              <td>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    className="w-32"
                    defaultValue={item.priceVnd}
                    disabled={saving === item.itemId}
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (!Number.isFinite(v) || v < 0) return;
                      if (v !== item.priceVnd) void updatePrice(item.itemId, v);
                    }}
                  />
                  <span className="text-xs text-muted-foreground">{formatVnd(item.priceVnd)}</span>
                </div>
              </td>
              <td>
                <Button
                  type="button"
                  variant={item.isActive ? "default" : "outline"}
                  size="sm"
                  disabled={saving === item.itemId}
                  onClick={() => void toggleActive(item.itemId, !item.isActive)}
                >
                  {item.isActive ? "Đang bán" : "Đã ẩn"}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  if (loading) return <div className="p-6">Đang tải catalog...</div>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-2xl font-bold">Quản lý catalog đơn kit</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Sửa giá, ẩn/hiện sản phẩm. Thay đổi áp dụng ngay khi user reload trang đặt đơn.
      </p>
      {error && (
        <div className="mt-3 rounded bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      <Tabs defaultValue="frame" className="mt-6">
        <TabsList>
          <TabsTrigger value="frame">Khung gỗ</TabsTrigger>
          <TabsTrigger value="theme">Set ảnh chủ đề</TabsTrigger>
          <TabsTrigger value="sticker">Sticker</TabsTrigger>
        </TabsList>
        <TabsContent value="frame">{renderTab("frame")}</TabsContent>
        <TabsContent value="theme">{renderTab("theme")}</TabsContent>
        <TabsContent value="sticker">{renderTab("sticker")}</TabsContent>
      </Tabs>
    </div>
  );
}

export default AdminCatalogPage;
