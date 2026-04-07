import { useState, useCallback } from 'react';
import {
  Webhook, Clock, Zap, Plus, Trash2, Copy, Check,
  ChevronDown, ToggleLeft, ToggleRight, Loader2,
} from 'lucide-react';
import { cn } from '@utils/cn';
import type { WorkflowTrigger } from '@/types/workflow';

// --- Trigger type definitions ---

type TriggerType = WorkflowTrigger['type'];

const TRIGGER_TYPE_META: Record<TriggerType, { label: string; icon: React.ComponentType<{ size?: number; className?: string }>; description: string }> = {
  webhook: { label: 'Webhook', icon: Webhook, description: 'Trigger via HTTP POST request' },
  schedule: { label: 'Schedule', icon: Clock, description: 'Trigger on a cron schedule' },
  event: { label: 'Event', icon: Zap, description: 'Trigger on platform events' },
  manual: { label: 'Manual', icon: Zap, description: 'Trigger manually from UI or API' },
};

const CRON_PRESETS = [
  { label: 'Every 5 minutes', value: '*/5 * * * *' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every day at midnight', value: '0 0 * * *' },
  { label: 'Every Monday at 9am', value: '0 9 * * 1' },
  { label: 'Every 1st of month', value: '0 0 1 * *' },
];

const EVENT_TYPES = [
  { label: 'Artifact Created', value: 'artifact.created' },
  { label: 'Board Updated', value: 'board.updated' },
  { label: 'Gate Approved', value: 'gate.approved' },
  { label: 'Gate Rejected', value: 'gate.rejected' },
  { label: 'Run Completed', value: 'run.completed' },
  { label: 'Run Failed', value: 'run.failed' },
];

// --- Props ---

interface TriggerPanelProps {
  workflowId: string;
  triggers: WorkflowTrigger[];
  onAdd: (trigger: Omit<WorkflowTrigger, 'id'>) => void;
  onUpdate: (trigger: WorkflowTrigger) => void;
  onDelete: (triggerId: string) => void;
  isSaving?: boolean;
}

export default function TriggerPanel({
  workflowId,
  triggers,
  onAdd,
  onUpdate,
  onDelete,
  isSaving = false,
}: TriggerPanelProps) {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleAdd = useCallback(
    (type: TriggerType) => {
      const defaultConfig: Record<TriggerType, Record<string, unknown>> = {
        webhook: { endpoint: `/v0/hooks/${workflowId}`, method: 'POST' },
        schedule: { cron: '0 * * * *' },
        event: { eventType: 'artifact.created' },
        manual: {},
      };
      onAdd({ type, config: defaultConfig[type], isEnabled: true });
      setShowAddMenu(false);
    },
    [workflowId, onAdd],
  );

  const handleToggle = useCallback(
    (trigger: WorkflowTrigger) => {
      onUpdate({ ...trigger, isEnabled: !trigger.isEnabled });
    },
    [onUpdate],
  );

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const handleCopyUrl = useCallback(
    (triggerId: string, url: string) => {
      navigator.clipboard.writeText(url);
      setCopiedId(triggerId);
      setTimeout(() => setCopiedId(null), 2000);
    },
    [],
  );

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-[#1a1a1a]" />
          <h3 className="text-[13px] font-semibold text-[#1a1a1a]">Triggers</h3>
          <span className="rounded-full bg-[#efefef] px-2 py-0.5 text-[10px] font-medium text-[#8d8d8d]">
            {triggers.length}
          </span>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="flex h-[30px] items-center gap-1.5 rounded-[8px] border border-[#e0e0e0] px-3 text-[11px] font-medium text-[#6b6b6b] transition-colors hover:bg-[#f8f8f7] hover:text-[#1a1a1a]"
          >
            <Plus size={12} />
            Add Trigger
          </button>

          {showAddMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowAddMenu(false)} />
              <div className="absolute right-0 top-full z-50 mt-1 w-[220px] rounded-[12px] border border-[#ece9e3] bg-white p-1.5 shadow-lg">
                {(Object.entries(TRIGGER_TYPE_META) as [TriggerType, typeof TRIGGER_TYPE_META[TriggerType]][]).map(([type, meta]) => {
                  const Icon = meta.icon;
                  return (
                    <button
                      key={type}
                      onClick={() => handleAdd(type)}
                      className="flex w-full items-center gap-2.5 rounded-[8px] px-3 py-2 text-left transition-colors hover:bg-[#f8f8f7]"
                    >
                      <Icon size={14} className="text-[#8d8d8d]" />
                      <div>
                        <span className="block text-[12px] font-medium text-[#1a1a1a]">{meta.label}</span>
                        <span className="block text-[10px] text-[#949494]">{meta.description}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Empty state */}
      {triggers.length === 0 && (
        <div className="rounded-[12px] border border-dashed border-[#d4d4d4] bg-[#fafaf8] px-4 py-8 text-center">
          <Zap size={24} className="mx-auto mb-2 text-[#d4d4d4]" />
          <p className="text-[12px] font-medium text-[#949494]">No triggers configured</p>
          <p className="mt-0.5 text-[11px] text-[#b4b4b4]">
            Add a webhook, schedule, or event trigger to start workflows automatically.
          </p>
        </div>
      )}

      {/* Trigger list */}
      {triggers.map((trigger) => {
        const meta = TRIGGER_TYPE_META[trigger.type];
        const Icon = meta.icon;
        const isExpanded = expandedId === trigger.id;

        return (
          <div
            key={trigger.id}
            className={cn(
              'rounded-[12px] border bg-white transition-colors',
              trigger.isEnabled ? 'border-[#ece9e3]' : 'border-[#e8e8e8] opacity-60',
            )}
          >
            {/* Trigger header */}
            <div className="flex items-center gap-3 px-4 py-3">
              <div className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg',
                trigger.isEnabled ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400',
              )}>
                <Icon size={14} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-medium text-[#1a1a1a]">{meta.label}</span>
                  <span className={cn(
                    'rounded-full px-1.5 py-0.5 text-[9px] font-medium',
                    trigger.isEnabled
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-gray-100 text-gray-500',
                  )}>
                    {trigger.isEnabled ? 'Active' : 'Disabled'}
                  </span>
                </div>
                {trigger.type === 'webhook' && trigger.config?.endpoint && (
                  <span className="mt-0.5 block truncate font-mono text-[10px] text-[#949494]">
                    {String(trigger.config.endpoint)}
                  </span>
                )}
                {trigger.type === 'schedule' && trigger.config?.cron && (
                  <span className="mt-0.5 block font-mono text-[10px] text-[#949494]">
                    {String(trigger.config.cron)}
                  </span>
                )}
                {trigger.type === 'event' && trigger.config?.eventType && (
                  <span className="mt-0.5 block text-[10px] text-[#949494]">
                    {String(trigger.config.eventType)}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {/* Toggle */}
                <button
                  type="button"
                  onClick={() => handleToggle(trigger)}
                  className="p-1 text-[#949494] hover:text-[#1a1a1a]"
                  title={trigger.isEnabled ? 'Disable trigger' : 'Enable trigger'}
                >
                  {trigger.isEnabled ? (
                    <ToggleRight size={18} className="text-emerald-500" />
                  ) : (
                    <ToggleLeft size={18} />
                  )}
                </button>

                {/* Expand */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : trigger.id)}
                  className="rounded p-1 text-[#949494] hover:bg-[#f8f8f7] hover:text-[#1a1a1a]"
                >
                  <ChevronDown
                    size={14}
                    className={cn('transition-transform', isExpanded && 'rotate-180')}
                  />
                </button>

                {/* Delete */}
                <button
                  type="button"
                  onClick={() => onDelete(trigger.id)}
                  className="rounded p-1 text-[#949494] hover:bg-red-50 hover:text-red-500"
                  title="Delete trigger"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            {/* Expanded config */}
            {isExpanded && (
              <div className="border-t border-[#f0ede8] px-4 py-3">
                {trigger.type === 'webhook' && (
                  <WebhookConfig
                    trigger={trigger}
                    onUpdate={onUpdate}
                    copiedId={copiedId}
                    onCopy={handleCopyUrl}
                  />
                )}
                {trigger.type === 'schedule' && (
                  <ScheduleConfig trigger={trigger} onUpdate={onUpdate} />
                )}
                {trigger.type === 'event' && (
                  <EventConfig trigger={trigger} onUpdate={onUpdate} />
                )}
                {trigger.type === 'manual' && (
                  <div className="text-[11px] text-[#949494]">
                    Manual triggers can be started from the UI or via POST /v0/workflows/{workflowId}/run.
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Saving indicator */}
      {isSaving && (
        <div className="flex items-center gap-2 text-[11px] text-[#949494]">
          <Loader2 size={12} className="animate-spin" />
          Saving...
        </div>
      )}
    </div>
  );
}

// --- Sub-components for each trigger type ---

interface WebhookConfigProps {
  trigger: WorkflowTrigger;
  onUpdate: (trigger: WorkflowTrigger) => void;
  copiedId: string | null;
  onCopy: (id: string, url: string) => void;
}

function WebhookConfig({ trigger, onUpdate, copiedId, onCopy }: WebhookConfigProps) {
  const endpoint = String(trigger.config?.endpoint ?? '');
  const fullUrl = `https://api.airaie.io${endpoint}`;

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-[11px] font-medium text-[#949494]">Webhook URL</label>
        <div className="flex items-center gap-2">
          <div className="flex-1 overflow-x-auto rounded-md border border-[#eceae4] bg-[#f8f8f7] px-2.5 py-1.5 font-mono text-[11px] text-[#1a1a1a]">
            {fullUrl}
          </div>
          <button
            type="button"
            onClick={() => onCopy(trigger.id, fullUrl)}
            className="flex h-[30px] items-center gap-1 rounded-md border border-[#eceae4] px-2 text-[11px] text-[#8d8d8d] hover:bg-[#f8f8f7] hover:text-[#1a1a1a]"
          >
            {copiedId === trigger.id ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
            {copiedId === trigger.id ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-[11px] font-medium text-[#949494]">Method</label>
        <select
          value={String(trigger.config?.method ?? 'POST')}
          onChange={(e) =>
            onUpdate({ ...trigger, config: { ...trigger.config, method: e.target.value } })
          }
          className="w-full rounded-md border border-[#eceae4] bg-white px-2.5 py-1.5 text-xs text-[#1a1a1a] outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
        >
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
        </select>
      </div>
    </div>
  );
}

interface ScheduleConfigProps {
  trigger: WorkflowTrigger;
  onUpdate: (trigger: WorkflowTrigger) => void;
}

function ScheduleConfig({ trigger, onUpdate }: ScheduleConfigProps) {
  const cron = String(trigger.config?.cron ?? '');

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-[11px] font-medium text-[#949494]">Cron Expression</label>
        <input
          type="text"
          value={cron}
          onChange={(e) =>
            onUpdate({ ...trigger, config: { ...trigger.config, cron: e.target.value } })
          }
          placeholder="*/5 * * * *"
          className="w-full rounded-md border border-[#eceae4] bg-white px-2.5 py-1.5 font-mono text-xs text-[#1a1a1a] outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
        />
      </div>

      <div>
        <label className="mb-1 block text-[11px] font-medium text-[#949494]">Presets</label>
        <div className="flex flex-wrap gap-1.5">
          {CRON_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() =>
                onUpdate({ ...trigger, config: { ...trigger.config, cron: preset.value } })
              }
              className={cn(
                'rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors',
                cron === preset.value
                  ? 'bg-[#242424] text-white'
                  : 'bg-[#f0f0ec] text-[#6b6b6b] hover:bg-[#e0e0e0]',
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-[11px] font-medium text-[#949494]">Timezone</label>
        <select
          value={String(trigger.config?.timezone ?? 'UTC')}
          onChange={(e) =>
            onUpdate({ ...trigger, config: { ...trigger.config, timezone: e.target.value } })
          }
          className="w-full rounded-md border border-[#eceae4] bg-white px-2.5 py-1.5 text-xs text-[#1a1a1a] outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
        >
          <option value="UTC">UTC</option>
          <option value="America/New_York">America/New_York</option>
          <option value="America/Los_Angeles">America/Los_Angeles</option>
          <option value="Europe/London">Europe/London</option>
          <option value="Asia/Tokyo">Asia/Tokyo</option>
          <option value="Asia/Kolkata">Asia/Kolkata</option>
        </select>
      </div>
    </div>
  );
}

interface EventConfigProps {
  trigger: WorkflowTrigger;
  onUpdate: (trigger: WorkflowTrigger) => void;
}

function EventConfig({ trigger, onUpdate }: EventConfigProps) {
  const eventType = String(trigger.config?.eventType ?? '');

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-[11px] font-medium text-[#949494]">Event Type</label>
        <select
          value={eventType}
          onChange={(e) =>
            onUpdate({ ...trigger, config: { ...trigger.config, eventType: e.target.value } })
          }
          className="w-full rounded-md border border-[#eceae4] bg-white px-2.5 py-1.5 text-xs text-[#1a1a1a] outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
        >
          <option value="">Select event type...</option>
          {EVENT_TYPES.map((et) => (
            <option key={et.value} value={et.value}>
              {et.label}
            </option>
          ))}
        </select>
      </div>

      {eventType && (
        <div>
          <label className="mb-1 block text-[11px] font-medium text-[#949494]">Filter (optional)</label>
          <input
            type="text"
            value={String(trigger.config?.filter ?? '')}
            onChange={(e) =>
              onUpdate({ ...trigger, config: { ...trigger.config, filter: e.target.value } })
            }
            placeholder='e.g. source_workflow == "wf_mesh_gen"'
            className="w-full rounded-md border border-[#eceae4] bg-white px-2.5 py-1.5 font-mono text-xs text-[#1a1a1a] outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
          />
          <p className="mt-0.5 text-[10px] text-[#b4b4b4]">
            Optional expression to filter which events trigger this workflow.
          </p>
        </div>
      )}
    </div>
  );
}
