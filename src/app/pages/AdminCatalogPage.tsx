import { Loader2, Package, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import type { CatalogItem, CatalogItemType } from "@/features/order/catalog/types";
import { formatVnd } from "@/features/order/lib/pricing";
import { getApiBaseUrl } from "@/lib/api/apiClient";
import { authedFetch } from "@/lib/auth/authedFetch";

import { AdminDataPanel } from "../components/admin/AdminDataPanel";
import { AdminEmptyState } from "../components/admin/AdminEmptyState";
import { AdminFeedbackBanner } from "../components/admin/AdminFeedbackBanner";
import { AdminPageHeader } from "../components/admin/AdminPageHeader";
import { adminInput } from "../components/admin/tokens";

function buildAdminApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith("/api/") ? path.slice(4) : path;
  const apiPath = normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`;
  return `${getApiBaseUrl()}${apiPath}`;
}

async function adminFetch<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await authedFetch(buildAdminApiUrl(path), {
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

interface CatalogItemResponse {
  data: CatalogItem;
}

const ALLOWED_THUMBNAIL_MIMES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_THUMBNAIL_BYTES = 2 * 1024 * 1024;

const TAB_LABELS: Record<CatalogItemType, string> = {
  frame: "Khung gỗ",
  theme: "Set ảnh chủ đề",
  sticker: "Sticker",
};

export function AdminCatalogPage() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

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
    setError(null);
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
    setError(null);
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

  async function uploadThumbnail(itemId: string, file: File) {
    if (!ALLOWED_THUMBNAIL_MIMES.has(file.type)) {
      setError("Chỉ chấp nhận ảnh PNG, JPEG hoặc WebP.");
      return;
    }
    if (file.size > MAX_THUMBNAIL_BYTES) {
      setError("Ảnh quá lớn. Tối đa 2MB.");
      return;
    }

    setError(null);
    setUploading(itemId);
    try {
      const formData = new FormData();
      formData.append("thumbnail", file);
      const res = await authedFetch(
        buildAdminApiUrl(`/api/admin/order-catalog/${encodeURIComponent(itemId)}/thumbnail`),
        {
          method: "POST",
          credentials: "include",
          body: formData,
        },
      );
      if (!res.ok) {
        let message = `HTTP ${res.status}`;
        try {
          const body = (await res.json()) as { message?: string };
          if (body?.message) message = body.message;
        } catch {
          // ignore body parse error
        }
        throw new Error(message);
      }
      const json = (await res.json()) as CatalogItemResponse;
      const updated = json.data;
      setItems((prev) => prev.map((i) => (i.itemId === itemId ? { ...i, thumbnail: updated.thumbnail } : i)));
    } catch (err) {
      setError(`Lỗi upload ảnh: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setUploading(null);
      const input = fileInputs.current[itemId];
      if (input) input.value = "";
    }
  }

  function renderTab(type: CatalogItemType) {
    const list = items.filter((i) => i.type === type).sort((a, b) => a.sortOrder - b.sortOrder);

    return (
      <AdminDataPanel
        title={`Catalog ${TAB_LABELS[type]}`}
        description={`${list.length.toLocaleString("vi-VN")} item`}
        busy={loading}
      >
        {list.length === 0 ? (
          <div className="p-4">
            <AdminEmptyState
              icon={Package}
              title="Chưa có item nào"
              description={`Catalog ${TAB_LABELS[type]} chưa có item. Thêm item từ backend để bắt đầu.`}
            />
          </div>
        ) : (
          <Table containerClassName="rounded-none border-0 shadow-none" className="text-app-ink-soft">
            <TableCaption className="sr-only">Danh sách {TAB_LABELS[type]}</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Ảnh</TableHead>
                <TableHead scope="col">Item ID</TableHead>
                <TableHead scope="col">Tên</TableHead>
                <TableHead scope="col" className="text-right">
                  Giá
                </TableHead>
                <TableHead scope="col">Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((item) => (
                <TableRow key={item.itemId}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {item.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          alt={item.label}
                          className="h-12 w-12 rounded-[var(--r-tile)] border border-app-line object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-[var(--r-tile)] border border-dashed border-app-line-strong bg-app-bg-subtle text-xs text-app-ink-muted">
                          Chưa có ảnh
                        </div>
                      )}
                      <input
                        ref={(el) => {
                          fileInputs.current[item.itemId] = el;
                        }}
                        type="file"
                        aria-label={`Tải ảnh cho ${item.label}`}
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) void uploadThumbnail(item.itemId, file);
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        aria-label={`Đổi ảnh ${item.label}`}
                        disabled={uploading === item.itemId}
                        onClick={() => fileInputs.current[item.itemId]?.click()}
                      >
                        {uploading === item.itemId ? (
                          <span className="inline-flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin motion-reduce:animate-none" /> Đang upload…
                          </span>
                        ) : (
                          "Đổi ảnh"
                        )}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-app-ink-soft">{item.itemId}</TableCell>
                  <TableCell className="text-app-ink">{item.label}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Input
                        type="number"
                        aria-label={`Giá ${item.label}`}
                        className={`${adminInput} w-32 text-right tabular-nums`}
                        defaultValue={item.priceVnd}
                        disabled={saving === item.itemId}
                        onBlur={(event) => {
                          const value = Number(event.target.value);
                          if (!Number.isFinite(value) || value < 0) return;
                          if (value !== item.priceVnd) void updatePrice(item.itemId, value);
                        }}
                      />
                      <span className="text-xs tabular-nums text-app-ink-muted">{formatVnd(item.priceVnd)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="inline-flex items-center gap-2 text-xs">
                      <Switch
                        checked={item.isActive}
                        disabled={saving === item.itemId}
                        onCheckedChange={(checked) => void toggleActive(item.itemId, Boolean(checked))}
                        aria-label={`${item.label}: ${item.isActive ? "đang bán" : "đã ẩn"}`}
                      />
                      <span className={item.isActive ? "text-app-accent" : "text-app-ink-muted"}>
                        {item.isActive ? "Đang bán" : "Đã ẩn"}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </AdminDataPanel>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Catalog đơn kit"
        description="Sửa giá, ẩn/hiện sản phẩm, cập nhật ảnh đại diện. Thay đổi áp dụng ngay khi user reload trang đặt đơn."
        actions={
          <Button
            type="button"
            variant="outline"
            className="gap-2 border-app-line bg-app-bg-subtle text-app-ink hover:bg-app-accent-soft hover:text-app-ink"
            disabled={loading}
            onClick={() => void refresh()}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : (
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
            )}
            Tải lại
          </Button>
        }
      />

      {error ? (
        <AdminFeedbackBanner
          tone="error"
          summary={error}
          onDismiss={() => setError(null)}
          dismissLabel="Đóng lỗi catalog"
          action={
            <Button type="button" variant="outline" size="sm" onClick={() => void refresh()}>
              Thử lại
            </Button>
          }
        />
      ) : null}

      {loading && items.length === 0 ? (
        <div className="flex min-h-[40vh] items-center justify-center" role="status">
          <Loader2 className="h-6 w-6 animate-spin text-app-ink-muted motion-reduce:animate-none" />
          <span className="sr-only">Đang tải catalog</span>
        </div>
      ) : (
        <Tabs defaultValue="frame">
          <TabsList aria-label="Loại catalog" className="bg-app-bg-subtle">
            <TabsTrigger value="frame">
              {TAB_LABELS.frame} ({items.filter((item) => item.type === "frame").length})
            </TabsTrigger>
            <TabsTrigger value="theme">
              {TAB_LABELS.theme} ({items.filter((item) => item.type === "theme").length})
            </TabsTrigger>
            <TabsTrigger value="sticker">
              {TAB_LABELS.sticker} ({items.filter((item) => item.type === "sticker").length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="frame" className="mt-4">
            {renderTab("frame")}
          </TabsContent>
          <TabsContent value="theme" className="mt-4">
            {renderTab("theme")}
          </TabsContent>
          <TabsContent value="sticker" className="mt-4">
            {renderTab("sticker")}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

export default AdminCatalogPage;
