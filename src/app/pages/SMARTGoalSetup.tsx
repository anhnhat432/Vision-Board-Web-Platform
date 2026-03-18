import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import { ArrowLeft, ArrowRight, Target } from "lucide-react";
import { motion } from "motion/react";

interface SMARTData {
  specific: string;
  measurable: string;
  achievable: string;
  relevant: string;
  timeBound: string;
}

const SMART_STEPS = [
  {
    key: "specific" as keyof SMARTData,
    label: "Specific",
    title: "What exactly do you want to achieve?",
    placeholder: "Example: I want to get promoted to Senior Developer position",
    description: "Be clear and specific about your goal. Avoid vague statements.",
  },
  {
    key: "measurable" as keyof SMARTData,
    label: "Measurable",
    title: "How will you measure your progress?",
    placeholder: "Example: Complete 3 advanced courses and lead 2 major projects",
    description: "Define concrete criteria to track your progress.",
  },
  {
    key: "achievable" as keyof SMARTData,
    label: "Achievable",
    title: "What resources or skills do you need?",
    placeholder: "Example: Online courses, mentorship from senior colleagues, dedicated study time",
    description: "Identify what you need to make this goal realistic.",
  },
  {
    key: "relevant" as keyof SMARTData,
    label: "Relevant",
    title: "Why is this goal important to you?",
    placeholder: "Example: Career advancement aligns with my 5-year plan and financial goals",
    description: "Connect this goal to your broader life vision.",
  },
  {
    key: "timeBound" as keyof SMARTData,
    label: "Time-bound",
    title: "When do you want to achieve this?",
    placeholder: "Example: Within 12 months (by March 2027)",
    description: "Set a realistic deadline to create urgency.",
  },
];

export function SMARTGoalSetup() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [focusArea, setFocusArea] = useState<string>("");
  const [smartData, setSmartData] = useState<SMARTData>({
    specific: "",
    measurable: "",
    achievable: "",
    relevant: "",
    timeBound: "",
  });

  useEffect(() => {
    const area = localStorage.getItem("selected_focus_area");
    const fallbackArea = area || "Personal Growth";
    setFocusArea(fallbackArea);

    const draft = localStorage.getItem("pending_smart_goal");
    if (!draft) return;

    try {
      const parsed = JSON.parse(draft);
      if (!area && typeof parsed.focusArea === "string" && parsed.focusArea.trim().length > 0) {
        setFocusArea(parsed.focusArea);
      }

      setSmartData({
        specific: typeof parsed.specific === "string" ? parsed.specific : "",
        measurable: typeof parsed.measurable === "string" ? parsed.measurable : "",
        achievable: typeof parsed.achievable === "string" ? parsed.achievable : "",
        relevant: typeof parsed.relevant === "string" ? parsed.relevant : "",
        timeBound: typeof parsed.timeBound === "string" ? parsed.timeBound : "",
      });
    } catch {
      // Ignore malformed draft payloads.
    }
  }, []);

  const currentStepData = SMART_STEPS[currentStep];
  const totalSteps = SMART_STEPS.length;
  const progressPercentage = ((currentStep + 1) / totalSteps) * 100;

  const handleInputChange = (value: string) => {
    setSmartData({
      ...smartData,
      [currentStepData.key]: value,
    });
  };

  const handleGoToFeasibility = () => {
    localStorage.setItem(
      "pending_smart_goal",
      JSON.stringify({
        focusArea,
        specific: smartData.specific,
        measurable: smartData.measurable,
        achievable: smartData.achievable,
        relevant: smartData.relevant,
        timeBound: smartData.timeBound,
      })
    );

    navigate("/feasibility");
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
      return;
    }

    handleGoToFeasibility();
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      return;
    }

    navigate("/life-insight");
  };

  const isCurrentStepValid = smartData[currentStepData.key].trim().length > 0;

  return (
    <div className="min-h-screen bg-[#FDF2F8] flex items-center justify-center p-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-3xl"
      >
        <Card className="bg-white rounded-3xl shadow-2xl border-0">
          <CardHeader className="space-y-4 pb-6">
            <div className="flex flex-wrap gap-2 justify-center">
              <Badge variant="outline" className="text-sm px-3 py-1 border-2">
                <Target className="w-3 h-3 mr-1" />
                Linked to: {focusArea}
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Step {currentStep + 1} of {totalSteps}</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>

            <CardTitle className="text-3xl text-center">Create Your SMART Goal</CardTitle>

            <div className="flex justify-center gap-2 flex-wrap">
              {SMART_STEPS.map((step, index) => (
                <div
                  key={step.key}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    index === currentStep
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                      : index < currentStep
                        ? "bg-purple-100 text-purple-700"
                        : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {step.label}
                </div>
              ))}
            </div>
          </CardHeader>

          <CardContent className="space-y-6 p-8">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 space-y-2">
                <h3 className="text-2xl font-semibold text-gray-800">{currentStepData.label}</h3>
                <p className="text-lg text-gray-700">{currentStepData.title}</p>
                <p className="text-sm text-gray-600 italic">{currentStepData.description}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="input" className="text-base font-medium">
                  Your Answer
                </Label>
                <Textarea
                  id="input"
                  placeholder={currentStepData.placeholder}
                  value={smartData[currentStepData.key]}
                  onChange={(e) => handleInputChange(e.target.value)}
                  className="min-h-[120px] text-base rounded-2xl border-2 focus:border-purple-500 resize-none"
                />
              </div>
            </motion.div>

            <div className="flex gap-4 pt-6">
              <Button
                variant="outline"
                className="flex-1 h-12 text-base border-2 border-gray-300 hover:bg-gray-50 rounded-2xl"
                onClick={handleBack}
              >
                <ArrowLeft className="mr-2 w-4 h-4" />
                Back
              </Button>

              <Button
                className="flex-1 h-12 text-base bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-2xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleNext}
                disabled={!isCurrentStepValid}
              >
                {currentStep < totalSteps - 1 ? "Next" : "Next: Check Feasibility"}
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
