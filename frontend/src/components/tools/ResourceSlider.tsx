import { cn } from '@utils/cn';

interface ResourceSliderProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
  className?: string;
}

export default function ResourceSlider({
  id,
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  className,
}: ResourceSliderProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-[11px] text-[#6b6b6b]">
          {label}
        </label>
        <span className="font-mono text-[11px] font-medium text-[#1a1a1a]">
          {value} {unit}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none bg-[#ece9e3] accent-[#2196f3] cursor-pointer [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#2196f3] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:shadow-[0_1px_4px_rgba(0,0,0,0.15)]"
      />
      <div className="flex items-center justify-between text-[10px] text-[#acacac]">
        <span>{min} {unit}</span>
        <span>{max} {unit}</span>
      </div>
    </div>
  );
}
