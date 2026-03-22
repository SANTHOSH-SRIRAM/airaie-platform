import { X } from 'lucide-react';
import { cn } from '@utils/cn';

type TagColor = 'gray' | 'blue' | 'green' | 'red' | 'teal' | 'purple' | 'high-contrast' | 'outline';
type TagSize = 'sm' | 'md';

interface TagProps {
  color?: TagColor;
  size?: TagSize;
  onClose?: () => void;
  children: React.ReactNode;
  className?: string;
}

const colorStyles: Record<TagColor, string> = {
  gray:           'bg-gray-20 text-gray-100',
  blue:           'bg-blue-20 text-blue-80',
  green:          'bg-green-20 text-green-80',
  red:            'bg-red-20 text-red-80',
  teal:           'bg-teal-50/10 text-teal-60',
  purple:         'bg-purple-60/10 text-purple-60',
  'high-contrast':'bg-gray-100 text-white',
  outline:        'bg-transparent border border-gray-50 text-cds-text-primary',
};

export default function Tag({ color = 'gray', size = 'md', onClose, children, className }: TagProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-normal transition-colors duration-75',
        size === 'sm' ? 'px-2 h-[18px] text-xs' : 'px-3 h-6 text-xs',
        colorStyles[color],
        className
      )}
    >
      {children}
      {onClose && (
        <button onClick={onClose} className="ml-0.5 hover:opacity-70 transition-opacity" aria-label="Remove">
          <X size={size === 'sm' ? 10 : 12} />
        </button>
      )}
    </span>
  );
}
