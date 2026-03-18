import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { getUserData, UserData, getRandomMotivationalQuote, calculateGoalProgress } from "../utils/storage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import { Target, TrendingUp, Award, BookOpen, Sparkles, Plus, ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from "recharts";

export function Dashboard() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [quote, setQuote] = useState("");
  
  useEffect(() => {
    const data = getUserData();
    setUserData(data);
    setQuote(getRandomMotivationalQuote());
  }, []);
  
  if (!userData) return null;
  
  const recentGoals = userData.goals.slice(0, 3);
  const recentReflections = userData.reflections.slice(0, 2);
  const latestVisionBoard = userData.visionBoards[userData.visionBoards.length - 1];
  
  const radarData = userData.currentWheelOfLife.map(area => ({
    subject: area.name,
    value: area.score,
    fullMark: 10,
  }));
  
  const completedGoalsCount = userData.goals.filter(g => 
    g.tasks.length > 0 && g.tasks.every(t => t.completed)
  ).length;
  
  const totalTasks = userData.goals.reduce((sum, g) => sum + g.tasks.length, 0);
  const completedTasks = userData.goals.reduce(
    (sum, g) => sum + g.tasks.filter(t => t.completed).length, 
    0
  );
  
  return (
    <div className="space-y-8 pb-12">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="bg-gradient-to-br from-purple-500 to-pink-500 text-white border-0 shadow-xl">
          <CardContent className="p-8">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <h2 className="text-3xl font-bold">Welcome Back!</h2>
                <p className="text-lg opacity-90 max-w-2xl italic">
                  "{quote}"
                </p>
              </div>
              <Sparkles className="w-12 h-12 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </motion.div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-white/80 backdrop-blur-md border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Active Goals</CardTitle>
              <Target className="w-5 h-5 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{userData.goals.length}</div>
              <p className="text-xs text-gray-600 mt-1">{completedGoalsCount} completed</p>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-white/80 backdrop-blur-md border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Tasks Completed</CardTitle>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{completedTasks}</div>
              <p className="text-xs text-gray-600 mt-1">out of {totalTasks} total</p>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-white/80 backdrop-blur-md border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Achievements</CardTitle>
              <Award className="w-5 h-5 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{userData.achievements.length}</div>
              <p className="text-xs text-gray-600 mt-1">badges earned</p>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-white/80 backdrop-blur-md border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Reflections</CardTitle>
              <BookOpen className="w-5 h-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{userData.reflections.length}</div>
              <p className="text-xs text-gray-600 mt-1">journal entries</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Life Balance Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="bg-white/80 backdrop-blur-md border-0 shadow-lg h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Life Balance</CardTitle>
                  <CardDescription>Your current Wheel of Life</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/life-balance')}
                >
                  View Details
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fontSize: 10 }} />
                  <Radar
                    name="Score"
                    dataKey="value"
                    stroke="#8b5cf6"
                    fill="#8b5cf6"
                    fillOpacity={0.6}
                  />
                </RadarChart>
              </ResponsiveContainer>
              
              {/* Improve Now Button */}
              <div className="mt-4">
                <Button
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                  onClick={() => navigate('/life-insight')}
                >
                  Improve Now
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        {/* Recent Goals */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="bg-white/80 backdrop-blur-md border-0 shadow-lg h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Goals</CardTitle>
                  <CardDescription>Your active goals and progress</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/goals')}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Goal
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentGoals.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No goals yet. Create your first goal!</p>
                  <Button
                    className="mt-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                    onClick={() => navigate('/goals')}
                  >
                    Create Goal
                  </Button>
                </div>
              ) : (
                recentGoals.map((goal) => {
                  const progress = calculateGoalProgress(goal);
                  return (
                    <div key={goal.id} className="space-y-2 p-3 rounded-lg bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium">{goal.title}</h4>
                          <p className="text-sm text-gray-600">{goal.category}</p>
                        </div>
                        <span className="text-sm font-semibold text-purple-600">
                          {progress}%
                        </span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
      
      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <Card className="bg-white/80 backdrop-blur-md border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Jump into your most used features</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                variant="outline"
                className="h-auto py-6 flex flex-col items-center gap-3 hover:border-purple-500 hover:bg-purple-50"
                onClick={() => navigate('/vision-board')}
              >
                <Sparkles className="w-8 h-8 text-purple-500" />
                <div className="text-center">
                  <div className="font-semibold">Create Vision Board</div>
                  <div className="text-xs text-gray-600">Visualize your dreams</div>
                </div>
              </Button>
              
              <Button
                variant="outline"
                className="h-auto py-6 flex flex-col items-center gap-3 hover:border-green-500 hover:bg-green-50"
                onClick={() => navigate('/goals')}
              >
                <Target className="w-8 h-8 text-green-500" />
                <div className="text-center">
                  <div className="font-semibold">Track Goals</div>
                  <div className="text-xs text-gray-600">Monitor your progress</div>
                </div>
              </Button>
              
              <Button
                variant="outline"
                className="h-auto py-6 flex flex-col items-center gap-3 hover:border-blue-500 hover:bg-blue-50"
                onClick={() => navigate('/journal')}
              >
                <BookOpen className="w-8 h-8 text-blue-500" />
                <div className="text-center">
                  <div className="font-semibold">Write Reflection</div>
                  <div className="text-xs text-gray-600">Journal your journey</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
      
      {/* Recent Reflections */}
      {recentReflections.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card className="bg-white/80 backdrop-blur-md border-0 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Reflections</CardTitle>
                  <CardDescription>Your latest journal entries</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/journal')}
                >
                  View All
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentReflections.map((reflection) => (
                <div key={reflection.id} className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium">{reflection.title}</h4>
                    <span className="text-xs text-gray-500">
                      {new Date(reflection.date).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-2">{reflection.content}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}