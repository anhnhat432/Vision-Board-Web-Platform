import { useEffect, useState } from "react";
import { getRandomMotivationalQuote } from "../utils/storage";
import { Card, CardContent } from "./ui/card";
import { Sparkles } from "lucide-react";
import { motion } from "motion/react";

export function MotivationalReminder() {
  const [quote, setQuote] = useState("");
  const [showReminder, setShowReminder] = useState(false);
  
  useEffect(() => {
    // Check if we should show daily reminder
    const lastReminderDate = localStorage.getItem('last_reminder_date');
    const today = new Date().toDateString();
    
    if (lastReminderDate !== today) {
      setQuote(getRandomMotivationalQuote());
      setShowReminder(true);
      localStorage.setItem('last_reminder_date', today);
      
      // Auto-hide after 10 seconds
      setTimeout(() => setShowReminder(false), 10000);
    }
  }, []);
  
  if (!showReminder) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed bottom-6 right-6 z-50 max-w-md"
    >
      <Card className="bg-gradient-to-br from-purple-500 to-pink-500 text-white border-0 shadow-2xl">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="w-6 h-6 flex-shrink-0 mt-1" />
            <div>
              <p className="font-semibold mb-1">Cảm hứng hôm nay</p>
              <p className="text-sm italic opacity-90">"{quote}"</p>
            </div>
            <button
              onClick={() => setShowReminder(false)}
              className="ml-auto text-white/80 hover:text-white"
            >
              ✕
            </button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
