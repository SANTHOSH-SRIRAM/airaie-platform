import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react';
import { Box, Database, Hash } from 'lucide-react';
import { cn } from '@utils/cn';
import type { UpstreamOutputSuggestion } from '@utils/upstreamOutputs';

export interface ExpressionAutocompleteProps {
  value: string;
  onChange: (next: string) => void;
  suggestions: UpstreamOutputSuggestion[];
  placeholder?: string;
  className?: string;
  /** When true, render a textarea instead of a single-line input. */
  multiline?: boolean;
  readOnly?: boolean;
  /** Optional `id` forwarded to the underlying input for label association. */
  id?: string;
}

/** Color chips per port type, matching the journey palette used elsewhere. */
const TYPE_CHIP: Record<string, { label: string; className: string; Icon: typeof Box }> = {
  artifact: {
    label: 'artifact',
    className: 'bg-orange-50 text-orange-700 border-orange-200',
    Icon: Database,
  },
  parameter: {
    label: 'param',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
    Icon: Box,
  },
  metric: {
    label: 'metric',
    className: 'bg-purple-50 text-purple-700 border-purple-200',
    Icon: Hash,
  },
};

interface CaretContext {
  /** True if the caret is inside an unmatched `{{ ... }}`. */
  insideExpr: boolean;
  /** Substring inside the expression after `{{ ` and before the caret. */
  query: string;
  /** Offset of the opening `{{` in `value` (or -1). */
  openIdx: number;
  /** Offset of the closing `}}` in `value`, if any (or -1 = open-ended). */
  closeIdx: number;
}

/**
 * Inspect `value` and `caret` to decide whether the caret sits inside an
 * unmatched `{{ ... }}` block. If so, return the substring between the
 * opening braces and the caret (the autocomplete query) plus the offsets of
 * the surrounding braces so we can replace cleanly.
 */
function getCaretContext(value: string, caret: number): CaretContext {
  // Find the LAST `{{` at or before the caret.
  const head = value.slice(0, caret);
  const openIdx = head.lastIndexOf('{{');
  if (openIdx === -1) return { insideExpr: false, query: '', openIdx: -1, closeIdx: -1 };

  // If a `}}` falls between that `{{` and the caret, we're outside.
  const closeBefore = head.indexOf('}}', openIdx);
  if (closeBefore !== -1 && closeBefore < caret) {
    return { insideExpr: false, query: '', openIdx: -1, closeIdx: -1 };
  }

  // Find the next `}}` after the caret (may not exist yet).
  const closeIdx = value.indexOf('}}', caret);

  // The query is everything from after `{{` (and any whitespace) up to caret.
  const inner = value.slice(openIdx + 2, caret);
  const query = inner.replace(/^\s+/, '');

  return { insideExpr: true, query, openIdx, closeIdx };
}

/**
 * Filter suggestions by matching the query (case-insensitive) against the
 * port name OR the node name. Empty query returns the full list.
 */
function filterSuggestions(
  suggestions: UpstreamOutputSuggestion[],
  query: string,
): UpstreamOutputSuggestion[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return suggestions;
  return suggestions.filter((s) => {
    return (
      s.port.toLowerCase().includes(trimmed) ||
      s.nodeName.toLowerCase().includes(trimmed)
    );
  });
}

/**
 * Replace the `{{ ... }}` block (or the partial `{{ ... ` if not yet closed)
 * around the caret with `{{ <expression> }}`, returning the new value and the
 * caret position to set after insertion.
 */
function insertSuggestion(
  value: string,
  ctx: CaretContext,
  expression: string,
): { next: string; caret: number } {
  const before = value.slice(0, ctx.openIdx);
  // closeIdx === -1 means the `}}` was never typed. We append it ourselves.
  const tailStart = ctx.closeIdx === -1 ? value.length : ctx.closeIdx + 2;
  const after = value.slice(tailStart);
  const inserted = `{{ ${expression} }}`;
  return { next: before + inserted + after, caret: before.length + inserted.length };
}

