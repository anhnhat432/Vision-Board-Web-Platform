export interface RouteMeta {
  match: (pathname: string) => boolean;
  label: string;
  title: string;
  tagline: string;
}

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
    label: "Bảng điều khiển",
    title: "Bảng điều khiển – Dear Our Future",
    tagline: "Thấy rõ quỹ đạo phát triển của mình, không chỉ những việc cần làm hôm nay.",
  },
  {
    match: (pathname: string) => pathname === "/onboarding",
    label: "Onboarding",
    title: "Onboarding – Dear Our Future",
    tagline: "Tạo điểm bắt đầu đủ rõ trước khi chọn trọng tâm và viết mục tiêu.",
  },
  {
    match: (pathname: string) => pathname === "/life-insight",
    label: "Life Insight",
    title: "Life Insight – Dear Our Future",
    tagline: "Chọn một trọng tâm từ dữ liệu cân bằng để không bắt đầu quá rộng.",
  },
  {
    match: (pathname: string) => pathname === "/smart-goal-setup",
    label: "SMART Goal",
    title: "SMART Goal – Dear Our Future",
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
    label: "Bảng tầm nhìn",
    title: "Bảng tầm nhìn – Dear Our Future",
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
    match: (pathname: string) => pathname.startsWith("/billing/checkout"),
    label: "Thanh toán",
    title: "Thanh toán nâng cấp – Dear Our Future",
    tagline: "Quét mã QR để nâng cấp gói Plus.",
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
    label: "Gói & thanh toán",
    title: "Gói & thanh toán – Dear Our Future",
    tagline: "Xem gói hiện tại, quyền truy cập và thao tác thanh toán.",
  },
  {
    match: (pathname: string) => pathname.startsWith("/admin/orders"),
    label: "Quản trị đơn hàng",
    title: "Quản trị đơn hàng – Dear Our Future",
    tagline: "Xem và chuyển trạng thái đơn hàng từ người dùng.",
  },
  {
    match: (pathname: string) => pathname.startsWith("/order-status"),
    label: "Trạng thái đơn",
    title: "Trạng thái đơn – Dear Our Future",
    tagline: "Theo dõi tiến trình đơn kit trong workspace hiện tại.",
  },
  {
    match: (pathname: string) => pathname.startsWith("/order"),
    label: "Tạo đơn",
    title: "Tạo đơn – Dear Our Future",
    tagline: "Chốt thông tin kit cá nhân hóa trước khi xử lý đơn.",
  },
];

export function getRouteMeta(pathname: string): RouteMeta {
  return ROUTE_META.find((item) => item.match(pathname)) ?? ROUTE_META[0];
}

export function getRouteTone(pathname: string): string {
  if (pathname.startsWith("/journal")) return "journal";
  if (pathname.startsWith("/achievements")) return "achievements";
  if (pathname.startsWith("/onboarding") || pathname.startsWith("/life-balance") || pathname.startsWith("/life-insight")) {
    return "balance";
  }
  if (pathname.startsWith("/smart-goal-setup") || pathname.startsWith("/feasibility")) return "system";
  if (pathname.startsWith("/goals")) return "system";
  if (pathname.startsWith("/12-week")) return "system";
  if (pathname.startsWith("/vision-board") || pathname.startsWith("/gallery")) return "vision";
  return "default";
}
