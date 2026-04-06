import React from 'react';
import { cn } from '@utils/cn';
import type { RunLogLine } from '@/types/run';

const NODE_COLORS = [
  'text-blue-500',
  'text-green-500',
  'text-purple-500',
  'text-orange-500',
  'text-cyan-500',
  'text-pink-500',
];

function getNodeColor(nodeId: string): string {
  const idx = nodeId.charCodeAt(0) % NODE_COLORS.length;
  return NODE_COLORS[idx];
}

const LEVEL_STYLES: Record<RunLogLine['level'], string> = {
  info: 'text-cds-text-secondary',
  warn: 'text-yellow-600',
  error: 'text-red-600',
  debug: 'text-gray-400',
};

const LEVEL_LABELS: Record<RunLogLine['level'], string> = {
  info: '[INFO]',
  warn: '[WARN]',
  error: '[ERROR]',
  debug: '[DEBUG]',
};

interface LogLineProps {
  log: RunLogLine;
  index: number;
}

const LogLine = React.memo(function LogLine({ log, index }: LogLineProps) {
  return (
    <div
      className={cn(
        'flex gap-2 px-3 py-0.5 font-mono text-xs',
        index % 2 === 0 && 'bg-gray-50/30',
      )}
    >
      <span className="text-cds-text-secondary shrink-0 w-20">{log.timestamp}</span>
      <span className={cn('shrink-0 w-28 truncate', getNodeColor(log.nodeId))}>{log.nodeName}</span>
      <span className={cn('shrink-0 w-14', LEVEL_STYLES[log.level])}>{LEVEL_LABELS[log.level]}</span>
      <span className="text-cds-text-primary">{log.message}</span>
    </div>
  );
});

export default LogLine;
