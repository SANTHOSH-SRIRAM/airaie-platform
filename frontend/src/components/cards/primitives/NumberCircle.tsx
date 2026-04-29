import { memo } from 'react';

interface NumberCircleProps {
  number: number;
  size?: 'sm' | 'md';
}

const sizeMap = {
  sm: 'h-[24px] w-[24px] text-[11px]',
  md: 'h-[32px] w-[32px] text-[12px]',
} as const;

function NumberCircleImpl({ number, size = 'md' }: NumberCircleProps) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-[#ff9800]/20 font-mono font-bold text-[#8b5000] ${sizeMap[size]}`}
      aria-hidden="true"
    >
      {number}
    </span>
  );
}

export const NumberCircle = memo(NumberCircleImpl);
export default NumberCircle;
