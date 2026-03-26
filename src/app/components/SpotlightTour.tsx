import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";

export interface SpotlightTourStep {
  id: string;
  targetId: string;
  title: string;
  description: string;
}

interface SpotlightTourProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  steps: SpotlightTourStep[];
}

export function SpotlightTour({ open, onOpenChange, title, description, steps }: SpotlightTourProps) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (open) setCurrentStep(0);
  }, [open]);

  const step = steps[currentStep];

  useEffect(() => {
    if (!open || !step) return;
    const el = document.getElementById(step.targetId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [open, step]);

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      onOpenChange(false);
    }
  }, [currentStep, steps.length, onOpenChange]);

  const handlePrev = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  }, []);

  if (!step) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{currentStep === 0 ? title : step.title}</DialogTitle>
          <DialogDescription>
            {currentStep === 0 ? description : step.description}
          </DialogDescription>
        </DialogHeader>

        {currentStep > 0 && (
          <div className="space-y-1 px-1">
            <p className="text-sm font-medium">{step.title}</p>
            <p className="text-muted-foreground text-sm">{step.description}</p>
          </div>
        )}

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <div className="text-muted-foreground text-xs" aria-label={`Bước ${currentStep + 1} trên ${steps.length}`}>
            {currentStep + 1} / {steps.length}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handlePrev} disabled={currentStep === 0}>
              Quay lại
            </Button>
            <Button size="sm" onClick={handleNext}>
              {currentStep < steps.length - 1 ? "Tiếp" : "Xong"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
