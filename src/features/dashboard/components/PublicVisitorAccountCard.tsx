import { CheckCircle2, LogIn, UserPlus } from "lucide-react";

import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";

interface PublicVisitorAccountCardProps {
  onSignIn: () => void;
  onSignUp: () => void;
}

const ACCOUNT_BENEFITS = [
  "Demo hiện lưu dữ liệu trên trình duyệt này.",
  "Tài khoản/sync là lớp sau, không bắt buộc để trải nghiệm core flow.",
  "Hãy export dữ liệu nếu muốn giữ một bản sao trước khi đổi máy.",
];

export function PublicVisitorAccountCard({ onSignIn, onSignUp }: PublicVisitorAccountCardProps) {
  return (
    <Card
      data-tour-id="dashboard-plan-card"
      className="border border-slate-200/80 bg-white/92 shadow-[0_18px_44px_-36px_rgba(15,23,42,0.32)]"
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-950">
          <UserPlus className="h-5 w-5" />
          Tài khoản là tùy chọn cho demo
        </CardTitle>
        <CardDescription className="text-slate-600">
          Bạn có thể dùng thử không cần đăng nhập. Đăng ký hoặc đăng nhập chỉ dành cho lớp lưu/sync sau này.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
          {ACCOUNT_BENEFITS.map((benefit) => (
            <div key={benefit} className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <p className="text-sm leading-6 text-slate-700">{benefit}</p>
            </div>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button className="bg-slate-950 text-white hover:bg-slate-800" onClick={onSignUp}>
            <UserPlus className="h-4 w-4" />
            Đăng ký để sync sau
          </Button>
          <Button variant="outline" className="border-slate-200 bg-white text-slate-900" onClick={onSignIn}>
            <LogIn className="h-4 w-4" />
            Đăng nhập
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
