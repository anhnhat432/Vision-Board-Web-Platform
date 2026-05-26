import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Package, RefreshCw } from "lucide-react";

import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import type { CatalogItem, CatalogItemType } from "@/features/order/catalog/types";
import { formatVnd } from "@/features/order/lib/pricing";
import { getApiBaseUrl } from "@/lib/api/apiClient";
import { authedFetch } from "@/lib/auth/authedFetch";

import { AdminEmptyState } from "../components/admin/AdminEmptyState";
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
      setItems((prev) =>
        prev.map((i) => (i.itemId === itemId ? { ...i, thumbnail: updated.thumbnail } : i)),
      );
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
    if (list.length === 0) {
      return (
        <AdminEmptyState
          icon={Package}
          title="Chưa có item nào"
          description={`Catalog ${TAB_LABELS[type]} chưa có item. Thêm item từ backend để bắt đầu.`}
        />
      );
    }

    return (
      <Table
        containerClassName="rounded-[var(--r-card)] border-white/10 bg-white/[0.02] shadow-none"
        className="text-slate-200"
      >
          <TableHeader className="bg-white/[0.04] [&_tr]:border-b [&_tr]:border-white/10">
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="text-slate-400">Ảnh</TableHead>
              <TableHead className="text-slate-400">Item ID</TableHead>
              <TableHead className="text-slate-400">Tên</TableHead>
              <TableHead className="text-slate-400">Giá (đ)</TableHead>
              <TableHead className="text-slate-400">Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-white/10">
            {list.map((item) => (
              <TableRow key={item.itemId} className="border-white/10 hover:bg-white/5">
                <TableCell>
                  <div className="flex items-center gap-3">
                    {item.thumbnail ? (
                      <img
                        src={item.thumbnail}
                        alt={item.label}
                        className="h-12 w-12 rounded-[var(--r-tile)] border border-white/10 object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-[var(--r-tile)] border border-dashed border-white/15 bg-white/5 text-xs text-slate-500">
                        no img
                      </div>
                    )}
                    <input
                      ref={(el) => {
                        fileInputs.current[item.itemId] = el;
                      }}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void uploadThumbnail(item.itemId, file);
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white"
                      disabled={uploading === item.itemId}
                      onClick={() => fileInputs.current[item.itemId]?.click()}
                    >
                      {uploading === item.itemId ? (
                        <span className="inline-flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" /> Đang upload…
                        </span>
                      ) : (
                        "Đổi ảnh"
                      )}
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs text-slate-300">{item.itemId}</TableCell>
                <TableCell className="text-slate-100">{item.label}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      className={`${adminInput} w-32`}
                      defaultValue={item.priceVnd}
                      disabled={saving === item.itemId}
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (!Number.isFinite(v) || v < 0) return;
                        if (v !== item.priceVnd) void updatePrice(item.itemId, v);
                      }}
                    />
                    <span className="text-xs text-slate-500">{formatVnd(item.priceVnd)}</span>
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
                    <span className={item.isActive ? "text-emerald-300" : "text-slate-500"}>
                      {item.isActive ? "Đang bán" : "Đã ẩn"}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
            className="gap-2 border-white/10 bg-white/5 text-slate-100 hover:bg-white/10 hover:text-white"
            disabled={loading}
            onClick={() => void refresh()}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Tải lại
          </Button>
        }
      />

      {error ? (
        <div className="rounded-[var(--r-card)] border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      {loading && items.length === 0 ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <Tabs defaultValue="frame">
          <TabsList className="bg-white/5">
            <TabsTrigger value="frame">{TAB_LABELS.frame}</TabsTrigger>
            <TabsTrigger value="theme">{TAB_LABELS.theme}</TabsTrigger>
            <TabsTrigger value="sticker">{TAB_LABELS.sticker}</TabsTrigger>
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
