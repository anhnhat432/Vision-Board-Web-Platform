import { useEffect, useState } from "react";
import { getUserData, UserData } from "../utils/storage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Trophy, Target, Sparkles, Award, Crown, BookOpen, Flame } from "lucide-react";
import { motion } from "motion/react";

const ICON_MAP: Record<string, any> = {
  Target,
  Trophy,
  Award,
  Crown,
  Sparkles,
  BookOpen,
  Flame,
};

export function Achievements() {
  const [userData, setUserData] = useState<UserData | null>(null);
  
  useEffect(() => {
    const data = getUserData();
    setUserData(data);
  }, []);
  
  if (!userData) return null;
  
  const sortedAchievements = [...userData.achievements].sort(
    (a, b) => new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime()
  );
  
  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-3xl font-bold">Achievements</h1>
        <p className="text-gray-600 mt-1">Celebrate your milestones and progress</p>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Total Achievements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Trophy className="w-10 h-10" />
                <div className="text-4xl font-bold">{userData.achievements.length}</div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-gradient-to-br from-purple-500 to-pink-500 text-white border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Completed Goals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Target className="w-10 h-10" />
                <div className="text-4xl font-bold">
                  {userData.goals.filter(g => g.tasks.length > 0 && g.tasks.every(t => t.completed)).length}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Vision Boards</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Sparkles className="w-10 h-10" />
                <div className="text-4xl font-bold">{userData.visionBoards.length}</div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      
      {/* Achievements Grid */}
      {sortedAchievements.length === 0 ? (
        <Card className="bg-white/80 backdrop-blur-md border-0 shadow-lg">
          <CardContent className="py-16 text-center">
            <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold mb-2">No achievements yet</h3>
            <p className="text-gray-600 mb-6">Start working on your goals to earn your first badge!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedAchievements.map((achievement, index) => {
            const Icon = ICON_MAP[achievement.icon] || Trophy;
            const earnedDate = new Date(achievement.earnedAt);
            
            return (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="bg-white/80 backdrop-blur-md border-0 shadow-lg hover:shadow-xl transition-all hover:scale-105">
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                        <Icon className="w-10 h-10 text-white" />
                      </div>
                      
                      <div>
                        <h3 className="font-bold text-lg mb-1">{achievement.title}</h3>
                        <p className="text-sm text-gray-600">{achievement.description}</p>
                      </div>
                      
                      <div className="text-xs text-gray-500">
                        Earned {earnedDate.toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
      
      {/* Available Achievements */}
      <Card className="bg-white/80 backdrop-blur-md border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Available Achievements</CardTitle>
          <CardDescription>Keep working to unlock these badges</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {!userData.achievements.find(a => a.title === 'First Step') && (
              <div className="flex items-center gap-4 p-4 rounded-lg bg-gray-50 border border-gray-200">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                  <Target className="w-6 h-6 text-gray-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-400">First Step</h4>
                  <p className="text-sm text-gray-500">Create your first goal</p>
                </div>
              </div>
            )}
            
            {!userData.achievements.find(a => a.title === 'Goal Setter') && (
              <div className="flex items-center gap-4 p-4 rounded-lg bg-gray-50 border border-gray-200">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-gray-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-400">Goal Setter</h4>
                  <p className="text-sm text-gray-500">Create 5 goals</p>
                </div>
              </div>
            )}
            
            {!userData.achievements.find(a => a.title === 'Achiever') && (
              <div className="flex items-center gap-4 p-4 rounded-lg bg-gray-50 border border-gray-200">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                  <Award className="w-6 h-6 text-gray-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-400">Achiever</h4>
                  <p className="text-sm text-gray-500">Complete your first goal</p>
                </div>
              </div>
            )}
            
            {!userData.achievements.find(a => a.title === 'Master Achiever') && (
              <div className="flex items-center gap-4 p-4 rounded-lg bg-gray-50 border border-gray-200">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                  <Crown className="w-6 h-6 text-gray-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-400">Master Achiever</h4>
                  <p className="text-sm text-gray-500">Complete 5 goals</p>
                </div>
              </div>
            )}
            
            {!userData.achievements.find(a => a.title === 'Visionary') && (
              <div className="flex items-center gap-4 p-4 rounded-lg bg-gray-50 border border-gray-200">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-gray-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-400">Visionary</h4>
                  <p className="text-sm text-gray-500">Create your first vision board</p>
                </div>
              </div>
            )}
            
            {!userData.achievements.find(a => a.title === 'Reflective Mind') && (
              <div className="flex items-center gap-4 p-4 rounded-lg bg-gray-50 border border-gray-200">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-gray-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-400">Reflective Mind</h4>
                  <p className="text-sm text-gray-500">Write your first reflection</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
