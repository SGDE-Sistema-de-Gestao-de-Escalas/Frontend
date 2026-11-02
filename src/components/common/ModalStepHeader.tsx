import React from "react";
import { Check } from "lucide-react";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

export interface ModalStepItem {
  id: string | number;
  label: string;
}

export interface ModalStepHeaderProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: React.ReactNode;
  steps?: ModalStepItem[];
  currentStep?: string | number;
  onStepClick?: (stepId: string | number) => void;
}

export default function ModalStepHeader({
  icon,
  title,
  description,
  badge,
  steps = [],
  currentStep,
  onStepClick,
}: ModalStepHeaderProps) {
  const currentIdx = steps.findIndex((s) => s.id === currentStep);
  const n = steps.length;
  const showStepper = n > 1;

  // Cálculo das margens e percentagem de avanço da barra
  const sideMarginPercent = n > 0 ? 50 / n : 16.6;
  const progressPercent =
    n > 1 && currentIdx >= 0
      ? Math.min(100, Math.max(0, (currentIdx / (n - 1)) * 100))
      : 0;

  return (
    <DialogHeader className="px-6 pt-5 pb-4 border-b border-border bg-card">
      <div className="flex items-center gap-3 pr-8">
        <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <DialogTitle className="text-base sm:text-lg font-semibold text-foreground">
              {title}
            </DialogTitle>
            {badge}
          </div>
          <DialogDescription className="text-xs text-muted-foreground mt-0.5">
            {description}
          </DialogDescription>
        </div>
      </div>

      {/* Stepper por baixo dos títulos - Centralizado com espaçamento simétrico */}
      {showStepper && (
        <div className="!mt-4 pt-4 border-t border-border/60">
          <div
            className="max-w-md mx-auto grid relative"
            style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
          >
            {/* Linha de ligação horizontal em fundo */}
            <div
              className="absolute top-2.5 h-px bg-border pointer-events-none"
              style={{
                left: `${sideMarginPercent}%`,
                right: `${sideMarginPercent}%`,
              }}
            >
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Passos */}
            {steps.map((st, idx) => {
              const isPast = idx < currentIdx;
              const isCurrent = idx === currentIdx;
              const isFuture = idx > currentIdx;
              const isClickable = isPast && onStepClick;

              return (
                <div
                  key={String(st.id)}
                  onClick={() => {
                    if (isClickable) onStepClick(st.id);
                  }}
                  className={`flex flex-col items-center text-center relative z-10 select-none ${
                    isClickable ? "cursor-pointer" : isFuture ? "opacity-60" : ""
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                      isCurrent
                        ? "bg-primary text-primary-foreground shadow-xs ring-4 ring-card"
                        : isPast
                        ? "bg-emerald-500 text-white ring-4 ring-card"
                        : "bg-muted text-muted-foreground border border-border ring-4 ring-card"
                    }`}
                  >
                    {isPast ? <Check size={11} strokeWidth={3} /> : idx + 1}
                  </div>
                  <span
                    className={`text-xs mt-1.5 transition-colors ${
                      isCurrent
                        ? "font-semibold text-foreground"
                        : "text-muted-foreground font-medium"
                    }`}
                  >
                    {st.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </DialogHeader>
  );
}
