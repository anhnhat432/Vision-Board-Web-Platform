import { Link } from "react-router";
import { BadgeCheck, Clock, Mail, ReceiptText, RefreshCw } from "lucide-react";

const SUPPORT_EMAIL = import.meta.env.VITE_BILLING_SUPPORT_EMAIL?.trim() || "support@dearourfuture.com";
const REFUND_WINDOW_DAYS = Number.parseInt(import.meta.env.VITE_REFUND_WINDOW_DAYS?.trim() || "7", 10);
const REFUND_MAX_USED_PERCENT = Number.parseInt(import.meta.env.VITE_REFUND_MAX_USED_PERCENT?.trim() || "25", 10);
const LAST_UPDATED = "15/05/2026";

function getSafePositiveNumber(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function RefundPolicyPage() {
  const refundWindowDays = getSafePositiveNumber(REFUND_WINDOW_DAYS, 7);
  const refundMaxUsedPercent = getSafePositiveNumber(REFUND_MAX_USED_PERCENT, 25);

  return (
    <article className="mx-auto max-w-3xl space-y-8 py-4">
      <header className="space-y-3">
        <div className="flex items-center gap-2 text-violet-600">
          <RefreshCw className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-[0.14em]">Dear Our Future</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Chính sách hoàn tiền
        </h1>
        <p className="text-sm text-slate-500">Cập nhật lần cuối: {LAST_UPDATED}</p>
        <p className="text-sm leading-7 text-slate-600 dark:text-slate-400">
          Dear Our Future cho phép hoàn tiền thủ công cho gói Plus trong một số trường hợp hợp lý. Quy trình này không
          tự động trừ tiền qua cổng thanh toán: bạn gửi yêu cầu, đội ngũ hỗ trợ kiểm tra, admin duyệt và chuyển khoản
          lại vào tài khoản ngân hàng bạn cung cấp.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-[var(--r-card)] border border-emerald-100 bg-emerald-50/70 p-4">
          <BadgeCheck className="h-5 w-5 text-emerald-700" />
          <p className="mt-3 text-sm font-semibold text-emerald-950">Có hoàn tiền</p>
          <p className="mt-1 text-xs leading-5 text-emerald-800">Xét duyệt thủ công, không tự động.</p>
        </div>
        <div className="rounded-[var(--r-card)] border border-sky-100 bg-sky-50/70 p-4">
          <Clock className="h-5 w-5 text-sky-700" />
          <p className="mt-3 text-sm font-semibold text-sky-950">3-7 ngày làm việc</p>
          <p className="mt-1 text-xs leading-5 text-sky-800">Thời gian xử lý sau khi nhận đủ thông tin.</p>
        </div>
        <div className="rounded-[var(--r-card)] border border-violet-100 bg-violet-50/70 p-4">
          <ReceiptText className="h-5 w-5 text-violet-700" />
          <p className="mt-3 text-sm font-semibold text-violet-950">Cần mã đơn hàng</p>
          <p className="mt-1 text-xs leading-5 text-violet-800">Mã đơn giúp đối chiếu thanh toán chính xác.</p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">1. Điều kiện hoàn tiền</h2>
        <p className="text-sm leading-7 text-slate-600 dark:text-slate-400">
          Chúng tôi cho phép hoàn tiền trong <strong>{refundWindowDays} ngày</strong> kể từ ngày thanh toán nếu bạn chưa
          sử dụng quá <strong>{refundMaxUsedPercent}%</strong> chu kỳ Plus hiện tại. Với gói 12 tuần, mức sử dụng được
          ước tính theo thời gian đã trôi qua trong chu kỳ và thông tin vận hành liên quan đến đơn hàng.
        </p>
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-7 text-slate-600 dark:text-slate-400">
          <li>Đơn hàng phải ở trạng thái đã thanh toán.</li>
          <li>Email tài khoản cần được xác minh để chúng tôi đối chiếu đúng chủ tài khoản.</li>
          <li>Mỗi đơn hàng chỉ nên có một yêu cầu hoàn tiền đang chờ xử lý tại một thời điểm.</li>
          <li>Chúng tôi có thể từ chối yêu cầu nếu phát hiện lạm dụng, gian lận hoặc thông tin chuyển khoản không khớp.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">2. Cách gửi yêu cầu</h2>
        <p className="text-sm leading-7 text-slate-600 dark:text-slate-400">
          Cách nhanh nhất là mở trang <Link to="/billing/plan" className="font-medium text-violet-600 underline underline-offset-2 hover:text-violet-800">Gói & thanh toán</Link>, chọn đơn hàng đã thanh toán còn trong thời hạn và bấm
          <strong> “Yêu cầu hoàn tiền”</strong>. Biểu mẫu sẽ tự điền mã đơn hàng, bạn chỉ cần bổ sung lý do, email liên hệ
          và tài khoản ngân hàng nhận tiền hoàn.
        </p>
        <p className="text-sm leading-7 text-slate-600 dark:text-slate-400">
          Nếu không mở được ứng dụng, gửi email đến{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-violet-600 underline underline-offset-2 hover:text-violet-800">
            {SUPPORT_EMAIL}
          </a>{" "}
          kèm mã đơn hàng, email tài khoản, lý do hoàn tiền và tài khoản ngân hàng nhận hoàn tiền theo định dạng
          “Ngân hàng - Số TK - Chủ TK”.
        </p>
      </section>

      <section className="space-y-3 rounded-[var(--r-card)] border border-amber-100 bg-amber-50/70 p-5">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-amber-950">
          <Mail className="h-5 w-5" />
          Quy trình xử lý thủ công
        </h2>
        <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-7 text-amber-900">
          <li>Bạn gửi yêu cầu hoàn tiền trong ứng dụng hoặc qua email hỗ trợ.</li>
          <li>Admin kiểm tra đơn hàng, trạng thái thanh toán, thời hạn và mức sử dụng chu kỳ.</li>
          <li>Nếu được duyệt, admin chuyển khoản hoàn tiền thủ công vào tài khoản bạn cung cấp.</li>
          <li>Hệ thống gửi email cập nhật khi yêu cầu đã được xử lý hoặc bị từ chối.</li>
        </ol>
        <p className="text-xs leading-5 text-amber-800">
          Thời gian xử lý thông thường: 3-7 ngày làm việc sau khi chúng tôi nhận đủ thông tin đối chiếu.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">3. Hủy gói và chu kỳ chưa dùng</h2>
        <p className="text-sm leading-7 text-slate-600 dark:text-slate-400">
          Hiện tại Plus không tự động gia hạn, nên không có thao tác hủy auto-renewal qua cổng thanh toán. Nếu bạn không
          muốn tiếp tục sử dụng, bạn có thể bấm <strong>“Tôi không muốn dùng nữa”</strong> trong trang gói để ghi nhận ý
          định ngừng dùng. Nếu đơn hàng vẫn còn trong thời hạn hoàn tiền, bạn có thể gửi <strong>“Yêu cầu hoàn tiền cho
          chu kỳ chưa dùng”</strong> để đội ngũ hỗ trợ xét duyệt thủ công.
        </p>
      </section>

      <footer className="border-t border-slate-200 pt-6 dark:border-slate-700">
        <div className="flex flex-wrap gap-4 text-sm">
          <Link to="/terms" className="font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline dark:text-slate-400 dark:hover:text-slate-200">
            Điều khoản dịch vụ
          </Link>
          <Link to="/privacy" className="font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline dark:text-slate-400 dark:hover:text-slate-200">
            Chính sách bảo mật
          </Link>
          <Link to="/billing/plan" className="font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline dark:text-slate-400 dark:hover:text-slate-200">
            Gói & thanh toán
          </Link>
        </div>
      </footer>
    </article>
  );
}
