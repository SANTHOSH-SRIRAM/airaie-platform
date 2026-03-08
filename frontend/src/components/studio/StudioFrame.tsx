import { useState, useRef, useEffect } from 'react';

interface StudioFrameProps {
  /** Base URL of the studio dev server (e.g. http://localhost:3003) */
  studioUrl: string;
  /** Initial path to load inside the studio */
  initialPath?: string;
}

export default function StudioFrame({ studioUrl, initialPath = '/' }: StudioFrameProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const src = `${studioUrl}${initialPath}${initialPath.includes('?') ? '&' : '?'}embedded=true`;

  useEffect(() => {
    setLoading(true);
    setError(false);
  }, [src]);

  return (
    <div className="relative w-full h-full">
      {/* Loading state */}
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-bg">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-surface-border border-t-brand-secondary animate-spin" />
            <span className="text-xs text-content-muted font-mono">Loading studio...</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-bg">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-10 h-10 border-2 border-status-danger flex items-center justify-center">
              <span className="text-status-danger font-bold text-lg">!</span>
            </div>
            <p className="text-sm text-content-secondary">Failed to load studio</p>
            <p className="text-xs text-content-muted font-mono">
              Make sure the studio dev server is running at {studioUrl}
            </p>
            <button
              onClick={() => {
                setError(false);
                setLoading(true);
                if (iframeRef.current) {
                  iframeRef.current.src = src;
                }
              }}
              className="mt-2 px-4 py-2 text-xs font-medium text-brand-secondary border border-brand-secondary hover:bg-blue-50 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      <iframe
        ref={iframeRef}
        src={src}
        className="w-full h-full border-0"
        title="Studio"
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}
