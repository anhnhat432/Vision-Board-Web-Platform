import { HelpCircle, LifeBuoy } from "lucide-react";
import { Link } from "react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { AppPublicFooter } from "../components/layout/AppPublicFooter";

const SUPPORT_EMAIL = import.meta.env.VITE_BILLING_SUPPORT_EMAIL?.trim() || "support@dearourfuture.com";

const FAQ_ITEMS = [
  {
    question: "Làm sao tôi biết đã thanh toán thành công?",
    answer: "Bạn nhận biên nhận qua email + thấy gói Plus trong tài khoản.",
  },
  {
    question: "Tôi chuyển khoản rồi mà chưa nhận Plus?",
    answer: `Thường 1-2 phút. Nếu > 10 phút, liên hệ ${SUPPORT_EMAIL} kèm mã đơn hàng.`,
  },
  {
    question: "Tôi chuyển sai số tiền/sai nội dung thì sao?",
    answer: `Liên hệ ${SUPPORT_EMAIL}, admin sẽ xử lý thủ công.`,
  },
  {
    question: "Hoàn tiền như nào?",
    answer: "Xem chính sách hoàn tiền để biết điều kiện và cách gửi yêu cầu.",
    link: "/refund-policy",
    linkLabel: "Chính sách hoàn tiền",
  },
  {
    question: "Có thuế/VAT không?",
    answer: `Chúng tôi gửi biên nhận điện tử đơn giản. Nếu cần hoá đơn VAT, liên hệ ${SUPPORT_EMAIL}.`,
  },
];

export function BillingFAQPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Card className="overflow-hidden border-app-line bg-app-surface shadow-sm">
        <CardHeader className="border-b border-app-line bg-app-bg">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--r-pill)] bg-app-accent-soft text-app-accent">
              <HelpCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-accent">Thanh toán Plus</p>
              <CardTitle className="mt-2 text-3xl font-semibold tracking-tight text-app-ink">
                Câu hỏi thường gặp
              </CardTitle>
              <CardDescription className="mt-2 max-w-2xl text-sm leading-7 text-app-ink-soft">
                Các câu hỏi hay gặp khi chuyển khoản ngân hàng để nâng cấp Plus.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-5 sm:p-6">
          {FAQ_ITEMS.map((item) => (
            <article key={item.question} className="rounded-[var(--r-card)] border border-app-line bg-app-surface p-5">
              <h2 className="text-lg font-semibold text-app-ink">{item.question}</h2>
              <p className="mt-2 text-sm leading-7 text-app-ink-soft">
                {item.answer}
                {item.link ? (
                  <>
                    {" "}
                    <Link
                      to={item.link}
                      className="font-semibold text-app-accent underline-offset-4 hover:text-app-ink hover:underline"
                    >
                      {item.linkLabel}
                    </Link>
                    .
                  </>
                ) : null}
              </p>
            </article>
          ))}

          <div className="rounded-[var(--r-card)] border border-app-warm-border bg-app-warm/30 p-5">
            <div className="flex gap-3">
              <LifeBuoy className="mt-0.5 h-5 w-5 shrink-0 text-app-warm-strong" />
              <div>
                <p className="text-sm font-semibold text-app-warm-strong">Cần kiểm tra đơn cụ thể?</p>
                <p className="mt-1 text-sm leading-7 text-app-warm-strong/85">
                  Gửi mã đơn hàng tới{" "}
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold underline-offset-4 hover:underline">
                    {SUPPORT_EMAIL}
                  </a>{" "}
                  để đội hỗ trợ kiểm tra thủ công.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <AppPublicFooter />
    </div>
  );
}
