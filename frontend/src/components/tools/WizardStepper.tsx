import { Check } from 'lucide-react';
import { cn } from '@utils/cn';

interface WizardStepperProps {
  steps: string[];
  currentStep: number;
  className?: string;
}

export default function WizardStepper({ steps, currentStep, className }: WizardStepperProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {steps.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div
            className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-medium transition-colors',
              i < currentStep
                ? 'bg-[#4caf50] text-white'
                : i === currentStep
                  ? 'bg-[#2196f3] text-white'
                  : 'bg-[#f0f0ec] text-[#acacac]',
            )}
          >
            {i < currentStep ? <Check size={12} /> : i + 1}
          </div>
          <span
            className={cn(
              'text-[12px]',
              i === currentStep ? 'text-[#1a1a1a] font-medium' : 'text-[#6b6b6b]',
            )}
          >
            {label}
          </span>
          {i < steps.length - 1 && <div className="w-8 h-px bg-[#ece9e3]" />}
        </div>
      ))}
    </div>
  );
}