export default function ExpressionAutocomplete({
  value,
  onChange,
  suggestions,
  placeholder,
  className,
  multiline = false,
  readOnly = false,
  id,
}: ExpressionAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generatedId = useId();
  const listboxId = `${id ?? generatedId}-listbox`;

  const [caret, setCaret] = useState(0);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  const ctx = useMemo(() => getCaretContext(value, caret), [value, caret]);

  const filtered = useMemo(
    () => (ctx.insideExpr ? filterSuggestions(suggestions, ctx.query) : []),
    [ctx.insideExpr, ctx.query, suggestions],
  );

  const popoverOpen = open && ctx.insideExpr && !readOnly;

  // Keep activeIdx in range whenever the filtered list shrinks.
  useEffect(() => {
    if (activeIdx >= filtered.length) setActiveIdx(0);
  }, [filtered.length, activeIdx]);

  // Track the caret on every selection change while focused.
  const syncCaret = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    setCaret(el.selectionStart ?? value.length);
  }, [value.length]);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange(e.target.value);
      // Schedule a caret read after React applies the new value.
      requestAnimationFrame(syncCaret);
    },
    [onChange, syncCaret],
  );

  const applySuggestion = useCallback(
    (s: UpstreamOutputSuggestion) => {
      const { next, caret: nextCaret } = insertSuggestion(value, ctx, s.expression);
      onChange(next);
      setOpen(false);
      requestAnimationFrame(() => {
        const el = inputRef.current;
        if (!el) return;
        el.focus();
        try {
          el.setSelectionRange(nextCaret, nextCaret);
        } catch {
          // Some input types throw on setSelectionRange; ignore.
        }
        setCaret(nextCaret);
      });
    },
    [ctx, onChange, value],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (!popoverOpen || filtered.length === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx((i) => (i + 1) % filtered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx((i) => (i - 1 + filtered.length) % filtered.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const target = filtered[activeIdx] ?? filtered[0];
        if (target) applySuggestion(target);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
      }
    },
    [popoverOpen, filtered, activeIdx, applySuggestion],
  );

  const handleFocus = useCallback(() => {
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
    setOpen(true);
    syncCaret();
  }, [syncCaret]);

  const handleBlur = useCallback(() => {
    // Delay so a click on a suggestion can register first.
    blurTimerRef.current = setTimeout(() => setOpen(false), 150);
  }, []);

  // Clean up any pending blur timer on unmount.
  useEffect(
    () => () => {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    },
    [],
  );

  const sharedProps = {
    ref: inputRef as React.Ref<HTMLInputElement & HTMLTextAreaElement>,
    id,
    value,
    onChange: handleChange,
    onKeyDown: handleKeyDown,
    onKeyUp: syncCaret,
    onClick: syncCaret,
    onSelect: syncCaret,
    onFocus: handleFocus,
    onBlur: handleBlur,
    readOnly,
    placeholder,
    role: 'combobox' as const,
    'aria-expanded': popoverOpen,
    'aria-controls': listboxId,
    'aria-autocomplete': 'list' as const,
    'aria-activedescendant':
      popoverOpen && filtered.length > 0 ? `${listboxId}-opt-${activeIdx}` : undefined,
    className: cn(
      'w-full rounded-md border px-2.5 py-1.5 font-mono text-xs outline-none',
      'border-amber-300 bg-amber-50 text-amber-800',
      'focus:border-amber-400 focus:ring-1 focus:ring-amber-400',
      readOnly && 'cursor-not-allowed opacity-60',
      className,
    ),
  };

  return (
    <div className="relative">
      {multiline ? (
        <textarea {...sharedProps} rows={3} />
      ) : (
        <input type="text" {...sharedProps} />
      )}

      {popoverOpen && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-20 mt-1 max-h-[220px] overflow-y-auto rounded-lg border border-[#eceae4] bg-white py-1 shadow-md"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-[11px] text-[#949494]" role="presentation">
              {suggestions.length === 0
                ? 'No upstream outputs yet. Connect this node to an upstream node first.'
                : 'No matching outputs.'}
            </li>
          ) : (
            filtered.map((s, idx) => {
              const chip = (s.type && TYPE_CHIP[s.type]) ?? null;
              const optionId = `${listboxId}-opt-${idx}`;
              const active = idx === activeIdx;
              return (
                <li
                  key={`${s.nodeId}.${s.port}.${idx}`}
                  id={optionId}
                  role="option"
                  aria-selected={active}
                  // onMouseDown to fire BEFORE the input's blur.
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActiveIdx(idx)}
                  onClick={() => applySuggestion(s)}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 px-3 py-1.5 text-left',
                    active ? 'bg-amber-50' : 'hover:bg-[#f8f8f7]',
                  )}
                >
                  <span className="flex-1 truncate text-[12px]">
                    <span className="font-semibold text-[#1a1a1a]">{s.nodeName}</span>
                    <span className="text-[#949494]">.</span>
                    <span className="font-mono text-[#6b6b6b]">{s.port}</span>
                  </span>
                  {chip && (
                    <span
                      className={cn(
                        'inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[10px]',
                        chip.className,
                      )}
                    >
                      <chip.Icon size={9} />
                      {chip.label}
                    </span>
                  )}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
