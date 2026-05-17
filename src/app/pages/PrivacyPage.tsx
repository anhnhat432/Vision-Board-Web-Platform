import { Link } from "react-router";
import { Shield } from "lucide-react";

const SUPPORT_EMAIL =
  import.meta.env.VITE_BILLING_SUPPORT_EMAIL?.trim() || "support@dearourfuture.com";

const LAST_UPDATED = "14/05/2026";

export function PrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-8 py-4">
      <header className="space-y-3">
        <div className="flex items-center gap-2 text-app-accent">
          <Shield className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-[0.14em]">
            Dear Our Future
          </span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-app-ink">
          Chính sách bảo mật
        </h1>
        <p className="text-sm text-app-ink-muted">
          Cập nhật lần cuối: {LAST_UPDATED}
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-app-ink">
          1. Dữ liệu chúng tôi thu thập
        </h2>
        <p className="text-sm leading-relaxed text-app-ink-soft">
          Khi bạn sử dụng Dear Our Future, chúng tôi có thể thu thập các loại
          dữ liệu sau:
        </p>
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-app-ink-soft">
          <li>
            <strong>Thông tin tài khoản:</strong> email, tên hiển thị mà bạn
            cung cấp khi đăng ký.
          </li>
          <li>
            <strong>Dữ liệu kế hoạch 12 tuần:</strong> mục tiêu, nhiệm vụ,
            nhật ký phản tư, và các đánh giá cân bằng cuộc sống mà bạn tạo
            trong ứng dụng.
          </li>
          <li>
            <strong>Dữ liệu thanh toán:</strong> thông tin đơn hàng, trạng thái
            giao dịch và trạng thái yêu cầu hoàn tiền. Khi bạn chủ động gửi yêu
            cầu hoàn tiền, chúng tôi lưu tài khoản ngân hàng nhận hoàn tiền để
            support xử lý chuyển khoản thủ công.
          </li>
          <li>
            <strong>Dữ liệu kỹ thuật:</strong> thông tin trình duyệt, thiết bị
            nhằm đảm bảo dịch vụ hoạt động ổn định.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-app-ink">
          2. Mục đích sử dụng
        </h2>
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-app-ink-soft">
          <li>Cung cấp và duy trì dịch vụ lập kế hoạch 12 tuần.</li>
          <li>Đồng bộ dữ liệu giữa các thiết bị khi bạn đăng nhập.</li>
          <li>Xử lý thanh toán, kích hoạt gói Plus và yêu cầu hoàn tiền thủ công theo chính sách.</li>
          <li>Cải thiện trải nghiệm người dùng và sửa lỗi kỹ thuật.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-app-ink">
          3. Chia sẻ với bên thứ ba
        </h2>
        <p className="text-sm leading-relaxed text-app-ink-soft">
          Chúng tôi <strong>không bán</strong> dữ liệu cá nhân của bạn. Dữ liệu
          chỉ được chia sẻ với:
        </p>
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-app-ink-soft">
          <li>
            <strong>Đăng nhập Google:</strong> xác thực đăng nhập.
          </li>
          <li>
            <strong>Nhà cung cấp thanh toán:</strong> chỉ khi bạn thực hiện
            giao dịch nâng cấp gói.
          </li>
          <li>
            <strong>Dịch vụ giám sát lỗi (Sentry):</strong> thu thập báo cáo
            lỗi kỹ thuật (không chứa nội dung cá nhân).
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-app-ink">
          4. Quyền của bạn
        </h2>
        <p className="text-sm leading-relaxed text-app-ink-soft">
          Bạn có quyền:
        </p>
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-app-ink-soft">
          <li>
            <strong>Xuất dữ liệu:</strong> tải toàn bộ dữ liệu của bạn từ
            trang{" "}
            <Link
              to="/settings"
              className="font-medium text-app-accent underline underline-offset-2 hover:text-app-ink"
            >
              Cài đặt
            </Link>
            .
          </li>
          <li>
            <strong>Xóa tài khoản:</strong> yêu cầu xóa toàn bộ dữ liệu tại
            trang{" "}
            <Link
              to="/settings"
              className="font-medium text-app-accent underline underline-offset-2 hover:text-app-ink"
            >
              Cài đặt
            </Link>
            . Sau khi xóa, dữ liệu không thể khôi phục.
          </li>
          <li>
            <strong>Chỉnh sửa thông tin:</strong> cập nhật tên hiển thị và email
            trong cài đặt tài khoản.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-app-ink">
          5. Bảo mật dữ liệu
        </h2>
        <p className="text-sm leading-relaxed text-app-ink-soft">
          Chúng tôi sử dụng mã hóa SSL/TLS cho mọi kết nối, và dữ liệu được
          lưu trữ trên hạ tầng đám mây có tiêu chuẩn bảo mật cao. Tuy nhiên,
          không hệ thống nào đảm bảo an toàn tuyệt đối — vui lòng bảo vệ mật
          khẩu tài khoản của bạn.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-app-ink">
          6. Liên hệ
        </h2>
        <p className="text-sm leading-relaxed text-app-ink-soft">
          Nếu bạn có câu hỏi về chính sách bảo mật, vui lòng liên hệ qua
          email:{" "}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="font-medium text-app-accent underline underline-offset-2 hover:text-app-ink"
          >
            {SUPPORT_EMAIL}
          </a>
        </p>
      </section>

      <footer className="border-t border-app-line pt-6">
        <div className="flex flex-wrap gap-4 text-sm">
          <Link
            to="/terms"
            className="font-medium text-app-ink-soft underline-offset-2 hover:text-app-ink hover:underline"
          >
            Điều khoản dịch vụ
          </Link>
          <Link
            to="/refund-policy"
            className="font-medium text-app-ink-soft underline-offset-2 hover:text-app-ink hover:underline"
          >
            Chính sách hoàn tiền
          </Link>
          <Link
            to="/"
            className="font-medium text-app-ink-soft underline-offset-2 hover:text-app-ink hover:underline"
          >
            Về trang chủ
          </Link>
        </div>
      </footer>
    </article>
  );
}