import { cn } from '@utils/cn';

type AvatarSize = 'sm' | 'md' | 'lg';

interface AvatarProps {
  name: string;
  size?: AvatarSize;
  className?: string;
}

const sizeStyles: Record<AvatarSize, string> = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-11 h-11 text-base',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function Avatar({ name, size = 'md', className }: AvatarProps) {
  return (
    <div
      className={cn(
        'rounded-full bg-brand-secondary text-white font-semibold',
        'flex items-center justify-center shrink-0',
        sizeStyles[size],
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
}
