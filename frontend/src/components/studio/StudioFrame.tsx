import { useState, useRef, useEffect } from 'react';
import { useUiStore } from '@store/uiStore';

interface StudioFrameProps {
  studioUrl: string;
  initialPath?: string;
}

export default function StudioFrame({ studioUrl, initialPath = '/' }: StudioFrameProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const setStudioFullscreen = useUiStore((s) => s.setStudioFullscreen);

  const src = `${studioUrl}${initialPath}${initialPath.includes('?') ? '&' : '?'}embedded=true`;

  useEffect(() => {
    setLoading(true);
    setError(false);
  }, [src]);

  // Listen for fullscreen messages from the embedded studio
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data?.type === 'airaie:studio:fullscreen') {
        setStudioFullscreen(!!e.data.fullscreen);
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [setStudioFullscreen]);

  // Reset fullscreen only when navigating AWAY from boards (not on re-render)
  // The board-studio iframe sends fullscreen:false via postMessage when going back to list

  return (
    <div className="relative w-full h-full">
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-bg">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-card-border border-t-brand-primary animate-spin" />
            <span className="text-xs text-content-placeholder font-mono">Loading studio...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-bg">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-10 h-10 border-2 border-status-danger flex items-center justify-center">
              <span className="text-status-danger font-bold text-lg">!</span>
            </div>
            <p className="text-sm text-content-secondary">Failed to load studio</p>
            <p className="text-xs text-content-placeholder font-mono">
              Make sure the studio dev server is running at {studioUrl}
            </p>
            <button
              onClick={() => { setError(false); setLoading(true); if (iframeRef.current) iframeRef.current.src = src; }}
              className="mt-2 px-4 py-2 text-xs font-medium text-brand-primary border border-brand-primary hover:bg-surface-hover transition-colors"
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
        onError={() => { setLoading(false); setError(true); }}
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}
