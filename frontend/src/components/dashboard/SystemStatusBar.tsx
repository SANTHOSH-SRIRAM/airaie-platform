import { useSystemHealth } from '@hooks/useDashboard';
import { cn } from '@utils/cn';

export default function SystemStatusBar() {
  const { data: status } = useSystemHealth();

  if (!status) return null;

  const overallColor = status.overall === 'operational'
    ? 'bg-[#2e7d32]'
    : status.overall === 'degraded'
      ? 'bg-[#f57c00]'
      : 'bg-[#c62828]';

  const overallTextColor = status.overall === 'operational'
    ? 'text-[#2e7d32]'
    : status.overall === 'degraded'
      ? 'text-[#f57c00]'
      : 'text-[#c62828]';

  const storagePercent = status.storageUsed.totalBytes > 0
    ? Math.round((status.storageUsed.bytes / status.storageUsed.totalBytes) * 100)
    : 0;

  return (
    <div className="inline-flex items-center gap-4 h-10 px-5 text-[13px] text-[#949494] bg-[#fbfaf9] rounded-full shadow-card">
      <div className="flex items-center gap-1.5">
        <span className={cn('w-2 h-2 rounded-full', overallColor)} />
        <span className={cn('font-medium', overallTextColor)}>
          System {status.overall === 'operational' ? 'Operational' : status.overall}
        </span>
      </div>
      <span className="text-[#d5d5cf]">|</span>
      <span className="font-mono text-xs">API: {status.apiLatencyMs}ms</span>
      <span className="text-[#d5d5cf]">|</span>
      <span>NATS: {status.natsConnected ? 'connected' : 'disconnected'}</span>
      <span className="text-[#d5d5cf]">|</span>
      <span>Runner: {status.runnerSlots.used}/{status.runnerSlots.total} slots</span>
      <span className="text-[#d5d5cf]">|</span>
      <span>Storage: {storagePercent}% used</span>
    </div>
  );
}
