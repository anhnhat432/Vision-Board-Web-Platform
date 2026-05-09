import { ArrowLeft, Save, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import { PageShell } from "../components/PageShell";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { getUserData, saveUserData } from "../utils/storage";
import type { AspirationalVisionArea } from "../utils/storage-types";

const LIFE_AREA_FIELDS: Array<{ area: AspirationalVisionArea; label: string; placeholder: string }> = [
  {
    area: "health",
    label: "Sức khoẻ",
    placeholder: "Ví dụ: Tôi có sức bền tốt, ngủ đủ và duy trì vận động đều.",
  },
  {
    area: "career",
    label: "Sự nghiệp",
    placeholder: "Ví dụ: Tôi làm việc sâu, tạo ra sản phẩm có giá trị và giữ nhịp học hỏi.",
  },
  {
    area: "relationships",
    label: "Mối quan hệ",
    placeholder: "Ví dụ: Tôi hiện diện hơn với những người quan trọng.",
  },
  {
    area: "finance",
    label: "Tài chính",
    placeholder: "Ví dụ: Tôi có quỹ dự phòng và dòng tiền ổn định hơn.",
  },
  {
    area: "personal",
    label: "Phát triển cá nhân",
    placeholder: "Ví dụ: Tôi đọc, viết và luyện kỹ năng đều đặn.",
  },
  {
    area: "family",
    label: "Gia đình",
    placeholder: "Ví dụ: Tôi có nhịp sống gia đình ấm và bền hơn.",
  },
  {
    area: "other",
    label: "Khác",
    placeholder: "Một mảng quan trọng khác trong 3 năm tới.",
  },
];

function createVisionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `vision_${crypto.randomUUID()}`;
  }
  return `vision_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function AspirationalVision() {
  const navigate = useNavigate();
  const storedVision = useMemo(() => getUserData().aspirationalVision, []);
  const [summary, setSummary] = useState(storedVision?.summary ?? "");
  const [horizonYears, setHorizonYears] = useState<3 | 5>(storedVision?.horizonYears ?? 3);
  const [statements, setStatements] = useState<Record<AspirationalVisionArea, string>>(() => {
    const entries = Object.fromEntries(LIFE_AREA_FIELDS.map(({ area }) => [area, ""])) as Record<
      AspirationalVisionArea,
      string
    >;
    for (const item of storedVision?.lifeAreas ?? []) {
      entries[item.area] = item.statement;
    }
    return entries;
  });
  const [showError, setShowError] = useState(false);

  const trimmedSummary = summary.trim();
  const lifeAreas = LIFE_AREA_FIELDS.map(({ area }) => ({
    area,
    statement: statements[area].trim(),
  })).filter((item) => item.statement.length > 0);
  const canSave = trimmedSummary.length >= 20 && lifeAreas.length > 0;

  const updateStatement = (area: AspirationalVisionArea, value: string) => {
    setStatements((previous) => ({
      ...previous,
      [area]: value,
    }));
  };

  const handleSubmit = () => {
    if (!canSave) {
      setShowError(true);
      return;
    }

    const data = getUserData();
    const now = new Date().toISOString();
    const previousVision = data.aspirationalVision;
    data.aspirationalVision = {
      id: previousVision?.id ?? createVisionId(),
      horizonYears,
      summary: trimmedSummary,
      lifeAreas,
      createdAt: previousVision?.createdAt ?? now,
      updatedAt: now,
    };
    saveUserData(data);
    toast.success("Đã lưu tầm nhìn 3 năm", {
      description: "Bạn có thể quay lại sửa bất cứ lúc nào từ Dashboard.",
    });
    navigate("/");
  };

  return (
    <PageShell maxWidth="hero" className="space-y-6 page-enter">
      <Card className="border border-slate-200 bg-white/94 shadow-sm">
        <CardHeader className="space-y-3">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
            <Sparkles className="h-3.5 w-3.5" />
            Discipline #4
          </div>
          <div>
            <CardTitle className="text-2xl">Tầm nhìn 3 năm</CardTitle>
            <CardDescription className="mt-2 max-w-3xl leading-7">
              Viết phần aspirational vision riêng với mục tiêu 12 tuần. Phần này không bắt buộc, nhưng giúp mỗi cycle ngắn hạn bám vào một hướng dài hơn.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="aspirational-summary">Tóm tắt tầm nhìn 3 năm</Label>
            <Textarea
              id="aspirational-summary"
              rows={4}
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              placeholder="Viết 2-4 câu về con người, công việc và nhịp sống bạn muốn có trong 3 năm tới."
              aria-invalid={showError && trimmedSummary.length < 20}
              aria-describedby={showError && trimmedSummary.length < 20 ? "aspirational-summary-error" : undefined}
            />
            {showError && trimmedSummary.length < 20 ? (
              <p id="aspirational-summary-error" role="alert" className="text-xs font-medium text-rose-700">
                Viết tóm tắt tầm nhìn rõ hơn trước khi lưu.
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-900">Khoảng thời gian</p>
            <div className="flex flex-wrap gap-2">
              {[3, 5].map((year) => (
                <button
                  key={year}
                  type="button"
                  aria-pressed={horizonYears === year}
                  onClick={() => setHorizonYears(year as 3 | 5)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium ${
                    horizonYears === year
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                >
                  {year} năm
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <h2 className="text-base font-semibold text-slate-950">Các mảng đời sống</h2>
              <p className="mt-1 text-sm text-slate-600">Điền ít nhất một mảng. Các mảng còn lại có thể để trống.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {LIFE_AREA_FIELDS.map(({ area, label, placeholder }) => (
                <div key={area} className="space-y-2">
                  <Label htmlFor={`aspirational-${area}`}>{label}</Label>
                  <Textarea
                    id={`aspirational-${area}`}
                    rows={3}
                    value={statements[area]}
                    onChange={(event) => updateStatement(area, event.target.value)}
                    placeholder={placeholder}
                  />
                </div>
              ))}
            </div>
            {showError && lifeAreas.length === 0 ? (
              <p role="alert" className="text-xs font-medium text-rose-700">
                Điền ít nhất một mảng đời sống để tầm nhìn có điểm neo.
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row">
            <Button type="button" className="w-full sm:w-auto" onClick={handleSubmit}>
              <Save className="h-4 w-4" />
              Lưu tầm nhìn 3 năm
            </Button>
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4" />
              Bỏ qua
            </Button>
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}
