import { useRef, type ReactNode } from "react";
import { motion } from "motion/react";
import { ArrowLeft, ArrowRight, Flag } from "lucide-react";

import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { useScrollToTopOnChange } from "@/app/hooks/useScrollToTopOnChange";

interface SetupStepShellProps {
  title: string;
  description: ReactNode;
  currentStep: number;
  stepCount: number;
  children: ReactNode;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

export function SetupStepShell({
  title,
  description,
  currentStep,
  stepCount,
  children,
  onBack,
  onNext,
  onSubmit,
}: SetupStepShellProps) {
  const isLastStep = currentStep >= stepCount - 1;
  const stepShellRef = useRef<HTMLDivElement | null>(null);
  const titleFocusRef = useRef<HTMLSpanElement | null>(null);

  useScrollToTopOnChange(currentStep, {
    targetRef: stepShellRef,
    focusRef: titleFocusRef,
  });

  return (
    <motion.div
      ref={stepShellRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
    >
      <Card>
        <CardHeader>
          <CardTitle>
            <span ref={titleFocusRef} tabIndex={-1} className="block focus:outline-none">
              {title}
            </span>
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {children}

          <div className="flex flex-col justify-between gap-3 border-t border-white/70 pt-2 sm:flex-row">
            <Button className="w-full sm:w-auto" variant="outline" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
              Quay lại
            </Button>
            {isLastStep ? (
              <Button className="w-full sm:w-auto" onClick={onSubmit}>
                <Flag className="h-4 w-4" />
                Tạo kế hoạch 12 tuần
              </Button>
            ) : (
              <Button className="w-full sm:w-auto" onClick={onNext}>
                Tiếp tục
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
