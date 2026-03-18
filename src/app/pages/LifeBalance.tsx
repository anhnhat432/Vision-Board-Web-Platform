import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { getUserData, UserData, updateWheelOfLife, LIFE_AREAS, LifeArea } from "../utils/storage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Slider } from "../components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Save, TrendingUp, Calendar } from "lucide-react";
import { motion } from "motion/react";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { toast } from "sonner";

export function LifeBalance() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [lifeAreas, setLifeAreas] = useState<LifeArea[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = () => {
    const data = getUserData();
    setUserData(data);
    setLifeAreas([...data.currentWheelOfLife]);
    setHasChanges(false);
  };
  
  const handleScoreChange = (index: number, value: number[]) => {
    const updated = [...lifeAreas];
    updated[index] = { ...updated[index], score: value[0] };
    setLifeAreas(updated);
    setHasChanges(true);
  };
  
  const handleSave = () => {
    updateWheelOfLife(lifeAreas);
    toast.success('Life balance updated!', {
      description: 'Your Wheel of Life scores have been saved.',
    });
    loadData();
  };
  
  if (!userData) return null;
  
  const radarData = lifeAreas.map(area => ({
    subject: area.name,
    value: area.score,
    fullMark: 10,
  }));
  
  const averageScore = lifeAreas.reduce((sum, area) => sum + area.score, 0) / lifeAreas.length;
  
  // Prepare historical data for trends
  const historicalData = userData.wheelOfLifeHistory.slice(-6).map((record, index) => {
    const dataPoint: any = {
      date: new Date(record.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    };
    
    record.areas.forEach(area => {
      dataPoint[area.name] = area.score;
    });
    
    return dataPoint;
  });
  
  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Life Balance</h1>
          <p className="text-gray-600 mt-1">Track and improve balance across different life areas</p>
        </div>
        
        {hasChanges && (
          <Button
            onClick={handleSave}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        )}
      </div>
      
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-white/80 backdrop-blur-md border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Overall Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{averageScore.toFixed(1)}</div>
              <p className="text-xs text-gray-600 mt-1">out of 10</p>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-white/80 backdrop-blur-md border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Strongest Area</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {[...lifeAreas].sort((a, b) => b.score - a.score)[0]?.name}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Score: {[...lifeAreas].sort((a, b) => b.score - a.score)[0]?.score}
              </p>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-white/80 backdrop-blur-md border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Needs Attention</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {[...lifeAreas].sort((a, b) => a.score - b.score)[0]?.name}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Score: {[...lifeAreas].sort((a, b) => a.score - b.score)[0]?.score}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      
      <Tabs defaultValue="current" className="space-y-6">
        <TabsList>
          <TabsTrigger value="current">
            <TrendingUp className="w-4 h-4 mr-2" />
            Current Balance
          </TabsTrigger>
          <TabsTrigger value="history" disabled={historicalData.length === 0}>
            <Calendar className="w-4 h-4 mr-2" />
            Historical Trends
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="current" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Radar Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="bg-white/80 backdrop-blur-md border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Wheel of Life</CardTitle>
                  <CardDescription>Visual representation of your life balance</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
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
                </CardContent>
              </Card>
            </motion.div>
            
            {/* Sliders */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="bg-white/80 backdrop-blur-md border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Adjust Your Scores</CardTitle>
                  <CardDescription>Rate each area from 1 to 10</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {lifeAreas.map((area, index) => (
                    <div key={area.name} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: area.color }}
                          />
                          <span className="font-medium">{area.name}</span>
                        </div>
                        <span className="text-xl font-bold" style={{ color: area.color }}>
                          {area.score}
                        </span>
                      </div>
                      <Slider
                        value={[area.score]}
                        onValueChange={(value) => handleScoreChange(index, value)}
                        min={1}
                        max={10}
                        step={1}
                        className="w-full"
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </TabsContent>
        
        <TabsContent value="history">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="bg-white/80 backdrop-blur-md border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Balance Over Time</CardTitle>
                <CardDescription>Track how your life balance has evolved</CardDescription>
              </CardHeader>
              <CardContent>
                {historicalData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={historicalData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 10]} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      {LIFE_AREAS.map(area => (
                        <Line
                          key={area.name}
                          type="monotone"
                          dataKey={area.name}
                          stroke={area.color}
                          strokeWidth={2}
                          dot={{ r: 4 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No historical data yet</p>
                    <p className="text-sm">Update your scores to start tracking trends</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}