import { useState } from "react";
import { useNavigate } from "react-router";
import { updateWheelOfLife, LIFE_AREAS, LifeArea } from "../utils/storage";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Slider } from "../components/ui/slider";
import { Sparkles, ArrowRight, Check } from "lucide-react";
import { motion } from "motion/react";

export function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'welcome' | 'assessment'>('assessment');
  const [lifeAreas, setLifeAreas] = useState<LifeArea[]>(
    LIFE_AREAS.map(area => ({ ...area, score: 5 }))
  );
  
  const handleScoreChange = (index: number, value: number[]) => {
    const updated = [...lifeAreas];
    updated[index] = { ...updated[index], score: value[0] };
    setLifeAreas(updated);
  };
  
  const handleComplete = () => {
    updateWheelOfLife(lifeAreas);
    navigate('/life-insight');
  };
  
  if (step === 'welcome') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="max-w-2xl w-full bg-white/80 backdrop-blur-md shadow-xl border-0">
            <CardHeader className="text-center space-y-4 pb-8">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <CardTitle className="text-4xl">Welcome to Vision Board</CardTitle>
              <CardDescription className="text-lg">
                Your personal platform for defining life goals, visualizing your future, 
                and tracking your progress toward an extraordinary life.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">What you'll get:</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-4 h-4 text-purple-600" />
                    </div>
                    <span>Comprehensive Wheel of Life assessment to identify areas for growth</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-4 h-4 text-purple-600" />
                    </div>
                    <span>Personalized vision boards to visualize your dreams and aspirations</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-4 h-4 text-purple-600" />
                    </div>
                    <span>Goal tracking system with tasks and progress monitoring</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-4 h-4 text-purple-600" />
                    </div>
                    <span>Achievements and milestones to celebrate your journey</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-4 h-4 text-purple-600" />
                    </div>
                    <span>Personal journal for reflection and growth tracking</span>
                  </li>
                </ul>
              </div>
              
              <Button
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white h-12 text-lg"
                onClick={() => setStep('assessment')}
              >
                Begin Your Journey
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-3xl"
      >
        <Card className="bg-white/80 backdrop-blur-md shadow-xl border-0">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">Wheel of Life Assessment</CardTitle>
            <CardDescription className="text-base mt-2">
              Rate each area of your life from 1 (needs attention) to 10 (excellent).
              This helps us understand where you are now and where you want to go.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {lifeAreas.map((area, index) => (
              <motion.div
                key={area.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="space-y-3"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: area.color }}
                    />
                    <span className="font-medium text-lg">{area.name}</span>
                  </div>
                  <span className="text-2xl font-bold" style={{ color: area.color }}>
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
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Needs Attention</span>
                  <span>Excellent</span>
                </div>
              </motion.div>
            ))}
            
            <div className="pt-6">
              <Button
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white h-12 text-lg"
                onClick={handleComplete}
              >
                Complete Assessment
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
