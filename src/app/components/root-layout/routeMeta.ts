export interface RouteMeta {
  match: (pathname: string) => boolean;
  label: string;
  title: string;
  tagline: string;
}

const PRODUCTION_SITE_ORIGIN = "https://dearourfuture.io.vn";

export const GUIDED_PATHS = new Set([
  "/onboarding",
  "/life-insight",
  "/feasibility",
  "/smart-goal-setup",
  "/12-week-setup",
  "/12-week-plan-setup",
  "/12-week-plan-overview",
]);

export const ROUTE_META: RouteMeta[] = [
  {
    match: (pathname: string) => pathname === "/",
    label: "Trang chính",
    title: "Trang chính – Dear Our Future",
    tagline: "Thấy rõ quỹ đạo phát triển của mình, không chỉ những việc cần làm hôm nay.",
  },
  {
    match: (pathname: string) => pathname === "/login",
    label: "Đăng nhập",
    title: "Đăng nhập – Dear Our Future",
    tagline: "Đăng nhập hoặc tạo tài khoản để giữ tiến độ 12 tuần gắn với tài khoản của bạn.",
  },
  {
    match: (pathname: string) => pathname === "/onboarding",
    label: "Bắt đầu",
    title: "Bắt đầu – Dear Our Future",
    tagline: "Tạo điểm bắt đầu đủ rõ trước khi chọn trọng tâm và viết mục tiêu.",
  },
  {
    match: (pathname: string) => pathname === "/help",
    label: "Trợ giúp",
    title: "Trung tâm trợ giúp – Dear Our Future",
    tagline: "Hướng dẫn ngắn gọn để biến mục tiêu thành kế hoạch 12 tuần rõ ràng.",
  },
  {
    match: (pathname: string) => pathname === "/privacy",
    label: "Chính sách bảo mật",
    title: "Chính sách bảo mật – Dear Our Future",
    tagline: "Cách Dear Our Future bảo vệ dữ liệu, quyền riêng tư và lựa chọn của bạn.",
  },
  {
    match: (pathname: string) => pathname === "/terms",
    label: "Điều khoản",
    title: "Điều khoản dịch vụ – Dear Our Future",
    tagline: "Các điều kiện sử dụng rõ ràng cho tài khoản, dữ liệu và trải nghiệm sản phẩm.",
  },
  {
    match: (pathname: string) => pathname === "/contact",
    label: "Liên hệ hỗ trợ",
    title: "Liên hệ hỗ trợ – Dear Our Future",
    tagline: "Kênh hỗ trợ chính thức cho tài khoản, dữ liệu, thanh toán và trải nghiệm 12 tuần.",
  },
  {
    match: (pathname: string) => pathname === "/refund-policy",
    label: "Chính sách hoàn tiền",
    title: "Chính sách hoàn tiền – Dear Our Future",
    tagline: "Thông tin minh bạch về điều kiện hỗ trợ, xử lý thanh toán và hoàn tiền.",
  },
  {
    match: (pathname: string) => pathname === "/vision",
    label: "Tầm nhìn 3 năm",
    title: "Tầm nhìn 3 năm – Dear Our Future",
    tagline: "Định hình bức tranh dài hạn để mỗi chu kỳ 12 tuần đều phục vụ điều này.",
  },
  {
    match: (pathname: string) => pathname === "/life-insight",
    label: "Góc nhìn cuộc sống",
    title: "Góc nhìn cuộc sống – Dear Our Future",
    tagline: "Chọn một trọng tâm từ dữ liệu cân bằng để không bắt đầu quá rộng.",
  },
  {
    match: (pathname: string) => pathname === "/smart-goal-setup",
    label: "Mục tiêu SMART",
    title: "Mục tiêu SMART – Dear Our Future",
    tagline: "Biến trọng tâm thành mục tiêu rõ kết quả, chỉ số, lý do và thời hạn.",
  },
  {
    match: (pathname: string) => pathname === "/feasibility",
    label: "Kiểm tra tính khả thi",
    title: "Kiểm tra tính khả thi – Dear Our Future",
    tagline: "Đo mức sẵn sàng trước khi biến mục tiêu thành kế hoạch 12 tuần.",
  },
  {
    match: (pathname: string) => pathname === "/12-week-setup",
    label: "Thiết lập 12 tuần",
    title: "Thiết lập 12 tuần – Dear Our Future",
    tagline: "Chốt kết quả, việc lặp lại, lịch nhìn lại và tuần đầu tiên.",
  },
  {
    match: (pathname: string) => pathname.startsWith("/goals"),
    label: "Mục tiêu",
    title: "Mục tiêu – Dear Our Future",
    tagline: "Biến ý định thành nhịp thực thi đều, rõ và đo được.",
  },
  {
    match: (pathname: string) => pathname.startsWith("/12-week"),
    label: "Hệ 12 tuần",
    title: "Hệ 12 tuần – Dear Our Future",
    tagline: "Giữ đà 12 tuần như đang điều hành một chiến dịch thật sự.",
  },
  {
    match: (pathname: string) => pathname.startsWith("/vision-board"),
    label: "Vision board",
    title: "Vision board – Dear Our Future",
    tagline: "Dựng tương lai theo cách đủ đẹp để bạn muốn quay lại mỗi ngày.",
  },
  {
    match: (pathname: string) => pathname.startsWith("/gallery"),
    label: "Thư viện",
    title: "Thư viện – Dear Our Future",
    tagline: "Những phiên bản tương lai của bạn đang được lưu lại theo từng mùa phát triển.",
  },
  {
    match: (pathname: string) => pathname.startsWith("/life-balance"),
    label: "Cân bằng cuộc sống",
    title: "Cân bằng cuộc sống – Dear Our Future",
    tagline: "Nhìn toàn cảnh để biết nơi nào nên được chăm lại trước tiên.",
  },
  {
    match: (pathname: string) => pathname.startsWith("/achievements"),
    label: "Thành tựu",
    title: "Thành tựu – Dear Our Future",
    tagline: "Mọi cột mốc nhỏ đều xứng đáng được nhìn thấy và ăn mừng.",
  },
  {
    match: (pathname: string) => pathname.startsWith("/journal"),
    label: "Nhật ký",
    title: "Nhật ký – Dear Our Future",
    tagline: "Giữ lại cảm xúc, bài học và những chuyển động tinh tế của hành trình.",
  },
  {
    match: (pathname: string) => pathname.startsWith("/billing/faq"),
    label: "FAQ thanh toán",
    title: "FAQ thanh toán – Dear Our Future",
    tagline: "Giải đáp các câu hỏi thường gặp khi chuyển khoản nâng cấp Plus.",
  },
  {
    match: (pathname: string) => pathname.startsWith("/billing/checkout"),
    label: "Thanh toán",
    title: "Thanh toán nâng cấp – Dear Our Future",
    tagline: "Theo dõi trạng thái thanh toán nâng cấp gói Plus.",
  },
  {
    match: (pathname: string) => pathname.startsWith("/billing/confirm"),
    label: "Xác nhận thanh toán",
    title: "Xác nhận thanh toán – Dear Our Future",
    tagline: "Kiểm tra trạng thái xác nhận sau khi hoàn tất bước thanh toán nâng cấp Plus.",
  },
  {
    match: (pathname: string) => pathname.startsWith("/settings"),
    label: "Cài đặt",
    title: "Cài đặt – Dear Our Future",
    tagline: "Quản lý tài khoản, dữ liệu thiết bị và bản sao lưu.",
  },
  {
    match: (pathname: string) =>
      pathname === "/billing" || pathname.startsWith("/billing/plan") || pathname.startsWith("/account/billing"),
    label: "Gói Plus & thanh toán",
    title: "Gói Plus & thanh toán – Dear Our Future",
    tagline: "Xem gói hiện tại, quyền Plus, lịch sử và thao tác thanh toán.",
  },
  {
    match: (pathname: string) => pathname.startsWith("/admin/dashboard"),
    label: "Tổng quan vận hành",
    title: "Tổng quan vận hành – Dear Our Future",
    tagline: "Theo dõi nhanh user, doanh thu Plus, đơn thanh toán và đơn in.",
  },
  {
    match: (pathname: string) => pathname.startsWith("/admin/orders"),
    label: "Quản trị đơn hàng",
    title: "Quản trị đơn hàng – Dear Our Future",
    tagline: "Xem và chuyển trạng thái đơn hàng in từ người dùng.",
  },
  {
    match: (pathname: string) => pathname.startsWith("/admin/payments"),
    label: "Thanh toán tự động",
    title: "Thanh toán tự động – Dear Our Future",
    tagline: "Đối chiếu giao dịch Plus và mở Plus thủ công khi cần.",
  },
  {
    match: (pathname: string) => pathname.startsWith("/admin/refunds"),
    label: "Hoàn tiền",
    title: "Hoàn tiền – Dear Our Future",
    tagline: "Duyệt yêu cầu hoàn tiền thủ công từ người dùng.",
  },
  {
    match: (pathname: string) => pathname.startsWith("/admin/catalog"),
    label: "Catalog đơn kit",
    title: "Catalog đơn kit – Dear Our Future",
    tagline: "Quản lý giá, ảnh và trạng thái catalog đơn kit.",
  },
  {
    match: (pathname: string) => pathname.startsWith("/order-status"),
    label: "Trạng thái đơn",
    title: "Trạng thái đơn – Dear Our Future",
    tagline: "Theo dõi tiến trình đơn kit trong không gian làm việc hiện tại.",
  },
  {
    match: (pathname: string) => pathname.startsWith("/order"),
    label: "Tạo đơn",
    title: "Tạo đơn – Dear Our Future",
    tagline: "Chốt thông tin kit cá nhân hóa trước khi xử lý đơn.",
  },
];

