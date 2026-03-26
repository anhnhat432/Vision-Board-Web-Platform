import { useEffect } from "react";
import { useNavigate } from "react-router";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

export function TwelveWeekPlanOverview() {
  const navigate = useNavigate();

  useEffect(() => {
    const timeoutId = window.setTimeout(() => navigate("/12-week-system", { replace: true }), 900);
    return () => window.clearTimeout(timeoutId);
  }, [navigate]);

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>Tổng quan cũ</CardTitle>
        <CardDescription>
          Tổng quan cũ đã được thay bằng trung tâm 12 tuần.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-slate-500">
        Route này chỉ được giữ lại để tự động đưa dữ liệu legacy về flow mới.
      </CardContent>
    </Card>
  );
}
