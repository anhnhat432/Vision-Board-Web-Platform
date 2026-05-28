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
    label: "S?c kho?",
    placeholder: "Ví d?: Tôi có s?c b?n t?t, ng? d? và duy trì v?n d?ng d?u.",
  },
  {
    area: "career",
    label: "S? nghi?p",
    placeholder: "Ví d?: Tôi làm vi?c sâu, t?o ra s?n ph?m có giá tr? và gi? nh?p h?c h?i.",
  },
  {
    area: "relationships",
    label: "M?i quan h?",
    placeholder: "Ví d?: Tôi hi?n di?n hon v?i nh?ng ngu?i quan tr?ng.",
  },
  {
    area: "finance",
    label: "Tài chính",
    placeholder: "Ví d?: Tôi có qu? d? phòng và dòng ti?n ?n d?nh hon.",
  },
  {
    area: "personal",
    label: "Phát tri?n cá nhân",
    placeholder: "Ví d?: Tôi d?c, vi?t và luy?n k? nang d?u d?n.",
  },
  {
    area: "family",
    label: "Gia dình",
    placeholder: "Ví d?: Tôi có nh?p s?ng gia dình ?m và b?n hon.",
  },
  {
    area: "other",
    label: "Khác",
    placeholder: "M?t m?ng quan tr?ng khác trong 3 nam t?i.",
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
  if (Number.isNaN(date.getTime())) return "CHUA RÕ NGÀY";
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
    toast.success(`Ðã luu t?m nhìn ${horizonYears} nam`, {
      description: "B?n có th? quay l?i s?a b?t c? lúc nào t? Trang chính.",
    });
    navigate("/");
  };

  return (
    <div className="mx-auto max-w-4xl px-4 pb-12 pt-8 sm:px-6 lg:px-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-ink-muted">T?M NHÌN</p>
        <h1 className="mt-3 font-serif text-4xl font-medium leading-tight tracking-tight text-app-ink">
          T?m nhìn 3 nam c?a b?n
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-app-ink-soft">
          Ð?nh hình b?c tranh dài h?n d? m?i chu k? 12 tu?n d?u ph?c v? di?u này.
        </p>
      </header>

      <section
        className="mt-6 rounded-card border border-app-warm-border bg-app-warm-soft p-6 md:p-8"
        aria-label="Bi?u m?u t?m nhìn"
      >
        <div className="max-w-3xl">
          <p className="font-serif text-xl font-medium leading-7 text-app-warm-strong">
            Trong 3 nam t?i, b?n mu?n cu?c s?ng mình trông nhu th? nào?
          </p>
          <p className="mt-2 text-sm leading-6 text-app-warm-strong">
            Vi?t ch?m, c? th? v?a d?. T?m nhìn này là di?m neo, không ph?i cam k?t ph?i hoàn h?o.
          </p>
        </div>

        <div className="mt-6 space-y-5">
          <div>
            <label htmlFor="aspirational-summary" className={labelClass}>
              Tóm t?t t?m nhìn {horizonYears} nam
            </label>
            <Textarea
              id="aspirational-summary"
              rows={4}
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              placeholder="Vi?t 2-4 câu v? con ngu?i, công vi?c và nh?p s?ng b?n mu?n có trong 3 nam t?i."
              aria-invalid={showError && trimmedSummary.length < 20}
              aria-describedby={showError && trimmedSummary.length < 20 ? "aspirational-summary-error" : undefined}
              className={warmTextareaClass}
            />
            {showError && trimmedSummary.length < 20 ? (
              <p id="aspirational-summary-error" role="alert" className={errorTextClass}>
                Vi?t tóm t?t t?m nhìn rõ hon tru?c khi luu.
              </p>
            ) : (
              <p className={helperTextClass}>T?i thi?u 20 ký t? d? ph?n này d? rõ khi quay l?i l?p k? ho?ch.</p>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-app-ink">Kho?ng th?i gian</p>
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
                    {year} nam
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div>
              <h2 className="text-base font-semibold text-app-ink">Các m?ng d?i s?ng</h2>
              <p className="mt-1 text-sm leading-6 text-app-warm-strong">
                Ði?n ít nh?t m?t m?ng. Các m?ng còn l?i có th? d? tr?ng.
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
                Ði?n ít nh?t m?t m?ng d?i s?ng d? t?m nhìn có di?m neo.
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 border-t border-app-warm-border pt-5 sm:flex-row">
            <Button
              type="button"
              className="w-full bg-app-warm text-white hover:bg-app-warm-hover focus-visible:ring-app-warm/30 sm:w-auto"
              onClick={handleSubmit}
            >
              <Save className="h-4 w-4" />
              Luu t?m nhìn
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full border-app-warm-border bg-app-surface text-app-warm-strong focus-visible:ring-app-warm/30 sm:w-auto"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="h-4 w-4" />
              B? qua
            </Button>
          </div>
        </div>
      </section>

      {storedVision ? (
        <section className="mt-8" aria-label="T?m nhìn dã luu tru?c dó">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-ink-muted">ÐÃ LUU TRU?C</p>
            <h2 className="mt-1 text-base font-semibold text-app-ink">B?n tóm t?t g?n nh?t</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <article className="surface-raised rounded-xl border border-app-line bg-app-surface p-5 md:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-app-ink-muted">
                C?P NH?T {formatVisionDate(storedVision.updatedAt)}
              </p>
              <p className="mt-3 font-serif text-sm italic leading-7 text-app-ink">"{storedVision.summary}"</p>
            </article>
            {storedVision.lifeAreas.map((item) => (
              <article key={item.area} className="surface-raised rounded-xl border border-app-line bg-app-surface p-5">
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
