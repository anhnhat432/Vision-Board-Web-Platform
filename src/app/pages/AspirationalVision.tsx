import { ArrowLeft, Save } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { errorTextClass, helperTextClass, labelClass, textareaClass } from "./SMARTGoalSetup/components/formStyles";
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

const warmTextareaClass = `${textareaClass} border-app-warm-border focus-visible:border-app-warm focus-visible:ring-app-warm/30`;

function createVisionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `vision_${crypto.randomUUID()}`;
  }
  return `vision_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function formatVisionDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "CHƯA RÕ NGÀY";
  return date.toLocaleDateString("vi-VN").toLocaleUpperCase("vi-VN");
}

function getAreaLabel(area: AspirationalVisionArea): string {
  return LIFE_AREA_FIELDS.find((field) => field.area === area)?.label ?? "Khác";
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
    toast.success(`Đã lưu tầm nhìn ${horizonYears} năm`, {
      description: "Bạn có thể quay lại sửa bất cứ lúc nào từ Trang chính.",
    });
    navigate("/");
  };

  return (
    <div className="mx-auto max-w-4xl px-4 pb-12 pt-8 sm:px-6 lg:px-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-ink-muted">TẦM NHÌN</p>
        <h1 className="mt-3 font-serif text-4xl font-medium leading-tight tracking-tight text-app-ink">
          Tầm nhìn 3 năm của bạn
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-app-ink-soft">
          Định hình bức tranh dài hạn để mỗi chu kỳ 12 tuần đều phục vụ điều này.
        </p>
      </header>

      <section
        className="mt-6 rounded-card border border-app-warm-border bg-app-warm-soft p-6 md:p-8"
        aria-label="Biểu mẫu tầm nhìn"
      >
        <div className="max-w-3xl">
          <p className="font-serif text-xl font-medium leading-7 text-app-warm-strong">
            Trong 3 năm tới, bạn muốn cuộc sống mình trông như thế nào?
          </p>
          <p className="mt-2 text-sm leading-6 text-[#6F4A3C]">
            Viết chậm, cụ thể vừa đủ. Tầm nhìn này là điểm neo, không phải cam kết phải hoàn hảo.
          </p>
        </div>

        <div className="mt-6 space-y-5">
          <div>
            <label htmlFor="aspirational-summary" className={labelClass}>
              Tóm tắt tầm nhìn {horizonYears} năm
            </label>
            <Textarea
              id="aspirational-summary"
              rows={4}
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              placeholder="Viết 2-4 câu về con người, công việc và nhịp sống bạn muốn có trong 3 năm tới."
              aria-invalid={showError && trimmedSummary.length < 20}
              aria-describedby={showError && trimmedSummary.length < 20 ? "aspirational-summary-error" : undefined}
              className={warmTextareaClass}
            />
            {showError && trimmedSummary.length < 20 ? (
              <p id="aspirational-summary-error" role="alert" className={errorTextClass}>
                Viết tóm tắt tầm nhìn rõ hơn trước khi lưu.
              </p>
            ) : (
              <p className={helperTextClass}>Tối thiểu 20 ký tự để phần này đủ rõ khi quay lại lập kế hoạch.</p>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-app-ink">Khoảng thời gian</p>
            <div className="flex flex-wrap gap-2">
              {[3, 5].map((year) => {
                const selected = horizonYears === year;
                return (
                  <button
                    key={year}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setHorizonYears(year as 3 | 5)}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-warm/30 ${
                      selected
                        ? "border-app-warm bg-app-warm text-white"
                        : "border-app-warm-border bg-app-surface text-app-warm-strong hover:border-app-warm"
                    }`}
                  >
                    {year} năm
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div>
              <h2 className="text-base font-semibold text-app-ink">Các mảng đời sống</h2>
              <p className="mt-1 text-sm leading-6 text-[#6F4A3C]">
                Điền ít nhất một mảng. Các mảng còn lại có thể để trống.
              </p>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {LIFE_AREA_FIELDS.map(({ area, label, placeholder }) => (
                <div key={area}>
                  <label htmlFor={`aspirational-${area}`} className={labelClass}>
                    {label}
                  </label>
                  <Textarea
                    id={`aspirational-${area}`}
                    rows={3}
                    value={statements[area]}
                    onChange={(event) => updateStatement(area, event.target.value)}
                    placeholder={placeholder}
                    className={warmTextareaClass}
                  />
                </div>
              ))}
            </div>
            {showError && lifeAreas.length === 0 ? (
              <p role="alert" className={errorTextClass}>
                Điền ít nhất một mảng đời sống để tầm nhìn có điểm neo.
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 border-t border-app-warm-border pt-5 sm:flex-row">
            <Button
              type="button"
              className="w-full bg-app-warm text-white hover:bg-[#C76548] focus-visible:ring-app-warm/30 sm:w-auto"
              onClick={handleSubmit}
            >
              <Save className="h-4 w-4" />
              Lưu tầm nhìn
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full border-app-warm-border bg-app-surface text-app-warm-strong focus-visible:ring-app-warm/30 sm:w-auto"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="h-4 w-4" />
              Bỏ qua
            </Button>
          </div>
        </div>
      </section>

      {storedVision ? (
        <section className="mt-8" aria-label="Tầm nhìn đã lưu trước đó">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-ink-muted">ĐÃ LƯU TRƯỚC</p>
            <h2 className="mt-1 text-base font-semibold text-app-ink">Bản tóm tắt gần nhất</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <article className="rounded-card border border-app-line bg-app-surface p-5 md:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-app-ink-muted">
                CẬP NHẬT {formatVisionDate(storedVision.updatedAt)}
              </p>
              <p className="mt-3 font-serif text-sm italic leading-7 text-app-ink">"{storedVision.summary}"</p>
            </article>
            {storedVision.lifeAreas.map((item) => (
              <article key={item.area} className="rounded-card border border-app-line bg-app-surface p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-app-ink-muted">
                  {getAreaLabel(item.area)}
                </p>
                <p className="mt-3 font-serif text-sm italic leading-7 text-app-ink">"{item.statement}"</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
