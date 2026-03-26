import { useEffect } from "react";
import { useNavigate } from "react-router";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

export function TwelveWeekPlanSetup() {
  const navigate = useNavigate();

  useEffect(() => {
    const timeoutId = window.setTimeout(() => navigate("/12-week-setup", { replace: true }), 900);
    return () => window.clearTimeout(timeoutId);
  }, [navigate]);

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>Lối vào cũ</CardTitle>
        <CardDescription>
          Bản setup cũ đã được hợp nhất. Bạn sẽ được đưa sang màn thiết lập 12 tuần mới.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-slate-500">
        Route này chỉ còn dùng cho migration và redirect, không còn là luồng tạo kế hoạch chính nữa.
      </CardContent>
    </Card>
  );
}
