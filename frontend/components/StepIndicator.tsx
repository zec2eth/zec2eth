"use client";

import { useBridgeStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { BridgeStep } from "@/lib/types";
import { Check } from "lucide-react";

const steps: { key: BridgeStep; label: string }[] = [
  { key: "connect", label: "Connect" },
  { key: "amount", label: "Amount" },
  { key: "burn", label: "Send ZEC" },
  { key: "waiting", label: "Confirm" },
  { key: "proving", label: "Prove" },
  { key: "submitting", label: "Submit" },
  { key: "success", label: "Done" },
];

export function StepIndicator() {
  const { step } = useBridgeStore();

  const currentIndex = steps.findIndex((s) => s.key === step);

  return (
    <div className="w-full max-w-2xl mx-auto mb-8">
      <div className="flex items-center justify-between">
        {steps.map((s, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <div key={s.key} className="flex flex-col items-center gap-2 flex-1">
              {/* Connector line */}
              <div className="flex items-center w-full">
                {index > 0 && (
                  <div
                    className={cn(
                      "h-0.5 flex-1 transition-colors",
                      isCompleted || isCurrent ? "bg-primary" : "bg-muted"
                    )}
                  />
                )}

                {/* Step circle */}
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors shrink-0",
                    isCompleted
                      ? "bg-primary text-primary-foreground"
                      : isCurrent
                      ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
                </div>

                {index < steps.length - 1 && (
                  <div className={cn("h-0.5 flex-1 transition-colors", isCompleted ? "bg-primary" : "bg-muted")} />
                )}
              </div>

              {/* Label */}
              <span
                className={cn(
                  "text-xs transition-colors hidden sm:block",
                  isCurrent
                    ? "text-foreground font-medium"
                    : isCompleted
                    ? "text-muted-foreground"
                    : "text-muted-foreground/50"
                )}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
