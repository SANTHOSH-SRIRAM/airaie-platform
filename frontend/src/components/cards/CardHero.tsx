import { useState, useEffect, useRef } from 'react';
import { Sparkles, Pencil, Save, X } from 'lucide-react';
import { cn } from '@utils/cn';
import { useUpdateIntent } from '@hooks/useIntents';
import type { Card } from '@/types/card';
import type { IntentSpec } from '@/types/intent';
import type { CardModeRules } from '@hooks/useCardModeRules';

// ---------------------------------------------------------------------------
// CardHero — top-of-body govern surface
//
// Renders the IntentSpec goal + KPI summary as a Canva-style hero card. This
// is the first thing users see on a Card page. It serves three jobs:
//   1. Restate the intent of the Card in big, click-to-edit form (Explore-only).
//   2. Surface the KPIs (acceptance criteria) so users see what "done" means
//      before they even hit Run.
//   3. Provide the entry point to AI-Assist refine + IntentSpec editor.
//
// The orange tint (`#fff8f0`) marks this as a Govern surface per the Wave-1
// design decision: "Mode badge is the visual cue. Hero stays orange (Govern)."
//
// When `card.intent_spec_id` is null we render an empty-state hero that
// prompts the user to draft an IntentSpec — the entry point to the
// configured-state of the Card lifecycle.
// ---------------------------------------------------------------------------

interface CardHeroProps {
  card: Card;
  intent: IntentSpec | undefined;
  rules: CardModeRules;
}

// Intent-type → emoji map. We don't have a full vertical-registry on the
// frontend (research doc notes this); this small inline map covers the
// kernel's seeded intent_types. Falls back to 🎯 for anything unknown.
const INTENT_TYPE_EMOJI: Record<string, string> = {
  cfd_analysis: '🌬️',
  fea_analysis: '🔧',
  fea_static: '🔧',
  doe_study: '📊',
  optimization: '🎯',
  generative_design: '✨',
  data_analysis: '📈',
  experiment: '🧪',
  // Sciences
  ml_classification: '🤖',
  ml_regression: '📉',
  // Default
  default: '🎯',
};

function emojiForIntentType(intentType: string | undefined): string {
  if (!intentType) return INTENT_TYPE_EMOJI.default;
  return INTENT_TYPE_EMOJI[intentType] ?? INTENT_TYPE_EMOJI.default;
}

// ---------------------------------------------------------------------------
// Empty state — no IntentSpec yet
// ---------------------------------------------------------------------------

function EmptyHero({ card }: { card: Card }) {
  const emoji = emojiForIntentType(card.intent_type);
  return (
    <section
      aria-label="Card intent"
      className="bg-[#fff8f0] rounded-[12px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.04)] p-[24px] border border-[#ffe0b2]"
    >
      <div className="flex items-center gap-[8px] mb-[12px]">
        <span className="inline-flex items-center gap-[4px] h-[22px] px-[10px] rounded-full bg-[#fff3e0] text-[#f57c00] text-[10px] font-semibold uppercase tracking-[0.5px]">
          <Sparkles size={10} className="text-[#f57c00]" aria-hidden="true" />
          Card Intent
        </span>
      </div>
      <h1 className="text-[32px] font-bold text-[#1a1a1a] tracking-tight mb-[8px] flex items-center gap-[12px]">
        <span aria-hidden="true">{emoji}</span>
        <span>{card.title || 'Untitled Card'}</span>
      </h1>
      <p className="text-[13px] text-[#6b6b6b] mb-[16px]">
        Start by drafting your IntentSpec. Define the goal, set acceptance
        criteria, and let the platform handle the rest. Everything for this
        Card lives on this page.
      </p>
      <button
        type="button"
        aria-label="Draft IntentSpec with AI"
        className="inline-flex items-center gap-[6px] h-[36px] px-[14px] rounded-[8px] bg-[#f57c00] text-white text-[12px] font-semibold hover:bg-[#e65100] transition-colors"
      >
        <Sparkles size={12} aria-hidden="true" />
        Draft IntentSpec with AI
      </button>
    </section>
  );
}

// ---------------------------------------------------------------------------
// CardHero — full state
// ---------------------------------------------------------------------------

export default function CardHero({ card, intent, rules }: CardHeroProps) {
  // Empty hero when no IntentSpec yet
  if (!intent) {
    return <EmptyHero card={card} />;
  }

  return <FilledHero card={card} intent={intent} rules={rules} />;
}

