import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { CheckCircle2, ArrowRight, Target, CalendarDays } from "lucide-react";
import { motion } from "motion/react";
import { getUserData, Goal } from "../utils/storage";

export function TwelveWeekPlanOverview() {
  const navigate = useNavigate();
  const hasInitializedRef = useRef(false);
  const [goal, setGoal] = useState<Goal | null>(null);

  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    const goalId = localStorage.getItem("latest_12_week_goal_id");
    if (!goalId) {
      navigate("/goals");
      return;
    }

    const data = getUserData();
    const matchedGoal = data.goals.find((item) => item.id === goalId && item.twelveWeekPlan);

    if (!matchedGoal) {
      navigate("/goals");
      return;
    }

    setGoal(matchedGoal);
  }, [navigate]);

  if (!goal || !goal.twelveWeekPlan) return null;

  const weekProgress = Math.round((goal.twelveWeekPlan.currentWeek / goal.twelveWeekPlan.totalWeeks) * 100);

  return (
    <div className="min-h-screen bg-[#FDF2F8] flex items-center justify-center p-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-3xl"
      >
        <Card className="bg-white rounded-3xl shadow-2xl border-0">
          <CardHeader className="text-center space-y-4 pb-6">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-3xl">Your 12-Week Plan Is Ready</CardTitle>
            <p className="text-gray-600">Here is your complete output from SMART goal to execution plan.</p>
          </CardHeader>

          <CardContent className="space-y-6 p-8">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="border-2">
                <Target className="w-3 h-3 mr-1" />
                Focus Area: {goal.focusArea || goal.category}
              </Badge>
              {goal.feasibilityResult && (
                <Badge variant="outline" className="border-2">
                  <CalendarDays className="w-3 h-3 mr-1" />
                  Feasibility: {goal.feasibilityResult}
                </Badge>
              )}
            </div>

            <div className="bg-gray-50 rounded-2xl p-5 space-y-2">
              <p className="text-xs uppercase tracking-wide text-gray-500">SMART Goal</p>
              <p className="font-semibold text-gray-800">{goal.title}</p>
            </div>

            <div className="bg-gray-50 rounded-2xl p-5 space-y-2">
              <p className="text-xs uppercase tracking-wide text-gray-500">Week 12 Outcome</p>
              <p className="font-medium text-gray-800">{goal.twelveWeekPlan.week12Outcome}</p>
            </div>

            <div className="bg-gray-50 rounded-2xl p-5 space-y-3">
              <p className="text-xs uppercase tracking-wide text-gray-500">Weekly Actions</p>
              <ul className="space-y-2 text-sm text-gray-800">
                {goal.twelveWeekPlan.weeklyActions.map((action, index) => (
                  <li key={`${goal.id}_action_${index}`} className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-purple-500" />
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Success Metric</p>
                <p className="text-sm font-medium text-gray-800">{goal.twelveWeekPlan.successMetric}</p>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Review Day</p>
                <p className="text-sm font-medium text-gray-800">{goal.twelveWeekPlan.reviewDay}</p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between text-sm text-gray-700">
                <span>Week Progress</span>
                <span className="font-semibold">Week {goal.twelveWeekPlan.currentWeek} of {goal.twelveWeekPlan.totalWeeks}</span>
              </div>
              <Progress value={weekProgress} className="h-2" />
            </div>

            <Button
              className="w-full h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-2xl shadow-lg"
              onClick={() => navigate("/goals")}
            >
              Go to Goal Tracker
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
