import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { BellRing, Sparkles, X } from "lucide-react";
import { motion } from "motion/react";

import { getInAppReminders, getRandomMotivationalQuote } from "../utils/storage";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";

function getReminderActionLabel(kind: "tasks" | "review" | "check-in"): string {
  if (kind === "review") return "Mở review tuần";
  if (kind === "check-in") return "Mở check-in";
  return "Mở việc hôm nay";
}

export function MotivationalReminder() {
  const navigate = useNavigate();
  const [quote, setQuote] = useState("");
  const [showReminder, setShowReminder] = useState(false);
  const [reminder] = useState(() => getInAppReminders()[0] ?? null);

  useEffect(() => {
    const lastReminderDate = localStorage.getItem("last_reminder_date");
    const today = new Date().toDateString();

    if (lastReminderDate !== today) {
      setQuote(getRandomMotivationalQuote());
      setShowReminder(true);
      localStorage.setItem("last_reminder_date", today);

      const timeoutId = window.setTimeout(() => setShowReminder(false), 12000);
      return () => {
        window.clearTimeout(timeoutId);
      };
    }
  }, []);

  if (!showReminder) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed bottom-6 right-6 z-50 max-w-md"
      role="status"
      aria-live="polite"
    >
      <Card className="border-0 bg-[linear-gradient(135deg,_rgba(15,23,42,0.98)_0%,_rgba(14,116,144,0.92)_100%)] text-white shadow-2xl">
        <CardContent className="space-y-4 p-4">
          {reminder ? (
            <div className="flex items-start gap-3">
              <BellRing className="mt-1 h-6 w-6 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{reminder.title}</p>
                <p className="mt-1 text-sm text-white/82">{reminder.description}</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 border-white/18 bg-white text-slate-900 hover:bg-white/92"
                  onClick={() => {
                    setShowReminder(false);
                    if (reminder.goalId) {
                      localStorage.setItem("latest_12_week_goal_id", reminder.goalId);
                      localStorage.setItem("latest_12_week_system_goal_id", reminder.goalId);
                    }
                    navigate(reminder.href);
                  }}
                >
                  {getReminderActionLabel(reminder.kind)}
                </Button>
              </div>
              <button
                onClick={() => setShowReminder(false)}
                className="rounded-full p-1 text-white/80 transition hover:bg-white/10 hover:text-white"
                aria-label="Đóng nhắc việc"
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <Sparkles className="mt-1 h-6 w-6 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">Cảm hứng hôm nay</p>
                <p className="text-sm italic text-white/90">"{quote}"</p>
              </div>
              <button
                onClick={() => setShowReminder(false)}
                className="rounded-full p-1 text-white/80 transition hover:bg-white/10 hover:text-white"
                aria-label="Đóng thông điệp"
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
