import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "@/app/components/ui/use-reduced-motion";
import { PET_EVENT_NAME } from "./petEvents";
import { MamCompanionBubble } from "./MamCompanionBubble";
import { usePetPreferences } from "./usePetPreferences";
import type { PetEvent, PetEventPayload } from "./types";

interface MamCompanionProps {
  initialEvent?: PetEvent;
  className?: string;
  compact?: boolean;
  animated?: boolean;
}

const IMPORTANT_EVENTS = new Set<PetEvent>([
  "taskCompleted",
  "dailyFocusCompleted",
  "goalMilestone",
  "weeklyReviewDone",
  "streakIncreased",
  "gentleNudge",
]);

const EVENT_MESSAGES: Record<PetEvent, string> = {
  idle: "",
  welcomeBack: "Mừng bạn quay lại. Mình bắt đầu nhẹ thôi.",
  taskCompleted: "Xong một bước rồi. Mình giữ nhịp nhé.",
  dailyFocusCompleted: "Việc quan trọng nhất hôm nay đã hoàn thành.",
  goalMilestone: "Một mốc nhỏ đã sáng lên.",
  weeklyReviewDone: "Tuần này đang tiến triển tốt.",
  streakIncreased: "Nhịp đều hơn rồi.",
  gentleNudge: "Không sao nếu lệch nhịp. Bắt đầu lại từ một việc nhỏ.",
};

const STATE_CLASS: Record<PetEvent, string> = {
  idle: "mam-pet--idle",
  welcomeBack: "mam-pet--welcome",
  taskCompleted: "mam-pet--happy",
  dailyFocusCompleted: "mam-pet--celebrate",
  goalMilestone: "mam-pet--glow",
  weeklyReviewDone: "mam-pet--proud",
  streakIncreased: "mam-pet--happy",
  gentleNudge: "mam-pet--nudge",
};

function shouldShowBubble(event: PetEvent): boolean {
  return IMPORTANT_EVENTS.has(event);
}

export function MamCompanion({
  initialEvent = "idle",
  className = "",
  compact = false,
  animated = true,
}: MamCompanionProps) {
  const reducedMotion = useReducedMotion();
  const { preferences } = usePetPreferences();
  const [event, setEvent] = useState<PetEvent>(initialEvent);
  const [bubbleMessage, setBubbleMessage] = useState("");
  const bubbleTimerRef = useRef<number | null>(null);
  const idleTimerRef = useRef<number | null>(null);
  const canAnimate = animated && preferences.animationEnabled && !reducedMotion;

  useEffect(() => {
    return () => {
      if (bubbleTimerRef.current) window.clearTimeout(bubbleTimerRef.current);
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const handlePetEvent = (customEvent: Event) => {
      const detail = customEvent instanceof CustomEvent ? (customEvent.detail as PetEventPayload | undefined) : undefined;
      const nextEvent = detail?.event ?? "idle";
      const message = detail?.message ?? EVENT_MESSAGES[nextEvent];

      setEvent(nextEvent);
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = window.setTimeout(() => setEvent("idle"), nextEvent === "dailyFocusCompleted" ? 1900 : 1400);

      if (shouldShowBubble(nextEvent) && message) {
        setBubbleMessage(message);
        if (bubbleTimerRef.current) window.clearTimeout(bubbleTimerRef.current);
        bubbleTimerRef.current = window.setTimeout(() => setBubbleMessage(""), 4200);
      }
    };

    window.addEventListener(PET_EVENT_NAME, handlePetEvent);
    return () => window.removeEventListener(PET_EVENT_NAME, handlePetEvent);
  }, []);

  const petClassName = useMemo(() => {
    const stateClass = canAnimate ? STATE_CLASS[event] : "mam-pet--static";
    return `mam-pet ${stateClass} ${compact ? "mam-pet--compact" : ""}`;
  }, [canAnimate, compact, event]);

  return (
    <div
      className={`flex items-end gap-3 ${compact ? "justify-end" : "justify-between"} ${className}`}
      data-testid="mam-companion"
      data-pet-event={event}
      data-animation-enabled={canAnimate ? "true" : "false"}
    >
      {!compact && bubbleMessage ? <MamCompanionBubble message={bubbleMessage} /> : null}
      <div className={petClassName} aria-label="Mầm, bạn đồng hành mục tiêu" role="img">
        <svg viewBox="0 0 96 112" className="h-full w-full" aria-hidden="true">
          <defs>
            <linearGradient id="mam-body" x1="22" y1="20" x2="76" y2="102" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FFF7DA" />
              <stop offset="1" stopColor="#CFEFA8" />
            </linearGradient>
            <linearGradient id="mam-leaf" x1="42" y1="5" x2="65" y2="37" gradientUnits="userSpaceOnUse">
              <stop stopColor="#D6F277" />
              <stop offset="1" stopColor="#0F6A42" />
            </linearGradient>
          </defs>
          <ellipse className="mam-shadow" cx="48" cy="100" rx="24" ry="5" fill="rgba(15,106,66,0.12)" />
          <path className="mam-stem" d="M49 31 C48 23 47 17 44 10" fill="none" stroke="#21523A" strokeWidth="3.2" strokeLinecap="round" />
          <path className="mam-leaf mam-leaf-left" d="M42 13 C29 8 22 14 21 25 C33 28 41 24 45 16 Z" fill="url(#mam-leaf)" />
          <path className="mam-leaf mam-leaf-right" d="M47 10 C59 2 70 8 72 20 C59 25 50 21 46 14 Z" fill="url(#mam-leaf)" />
          <rect className="mam-body" x="18" y="35" width="60" height="58" rx="22" fill="url(#mam-body)" stroke="#244432" strokeWidth="3.2" />
          <path className="mam-highlight" d="M30 45 C38 39 59 39 67 47" fill="none" stroke="#FFFBEA" strokeWidth="4" strokeLinecap="round" opacity="0.75" />
          <circle className="mam-eye mam-eye-left" cx="39" cy="64" r="3.6" fill="#233629" />
          <circle className="mam-eye mam-eye-right" cx="58" cy="64" r="3.6" fill="#233629" />
          <path className="mam-mouth" d="M43 74 C47 77 52 77 56 74" fill="none" stroke="#43654A" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="31" cy="70" r="4.2" fill="#F3B7A5" opacity="0.55" />
          <circle cx="66" cy="70" r="4.2" fill="#F3B7A5" opacity="0.55" />
          <path className="mam-arm mam-arm-left" d="M18 66 C10 67 9 76 17 79" fill="none" stroke="#244432" strokeWidth="4" strokeLinecap="round" />
          <path className="mam-arm mam-arm-right" d="M78 66 C86 67 87 76 79 79" fill="none" stroke="#244432" strokeWidth="4" strokeLinecap="round" />
          <path className="mam-foot mam-foot-left" d="M32 93 C31 99 37 101 41 96" fill="none" stroke="#244432" strokeWidth="4" strokeLinecap="round" />
          <path className="mam-foot mam-foot-right" d="M58 96 C63 101 69 98 66 92" fill="none" stroke="#244432" strokeWidth="4" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}
