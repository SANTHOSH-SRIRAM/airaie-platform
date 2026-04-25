import { Wifi, WifiOff } from 'lucide-react';
import { useExecutionStore, type RunStatus } from '@store/executionStore';
import { useAgentPlaygroundStore } from '@store/agentPlaygroundStore';
import { useAgent, useAgentVersions } from '@hooks/useAgents';

/**
 * Build version label sourced from `VITE_APP_VERSION` with a hard-coded
 * fallback. The current Vite config does NOT define this env var and
 * `package.json` carries `"version": "0.0.0"`, so the running dev server
 * displays the fallback `'0.1'`. Wire vite-define / release tooling later.
 */
const APP_VERSION = (import.meta.env.VITE_APP_VERSION as string | undefined) ?? '0.1';

/**
 * Map `RunStatus` -> presentation tokens. Uppercase enum values match
 * `executionStore.RunStatus` exactly (PENDING | RUNNING | SUCCEEDED |
 * FAILED | CANCELED | PAUSED | IDLE). No `'awaiting'` state — closest
 * is `PAUSED`.
 */
const RUN_STATUS_PRESENTATION: Record<RunStatus, { label: string; dotClass: string }> = {
  IDLE:      { label: 'Idle',      dotClass: 'bg-[#6e7781]' },
  PENDING:   { label: 'Pending',   dotClass: 'bg-[#d29922]' },
  RUNNING:   { label: 'Running',   dotClass: 'bg-[#3fb950] animate-pulse' },
  PAUSED:    { label: 'Paused',    dotClass: 'bg-[#d29922]' },
  SUCCEEDED: { label: 'Succeeded', dotClass: 'bg-[#3fb950]' },
  FAILED:    { label: 'Failed',    dotClass: 'bg-[#f85149]' },
  CANCELED:  { label: 'Canceled',  dotClass: 'bg-[#8b949e]' },
};

/**
 * IDE-shell persistent status footer (Section 15 of Agent_Studio_IDE_Redesign).
 *
 * 24px tall strip mounted as the last sibling of the AppShell flex column.
 * Read-only consumer of `executionStore` and `agentPlaygroundStore` — no
 * new state, no new hooks, no network calls beyond the gated `useAgent` /
 * `useAgentVersions` queries (skipped when `activeAgentId` is null).
 *
 * Layout:
 *   [agent name] [v{n} {status}] | [● execution] | [wifi]    AirAIE v0.1
 *
 * On non-playground routes (`activeAgentId === null`), the left cluster is
 * hidden and only the right-edge build version remains. The bar itself
 * does NOT disappear — that is governed by `hideChrome` in AppShell.
 */
export default function StatusBar() {
  const activeAgentId = useAgentPlaygroundStore((s) => s.activeAgentId);
  const runStatus = useExecutionStore((s) => s.runStatus);
  const sseConnected = useExecutionStore((s) => s.sseConnected);

  // Both hooks are `enabled: !!id`-gated — passing null is safe and skips
  // the React Query fetch entirely. Lets the bar mount globally without
  // thrashing the API on non-playground routes.
  const { data: agentData } = useAgent(activeAgentId);
  const { data: versionsData } = useAgentVersions(activeAgentId);

  // Mirror AgentPlaygroundPage.tsx:51-57: highest published version, fall
  // back to highest overall, fall back to 1. Inline the rule (only two
  // call sites today — premature to extract a util).
  let versionLabel: string | null = null;
  if (activeAgentId && versionsData && versionsData.length > 0) {
    const publishedMax = versionsData
      .filter((v) => v.status === 'published')
      .reduce((m, v) => Math.max(m, v.version), 0);
    const overallMax = versionsData.reduce((m, v) => Math.max(m, v.version), 0);
    const versionNum = publishedMax || overallMax || 1;
    const versionStatus = versionsData.find((v) => v.version === versionNum)?.status ?? 'draft';
    versionLabel = `v${versionNum} ${versionStatus}`;
  }

  const showAgentSection = !!activeAgentId;
  const presentation = RUN_STATUS_PRESENTATION[runStatus] ?? RUN_STATUS_PRESENTATION.IDLE;

  return (
    <div
      data-testid="status-bar"
      role="status"
      aria-label="Application status"
      className="shrink-0 h-6 px-3 flex items-center justify-between gap-3 bg-[#1f1f1f] text-[#d4d4d4] text-[12px] leading-none border-t border-[#2d2d2d] font-sans"
    >
      {/* LEFT cluster: agent identity + execution pill + sse health */}
      <div className="flex items-center gap-3 min-w-0">
        {showAgentSection && (
          <>
            <span className="truncate max-w-[240px]" title={agentData?.name ?? ''}>
              {agentData?.name ?? 'Agent'}
            </span>
            {versionLabel && (
              <span
                className="px-1.5 py-0.5 rounded bg-[#2d2d2d] text-[#9ca3af] text-[11px] leading-none"
                data-testid="status-bar-version-chip"
              >
                {versionLabel}
              </span>
            )}
            <span className="w-px h-3 bg-[#3d3d3d]" aria-hidden />
            <span className="flex items-center gap-1.5" data-testid="status-bar-run-pill">
              <span className={`w-2 h-2 rounded-full ${presentation.dotClass}`} aria-hidden />
              <span>{presentation.label}</span>
            </span>
            <span className="w-px h-3 bg-[#3d3d3d]" aria-hidden />
            <span
              className="flex items-center gap-1"
              data-testid="status-bar-sse"
              title={sseConnected ? 'Live updates connected' : 'Live updates disconnected'}
            >
              {sseConnected ? (
                <Wifi size={12} className="text-[#3fb950]" />
              ) : (
                <WifiOff size={12} className="text-[#6e7781]" />
              )}
            </span>
          </>
        )}
      </div>

      {/* RIGHT cluster: build version */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[#9ca3af]">AirAIE v{APP_VERSION}</span>
      </div>
    </div>
  );
}
