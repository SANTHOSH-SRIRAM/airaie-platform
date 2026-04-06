import { useState, useEffect, useCallback } from 'react';
import { WifiOff, X } from 'lucide-react';

export default function OfflineBar() {
  const [isOffline, setIsOffline] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const checkConnection = useCallback(async () => {
    try {
      const res = await fetch('/v0/boards', {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        setIsOffline(false);
        setDismissed(false);
      }
    } catch {
      setIsOffline(true);
    }
  }, []);

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => {
      setIsOffline(false);
      setDismissed(false);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    // Periodic health check every 30s
    const interval = setInterval(checkConnection, 30000);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      clearInterval(interval);
    };
  }, [checkConnection]);

  if (!isOffline || dismissed) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 dark:bg-amber-600 text-amber-950 px-4 py-2 flex items-center justify-between text-sm font-medium shadow-md">
      <div className="flex items-center gap-2">
        <WifiOff className="w-4 h-4" />
        <span>Connection lost — running with cached data. Reconnecting...</span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="p-1 rounded hover:bg-amber-600 dark:hover:bg-amber-700 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
