import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { BellRing, Sparkles, X } from "lucide-react";
import { motion } from "motion/react";

import { getInAppReminders, getRandomMotivationalQuote } from "../utils/storage";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";

const QUOTE_SUPPRESSED_ROUTES = [
  "/onboarding",
  "/life-balance",
  "/life-insight",
  "/smart-goal-setup",
  "/feasibility",
  "/12-week-setup",
  "/12-week-system",
];

const REMINDER_OVERLAY_SUPPRESSED_ROUTES = [
  "/billing",
  "/feasibility",
  "/gallery",
  "/goals",
  "/journal",
  "/life-balance",
  "/life-insight",
  "/login",
  "/smart-goal-setup",
  "/vision-board",
  "/12-week-setup",
];

function getReminderActionLabel(kind: "tasks" | "review" | "check-in"): string {
  if (kind === "review") return "Mở review tuần";
  if (kind === "check-in") return "Mở check-in";
  return "Mở việc hôm nay";
}

export function MotivationalReminder() {
  const navigate = useNavigate();
  const location = useLocation();
  const [quote, setQuote] = useState("");
  const [showReminder, setShowReminder] = useState(false);
  const [reminder] = useState(() => getInAppReminders()[0] ?? null);

  useEffect(() => {
    const suppressReminderOverlay = REMINDER_OVERLAY_SUPPRESSED_ROUTES.some((route) =>
      location.pathname.startsWith(route),
    );

    if (suppressReminderOverlay) {
      setShowReminder(false);
      return;
    }

    const isOnReminderTarget =
      reminder &&
      (location.pathname === reminder.href || (reminder.href !== "/" && location.pathname.startsWith(`${reminder.href}/`)));

    if (isOnReminderTarget) {
      // The destination page already shows the same task/review prompt; a fixed card blocks the first mobile viewport.
      setShowReminder(false);
      return;
    }

    const suppressQuoteOnlyReminder =
      !reminder && QUOTE_SUPPRESSED_ROUTES.some((route) => location.pathname.startsWith(route));

    if (suppressQuoteOnlyReminder) {
      setShowReminder(false);
      return;
    }

    const lastReminderDate = localStorage.getItem("last_reminder_date");
    const today = new Date().toDateString();

    if (lastReminderDate !== today) {
      setQuote(getRandomMotivationalQuote());
      setShowReminder(true);
      localStorage.setItem("last_reminder_date", today);
    }
  }, [location.pathname, reminder]);

  if (!showReminder) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed bottom-4 left-3 right-3 z-50 sm:bottom-6 sm:left-auto sm:right-6 sm:w-full sm:max-w-sm"
      role="status"
      aria-live="polite"
    >
      <Card className="max-w-full overflow-hidden rounded-xl border border-white/10 gradient-dark-teal text-white shadow-lg">
        <CardContent className="space-y-2.5 p-3 sm:space-y-3 sm:p-4">
          {reminder ? (
            <div className="flex items-start gap-2.5">
              <BellRing className="mt-1 h-5 w-5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="break-words font-semibold">{reminder.title}</p>
                <p className="mt-1 hidden line-clamp-2 break-words text-sm text-white/82 sm:block">{reminder.description}</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="hero-cta mt-2 h-10 border-white/18 bg-white px-3 text-xs text-slate-900 hover:bg-white/92"
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
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
                aria-label="Đóng nhắc việc"
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-start gap-2.5">
              <Sparkles className="mt-1 h-5 w-5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">Cảm hứng hôm nay</p>
                <p className="line-clamp-2 text-sm italic text-white/90">"{quote}"</p>
              </div>
              <button
                onClick={() => setShowReminder(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
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