// Separate filled-state component so the inline-edit local state lives
// outside the conditional return.
function FilledHero({
  card,
  intent,
  rules,
}: {
  card: Card;
  intent: IntentSpec;
  rules: CardModeRules;
}) {
  const updateIntent = useUpdateIntent(intent.id, card.board_id);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(intent.goal);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!editing) setDraft(intent.goal);
  }, [intent.goal, editing]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const emoji = emojiForIntentType(intent.intent_type);
  const kpiCount = intent.acceptance_criteria?.length ?? 0;
  const verticalSlug = intent.context?.vertical_slug ?? 'engineering';

  const isDirty = editing && draft.trim() !== intent.goal && draft.trim().length > 0;

  const handleSave = async () => {
    const next = draft.trim();
    if (!next || next === intent.goal) {
      setEditing(false);
      setDraft(intent.goal);
      return;
    }
    try {
      await updateIntent.mutateAsync({ goal: next });
      setEditing(false);
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? 'Failed to update intent goal';
      window.alert(msg);
      setDraft(intent.goal);
      setEditing(false);
    }
  };

  const handleCancel = () => {
    setDraft(intent.goal);
    setEditing(false);
  };

  return (
    <section
      aria-label="Card intent"
      className="bg-[#fff8f0] rounded-[12px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.04)] p-[24px] border border-[#ffe0b2]"
    >
      {/* Tag row */}
      <div className="flex items-center gap-[8px] mb-[12px]">
        <span className="inline-flex items-center gap-[4px] h-[22px] px-[10px] rounded-full bg-[#fff3e0] text-[#f57c00] text-[10px] font-semibold uppercase tracking-[0.5px]">
          <Sparkles size={10} className="text-[#f57c00]" aria-hidden="true" />
          Card Intent
        </span>
        {intent.status === 'locked' && (
          <span className="h-[22px] px-[10px] rounded-full bg-[#e8f5e9] text-[#2e7d32] text-[10px] font-semibold uppercase tracking-[0.5px] inline-flex items-center">
            Locked
          </span>
        )}
      </div>

      {/* Heading — click to edit */}
      {editing ? (
        <div className="flex items-start gap-[8px] mb-[8px]">
          <span className="text-[32px] leading-[1.1]" aria-hidden="true">
            {emoji}
          </span>
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-label="Edit intent goal"
            rows={2}
            className="flex-1 text-[28px] font-bold text-[#1a1a1a] tracking-tight bg-white border-2 border-[#ff9800] rounded-[8px] px-[12px] py-[6px] outline-none resize-none"
          />
          <div className="flex flex-col gap-[4px] shrink-0">
            <button
              type="button"
              onClick={handleSave}
              disabled={!isDirty || updateIntent.isPending}
              aria-label="Save intent goal"
              className={cn(
                'p-[8px] rounded-[6px] bg-[#1a1a1a] text-white hover:bg-[#2d2d2d] transition-colors',
                (!isDirty || updateIntent.isPending) && 'opacity-60 cursor-not-allowed',
              )}
            >
              <Save size={14} />
            </button>
            <button
              type="button"
              onClick={handleCancel}
              aria-label="Cancel edit"
              className="p-[8px] rounded-[6px] hover:bg-[#f0f0ec] text-[#6b6b6b] transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ) : (
        <h1 className="text-[32px] font-bold text-[#1a1a1a] tracking-tight mb-[8px] flex items-start gap-[12px] group">
          <span aria-hidden="true">{emoji}</span>
          <span className="flex-1">
            {intent.goal || 'Click to set goal'}
          </span>
          {rules.canEditIntentGoalAndKpis && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label="Edit intent goal"
              title="Edit goal"
              className="p-[6px] rounded-[6px] hover:bg-white/60 text-[#6b6b6b] hover:text-[#1a1a1a] opacity-0 group-hover:opacity-100 transition-opacity self-start"
            >
              <Pencil size={14} />
            </button>
          )}
        </h1>
      )}

      {/* Meta line */}
      <p className="text-[12px] text-[#6b6b6b] mb-[12px]">
        {intent.intent_type} <span className="text-[#d0d0d0] mx-[4px]">·</span>{' '}
        {verticalSlug} <span className="text-[#d0d0d0] mx-[4px]">·</span>{' '}
        {kpiCount} {kpiCount === 1 ? 'KPI' : 'KPIs'}
      </p>

      {/* Description */}
      <p className="text-[13px] text-[#6b6b6b] leading-[1.6] mb-[16px]">
        Author the Intent, pin Inputs, choose a Method, run, and review the
        Evidence. Everything for this Card lives on this page.
      </p>

      {/* KPI list */}
      {kpiCount > 0 && (
        <ul aria-label="Acceptance criteria" className="mb-[16px] flex flex-col gap-[4px]">
          {intent.acceptance_criteria.map((c) => (
            <li
              key={c.id}
              className="text-[12px] text-[#1a1a1a] flex items-center gap-[8px] before:content-['•'] before:text-[#f57c00] before:font-bold"
            >
              <span className="font-medium">{c.metric}</span>
              <span className="text-[#6b6b6b]">{c.operator}</span>
              <span className="text-[#1a1a1a]">
                {Array.isArray(c.threshold)
                  ? `[${(c.threshold as unknown[]).join(', ')}]`
                  : String(c.threshold ?? '—')}
              </span>
              {c.unit && <span className="text-[#acacac]">{c.unit}</span>}
            </li>
          ))}
        </ul>
      )}

      {/* Action row */}
      <div className="flex items-center gap-[8px]">
        {rules.canEditIntentGoalAndKpis && !editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label="Edit intent"
            className="inline-flex items-center gap-[6px] h-[34px] px-[12px] rounded-[8px] bg-white border border-[#e0e0e0] text-[#1a1a1a] text-[12px] font-medium hover:bg-[#fafafa] transition-colors"
          >
            <Pencil size={12} />
            Edit Intent
          </button>
        )}
        <button
          type="button"
          aria-label="Refine with AI"
          title="Open AI Assist drawer (full wiring in a later phase)"
          className="inline-flex items-center gap-[6px] h-[34px] px-[12px] rounded-[8px] bg-[#fff3e0] border border-[#ffe0b2] text-[#f57c00] text-[12px] font-medium hover:bg-[#ffe0b2] transition-colors"
        >
          <Sparkles size={12} />
          Refine with AI
        </button>
      </div>
    </section>
  );
}
