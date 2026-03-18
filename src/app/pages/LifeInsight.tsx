import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { getUserData, LifeArea } from "../utils/storage";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { ArrowRight, TrendingDown } from "lucide-react";
import { motion } from "motion/react";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from "recharts";

export function LifeInsight() {
  const navigate = useNavigate();
  const [lowestArea, setLowestArea] = useState<LifeArea | null>(null);
  const [radarData, setRadarData] = useState<any[]>([]);

  useEffect(() => {
    const data = getUserData();

    // Find the lowest scoring life area
    const lowest = data.currentWheelOfLife.reduce((min, area) =>
      area.score < min.score ? area : min
    );

    setLowestArea(lowest);

    // Prepare radar chart data
    const chartData = data.currentWheelOfLife.map(area => ({
      subject: area.name,
      value: area.score,
      fullMark: 10,
    }));

    setRadarData(chartData);
  }, []);

  if (!lowestArea) return null;

  const handleStartGoalSetup = () => {
    // Store the selected area for the next screens
    localStorage.setItem('selected_focus_area', lowestArea.name);
    navigate('/smart-goal-setup');
  };

  return (
    <div className="min-h-screen bg-[#FDF2F8] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-3xl"
      >
        <Card className="bg-white rounded-3xl shadow-2xl border-0">
          <CardHeader className="text-center space-y-4 pb-6">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
              <TrendingDown className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-4xl">Your Life Insight</CardTitle>
          </CardHeader>

          <CardContent className="space-y-8 p-8">
            {/* Radar Chart Summary */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#d1d5db" />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                    />
                    <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fill: '#9ca3af' }} />
                    <Radar
                      name="Score"
                      dataKey="value"
                      stroke="#8b5cf6"
                      fill="#8b5cf6"
                      fillOpacity={0.3}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Insight Message */}
            <div className="text-center space-y-4">
              <div className="space-y-3">
                <p className="text-xl text-gray-700">
                  Based on your Wheel of Life, your{" "}
                  <span
                    className="font-bold text-2xl px-3 py-1 rounded-lg inline-block"
                    style={{
                      backgroundColor: `${lowestArea.color}20`,
                      color: lowestArea.color
                    }}
                  >
                    {lowestArea.name}
                  </span>
                  {" "}needs the most attention right now.
                </p>

                <p className="text-lg text-gray-600 italic">
                  "Let's turn this into a clear and achievable goal."
                </p>
              </div>

              {/* Score Display */}
              <div className="inline-flex items-center gap-3 bg-gray-50 px-6 py-4 rounded-2xl">
                <span className="text-sm text-gray-600">Current Score:</span>
                <span
                  className="text-4xl font-bold"
                  style={{ color: lowestArea.color }}
                >
                  {lowestArea.score}
                </span>
                <span className="text-sm text-gray-400">/ 10</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <Button
                className="flex-1 h-14 text-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-2xl shadow-lg"
                onClick={handleStartGoalSetup}
              >
                Create SMART Goal
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>

              <Button
                variant="outline"
                className="flex-1 h-14 text-lg border-2 border-gray-300 hover:bg-gray-50 rounded-2xl"
                onClick={() => navigate('/')}
              >
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