// Cache results by pathname so each route change reuses the same RouteMeta /
// BreadcrumbCrumb[] reference across renders. ROUTE_META is module-static, so cache stays
// valid for the lifetime of the page.
const routeMetaCache = new Map<string, RouteMeta>();
const breadcrumbCache = new Map<string, BreadcrumbCrumb[]>();

export function getRouteMeta(pathname: string): RouteMeta {
  const cached = routeMetaCache.get(pathname);
  if (cached) return cached;
  const result = ROUTE_META.find((item) => item.match(pathname)) ?? ROUTE_META[0];
  routeMetaCache.set(pathname, result);
  return result;
}

function normalizeCanonicalPath(pathname: string): string {
  const pathOnly = (pathname.split(/[?#]/)[0] || "/").replace(/\/+$/, "") || "/";
  return pathOnly.startsWith("/") ? pathOnly : `/${pathOnly}`;
}

function getRouteCanonicalUrl(pathname: string): string {
  return new URL(normalizeCanonicalPath(pathname), PRODUCTION_SITE_ORIGIN).href;
}

function setMetaContent(selector: string, content: string): void {
  document.head.querySelector<HTMLMetaElement>(selector)?.setAttribute("content", content);
}

export function applyRouteDocumentMetadata(pathname: string): void {
  if (typeof document === "undefined") return;

  const meta = getRouteMeta(pathname);
  const title = meta.title || "Dear Our Future";
  const description = meta.tagline;
  const canonicalUrl = getRouteCanonicalUrl(pathname);

  document.title = title;
  document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute("href", canonicalUrl);
  setMetaContent('meta[name="description"]', description);
  setMetaContent('meta[property="og:url"]', canonicalUrl);
  setMetaContent('meta[property="og:title"]', title);
  setMetaContent('meta[property="og:description"]', description);
  setMetaContent('meta[name="twitter:title"]', title);
  setMetaContent('meta[name="twitter:description"]', description);
}

export interface BreadcrumbCrumb {
  label: string;
  path: string;
  isCurrent: boolean;
}

export function getBreadcrumbTrail(pathname: string): BreadcrumbCrumb[] {
  const cached = breadcrumbCache.get(pathname);
  if (cached) return cached;

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length < 3) {
    breadcrumbCache.set(pathname, []);
    return [];
  }

  const rootMeta = ROUTE_META[0];
  const crumbs: BreadcrumbCrumb[] = [];
  let acc = "";
  for (let i = 0; i < segments.length; i++) {
    acc += `/${segments[i]}`;
    const meta = ROUTE_META.find((item) => item.match(acc));
    if (!meta || meta === rootMeta) continue;
    const last = crumbs[crumbs.length - 1];
    if (last && last.label === meta.label) {
      last.path = acc;
      continue;
    }
    crumbs.push({ label: meta.label, path: acc, isCurrent: false });
  }

  if (crumbs.length === 0) {
    breadcrumbCache.set(pathname, []);
    return [];
  }
  crumbs[crumbs.length - 1].isCurrent = true;
  breadcrumbCache.set(pathname, crumbs);
  return crumbs;
}

export function getRouteTone(pathname: string): string {
  if (pathname.startsWith("/journal")) return "journal";
  if (pathname.startsWith("/achievements")) return "achievements";
  if (
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/life-balance") ||
    pathname.startsWith("/life-insight")
  ) {
    return "balance";
  }
  if (pathname.startsWith("/smart-goal-setup") || pathname.startsWith("/feasibility")) return "system";
  if (pathname.startsWith("/goals")) return "system";
  if (pathname.startsWith("/12-week")) return "system";
  if (pathname.startsWith("/vision") || pathname.startsWith("/gallery")) return "vision";
  return "default";
}
