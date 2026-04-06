import { useState, useCallback } from 'react';
import { Copy, Download, ArrowDownToLine } from 'lucide-react';
import Button from '@components/ui/Button';

interface LogToolbarProps {
  lineCount: number;
  autoScroll: boolean;
  onToggleAutoScroll: () => void;
  onCopy: () => void;
  onDownload: () => void;
}

export default function LogToolbar({ lineCount, autoScroll, onToggleAutoScroll, onCopy, onDownload }: LogToolbarProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [onCopy]);

  return (
    <div className="flex items-center justify-between px-3 py-1.5 border-b border-cds-border-subtle bg-surface">
      <span className="text-xs text-cds-text-secondary">{lineCount} lines</span>

      <div className="flex items-center gap-2">
        {/* Auto-scroll toggle */}
        <button
          type="button"
          onClick={onToggleAutoScroll}
          className="flex items-center gap-1.5 text-xs text-cds-text-secondary hover:text-cds-text-primary transition-colors"
          aria-label="Toggle auto-scroll"
        >
          <ArrowDownToLine size={14} />
          <span>{autoScroll ? 'Auto-scroll on' : 'Auto-scroll off'}</span>
        </button>

        {/* Copy */}
        <Button variant="ghost" size="sm" iconOnly icon={copied ? undefined : <Copy size={14} />} onClick={handleCopy} aria-label="Copy logs">
          {copied ? <span className="text-[10px]">Copied!</span> : null}
        </Button>

        {/* Download */}
        <Button variant="ghost" size="sm" iconOnly icon={<Download size={14} />} onClick={onDownload} aria-label="Download logs" />
      </div>
    </div>
  );
}
