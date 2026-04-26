// D7: IntentSpecPicker — searchable dropdown for selecting which IntentSpec a
// card is linked to. Used by CreateCardModal (initial link) and
// LinkedIntentSection (re-link).

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Loader2, Lock, Search, Target, X } from 'lucide-react';
import { cn } from '@utils/cn';
import { useIntentList } from '@hooks/useIntents';
import { intentDisplayName } from '@utils/intentLink';
import type { IntentSpec, IntentStatus } from '@/types/intent';

// ---------------------------------------------------------------------------
// Status badge config (matches the IntentStatus enum).
// ---------------------------------------------------------------------------

const STATUS_BADGE: Record<IntentStatus, { label: string; bg: string; text: string }> = {
  draft: { label: 'Draft', bg: 'bg-[#f0f0ec]', text: 'text-[#6b6b6b]' },
  locked: { label: 'Locked', bg: 'bg-[#fff3e0]', text: 'text-[#ff9800]' },
  active: { label: 'Active', bg: 'bg-[#e3f2fd]', text: 'text-[#2196f3]' },
  completed: { label: 'Completed', bg: 'bg-[#e8f5e9]', text: 'text-[#4caf50]' },
  failed: { label: 'Failed', bg: 'bg-[#ffebee]', text: 'text-[#e74c3c]' },
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface IntentSpecPickerProps {
  boardId: string;
  value: string | undefined;
  onChange: (id: string | undefined) => void;
  disabled?: boolean;
  allowClear?: boolean;
  /**
   * Optional callback invoked when the user clicks the "Create one" link
   * shown in the empty state. If omitted, the empty state renders text only.
   */
  onCreateIntent?: () => void;
  /**
   * If provided, intents whose `id` is in this set are not selectable. Used to
   * grey out locked intents that would orphan existing evidence (see canRelink).
   */
  disabledIntentIds?: Set<string>;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function IntentSpecPicker({
  boardId,
  value,
  onChange,
  disabled = false,
  allowClear = false,
  onCreateIntent,
  disabledIntentIds,
  className,
}: IntentSpecPickerProps) {
  const { data: intents, isLoading, isError } = useIntentList(boardId);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [open]);

  // Reset query when closing.
  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const selected = useMemo<IntentSpec | undefined>(
    () => intents?.find((i) => i.id === value),
    [intents, value],
  );

  const filtered = useMemo(() => {
    if (!intents) return [];
    const q = query.trim().toLowerCase();
    if (!q) return intents;
    return intents.filter((i) => {
      const haystack = [
        intentDisplayName(i),
        i.intent_type ?? '',
        i.id,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [intents, query]);

  const triggerLabel = selected ? intentDisplayName(selected) : 'Select an IntentSpec…';

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* ── Trigger ────────────────────────────────────────── */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'w-full h-[38px] px-[12px] rounded-[8px] border text-[13px] flex items-center gap-[8px] transition-colors',
          disabled
            ? 'bg-[#fafafa] border-[#e8e8e8] text-[#acacac] cursor-not-allowed'
            : 'bg-white border-[#e8e8e8] hover:border-[#d0d0d0] focus:outline-none focus:border-[#ff9800]',
          open && !disabled && 'border-[#ff9800]',
        )}
      >
        <Target size={14} className="shrink-0 text-[#acacac]" />
        <span
          className={cn(
            'flex-1 min-w-0 text-left truncate',
            selected ? 'text-[#1a1a1a]' : 'text-[#acacac]',
          )}
        >
          {triggerLabel}
        </span>

        {selected && (
          <span
            className={cn(
              'h-[18px] px-[6px] rounded-[4px] text-[9px] font-semibold uppercase shrink-0 inline-flex items-center',
              STATUS_BADGE[selected.status].bg,
              STATUS_BADGE[selected.status].text,
            )}
          >
            {STATUS_BADGE[selected.status].label}
          </span>
        )}

        {allowClear && selected && !disabled && (
          <span
            role="button"
            tabIndex={0}
            aria-label="Clear selection"
            onClick={(e) => {
              e.stopPropagation();
              onChange(undefined);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                onChange(undefined);
              }
            }}
            className="w-[18px] h-[18px] rounded-[4px] flex items-center justify-center text-[#acacac] hover:text-[#e74c3c] hover:bg-[#ffebee] transition-colors shrink-0"
          >
            <X size={12} />
          </span>
        )}
        <ChevronDown
          size={14}
          className={cn(
            'shrink-0 text-[#acacac] transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {/* ── Dropdown ───────────────────────────────────────── */}
      {open && !disabled && (
        <div className="absolute z-50 mt-[4px] w-full bg-white border border-[#e8e8e8] rounded-[10px] shadow-[0px_8px_24px_rgba(0,0,0,0.08)] overflow-hidden">
          {/* Search */}
          <div className="px-[10px] py-[8px] border-b border-[#f0f0ec] flex items-center gap-[6px]">
            <Search size={12} className="text-[#acacac] shrink-0" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by goal, type, or id…"
              className="flex-1 text-[12px] text-[#1a1a1a] placeholder:text-[#acacac] focus:outline-none bg-transparent"
            />
          </div>

          {/* Body */}
          <div className="max-h-[280px] overflow-y-auto">
            {/* Loading */}
            {isLoading && (
              <div className="flex items-center gap-[6px] px-[12px] py-[14px]">
                <Loader2 size={12} className="animate-spin text-[#acacac]" />
                <span className="text-[11px] text-[#acacac]">Loading intents…</span>
              </div>
            )}

            {/* Error */}
            {isError && (
              <div className="px-[12px] py-[14px]">
                <span className="text-[11px] text-[#e74c3c]">Failed to load intents.</span>
              </div>
            )}

            {/* Empty state */}
            {!isLoading && !isError && (intents?.length ?? 0) === 0 && (
              <div className="px-[12px] py-[16px] flex flex-col gap-[6px]">
                <span className="text-[12px] text-[#1a1a1a] font-medium">
                  No intents on this board.
                </span>
                {onCreateIntent ? (
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      onCreateIntent();
                    }}
                    className="text-[11px] text-[#ff9800] font-medium text-left hover:underline"
                  >
                    Create one in the right rail →
                  </button>
                ) : (
                  <span className="text-[11px] text-[#acacac]">
                    Create one in the right rail to link this card.
                  </span>
                )}
              </div>
            )}

            {/* Allow-clear option */}
            {!isLoading && !isError && allowClear && (intents?.length ?? 0) > 0 && (
              <button
                type="button"
                onClick={() => {
                  onChange(undefined);
                  setOpen(false);
                }}
                className={cn(
                  'w-full px-[12px] py-[8px] flex items-center gap-[8px] text-left border-b border-[#f0f0ec] hover:bg-[#fafafa] transition-colors',
                  value === undefined && 'bg-[#fff8e6]',
                )}
              >
                <span className="text-[12px] text-[#6b6b6b] italic">
                  None — link later
                </span>
              </button>
            )}

            {/* Filtered results */}
            {!isLoading && !isError &&
              filtered.map((intent) => {
                const selectedRow = intent.id === value;
                const itemDisabled = disabledIntentIds?.has(intent.id) ?? false;
                const status = STATUS_BADGE[intent.status];
                return (
                  <button
                    key={intent.id}
                    type="button"
                    disabled={itemDisabled}
                    onClick={() => {
                      onChange(intent.id);
                      setOpen(false);
                    }}
                    title={
                      itemDisabled
                        ? 'This intent is locked — re-linking would orphan existing evidence.'
                        : undefined
                    }
                    className={cn(
                      'w-full px-[12px] py-[10px] flex items-center gap-[8px] text-left border-b border-[#f0f0ec] last:border-b-0 transition-colors',
                      itemDisabled
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-[#fafafa] cursor-pointer',
                      selectedRow && 'bg-[#fff8e6]',
                    )}
                  >
                    {intent.status === 'locked' ? (
                      <Lock size={12} className="shrink-0 text-[#ff9800]" />
                    ) : (
                      <Target size={12} className="shrink-0 text-[#acacac]" />
                    )}

                    <div className="flex-1 min-w-0">
                      <span className="block text-[12px] font-medium text-[#1a1a1a] truncate">
                        {intentDisplayName(intent)}
                      </span>
                      <div className="flex items-center gap-[6px] mt-[2px]">
                        <span className="h-[16px] px-[5px] rounded-[3px] bg-[#f0f0ec] text-[#6b6b6b] text-[9px] font-mono inline-flex items-center">
                          {intent.intent_type}
                        </span>
                        {intent.acceptance_criteria?.length > 0 && (
                          <span className="text-[9px] text-[#acacac]">
                            {intent.acceptance_criteria.length} criteria
                          </span>
                        )}
                      </div>
                    </div>

                    <span
                      className={cn(
                        'h-[18px] px-[6px] rounded-[4px] text-[9px] font-semibold uppercase shrink-0 inline-flex items-center',
                        status.bg,
                        status.text,
                      )}
                    >
                      {status.label}
                    </span>
                  </button>
                );
              })}

            {/* No results from filter */}
            {!isLoading &&
              !isError &&
              (intents?.length ?? 0) > 0 &&
              filtered.length === 0 && (
                <div className="px-[12px] py-[14px]">
                  <span className="text-[11px] text-[#acacac]">
                    No intents match "{query}".
                  </span>
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  );
}
