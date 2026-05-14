import { Link } from "react-router";
import { FileText } from "lucide-react";

const SUPPORT_EMAIL =
  import.meta.env.VITE_BILLING_SUPPORT_EMAIL?.trim() || "support@dearourfuture.com";

const LAST_UPDATED = "14/05/2026";

export function TermsPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-8 py-4">
      <header className="space-y-3">
        <div className="flex items-center gap-2 text-violet-600">
          <FileText className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-[0.14em]">
            Dear Our Future
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Điều khoản dịch vụ
        </h1>
        <p className="text-sm text-slate-500">
          Cập nhật lần cuối: {LAST_UPDATED}
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
          1. Phạm vi dịch vụ
        </h2>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          Dear Our Future cung cấp nền tảng lập kế hoạch 12 tuần và phản tư cá
          nhân, bao gồm:
        </p>
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          <li>Đánh giá cân bằng cuộc sống và phân tích mục tiêu.</li>
          <li>Thiết lập mục tiêu SMART và kiểm tra tính khả thi.</li>
          <li>Lập kế hoạch 12 tuần với theo dõi tiến độ hàng tuần.</li>
          <li>Nhật ký phản tư và đánh giá cuối tuần.</li>
          <li>Đồng bộ dữ liệu giữa các thiết bị (yêu cầu tài khoản).</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
          2. Tài khoản và nghĩa vụ người dùng
        </h2>
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          <li>
            Bạn chịu trách nhiệm bảo mật thông tin đăng nhập tài khoản của
            mình.
          </li>
          <li>
            Không sử dụng dịch vụ cho mục đích bất hợp pháp hoặc gây hại cho
            người khác.
          </li>
          <li>
            Không tạo nhiều tài khoản để lạm dụng các ưu đãi hoặc bản dùng thử.
          </li>
          <li>
            Nội dung bạn tạo trong ứng dụng (mục tiêu, nhật ký) thuộc quyền sở
            hữu của bạn.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
          3. Quy tắc thanh toán
        </h2>
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          <li>
            <strong>Gói Plus:</strong> nâng cấp tính năng cao cấp cho chu kỳ 12
            tuần.
          </li>
          <li>
            Thanh toán qua chuyển khoản ngân hàng (VietQR). Gói được kích hoạt
            sau khi hệ thống xác nhận giao dịch thành công.
          </li>
          <li>
            <strong>Hoàn tiền:</strong> bạn có thể yêu cầu hoàn tiền trong vòng
            7 ngày kể từ ngày kích hoạt nếu chưa sử dụng đáng kể các tính năng
            Plus. Liên hệ{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="font-medium text-violet-600 underline underline-offset-2 hover:text-violet-800"
            >
              {SUPPORT_EMAIL}
            </a>{" "}
            để yêu cầu hoàn tiền.
          </li>
          <li>
            <strong>Hủy gói:</strong> bạn có thể hủy gói Plus bất kỳ lúc nào.
            Tính năng Plus vẫn hoạt động đến hết chu kỳ đã thanh toán.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
          4. Giới hạn trách nhiệm
        </h2>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          Dear Our Future được cung cấp theo nguyên tắc &ldquo;nguyên trạng&rdquo;
          (as-is). Chúng tôi nỗ lực duy trì dịch vụ ổn định nhưng không đảm bảo
          dịch vụ hoạt động liên tục không gián đoạn. Chúng tôi không chịu trách
          nhiệm cho:
        </p>
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          <li>
            Mất dữ liệu do lỗi thiết bị, trình duyệt, hoặc do người dùng xóa
            dữ liệu cục bộ.
          </li>
          <li>Gián đoạn dịch vụ do bảo trì hoặc sự cố kỹ thuật.</li>
          <li>
            Kết quả thực tế từ việc áp dụng kế hoạch 12 tuần — ứng dụng là công
            cụ hỗ trợ, không phải cam kết kết quả.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
          5. Thay đổi điều khoản
        </h2>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          Chúng tôi có quyền cập nhật điều khoản dịch vụ này. Khi có thay đổi
          quan trọng, bạn sẽ được thông báo qua email hoặc thông báo trong ứng
          dụng. Việc tiếp tục sử dụng dịch vụ sau khi điều khoản được cập nhật
          đồng nghĩa với việc bạn chấp nhận các thay đổi.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
          6. Liên hệ
        </h2>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          Mọi câu hỏi về điều khoản dịch vụ, vui lòng liên hệ:{" "}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="font-medium text-violet-600 underline underline-offset-2 hover:text-violet-800"
          >
            {SUPPORT_EMAIL}
          </a>
        </p>
      </section>

      <footer className="border-t border-slate-200 pt-6 dark:border-slate-700">
        <div className="flex flex-wrap gap-4 text-sm">
          <Link
            to="/privacy"
            className="font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline dark:text-slate-400 dark:hover:text-slate-200"
          >
            Chính sách bảo mật
          </Link>
          <Link
            to="/"
            className="font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline dark:text-slate-400 dark:hover:text-slate-200"
          >
            Về trang chủ
          </Link>
        </div>
      </footer>
    </article>
  );
}