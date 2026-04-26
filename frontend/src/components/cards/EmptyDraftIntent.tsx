import { Sparkles, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ---------------------------------------------------------------------------
// EmptyDraftIntent — large empty-state body section rendered between the
// CardHero and the configuration tables when a Card has no IntentSpec yet.
//
// Why a dedicated component (and not a one-liner)? Because the draft state
// is the most common entry point — a user creates a blank Card, lands here,
// and the next thing they should do is decide HOW to draft the intent.
// We surface two paths:
//   - AI Assist: opens the Board's BoardAssistPanel scoped to this Card
//     (Phase 8 stubs to a navigation; full wiring ships in a later phase).
//   - Manual: opens the inline IntentSpecForm (Phase 8 stubs to a Board
//     navigation with a flag; full wiring ships separately).
//
// Once the user creates an IntentSpec, this component is replaced by the
// configured-state body (AvailableInputsTable + AvailableMethodsTable +
// AddCustomKpiForm) automatically (CardDetailPage's lifecycle stage flips
// from 'draft' to 'configured').
// ---------------------------------------------------------------------------

interface EmptyDraftIntentProps {
  boardId: string;
  cardId: string;
}

export default function EmptyDraftIntent({ boardId, cardId: _cardId }: EmptyDraftIntentProps) {
  const navigate = useNavigate();

  const handleAiAssist = () => {
    // BoardAssistPanel lives on the Board route. Navigate there with a flag
    // so the Board can auto-open the panel and (in a later phase) auto-scope
    // its Draft-Intent flow to this Card. Phase 8 ships only the navigation.
    navigate(`/boards/${boardId}?assist=draft-intent`);
  };

  const handleManual = () => {
    navigate(`/boards/${boardId}?manual=create-intent`);
  };

  return (
    <section
      role="region"
      aria-label="Draft an IntentSpec"
      className="bg-white rounded-[12px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.04)] border border-[#f0f0ec] p-[32px] flex flex-col items-center text-center"
    >
      <span className="text-[48px] leading-none mb-[16px]" aria-hidden="true">
        🎯
      </span>
      <h2 className="text-[18px] font-bold text-[#1a1a1a] mb-[8px]">
        Draft an IntentSpec for this Card
      </h2>
      <p className="text-[13px] text-[#6b6b6b] max-w-[440px] mb-[24px] leading-[1.6]">
        An IntentSpec defines what "done" means for this Card — the goal,
        acceptance criteria (KPIs), and any constraints. Once you have one,
        this page unlocks the configuration tables and the Run flow.
      </p>
      <div className="flex items-center gap-[8px]">
        <button
          type="button"
          onClick={handleAiAssist}
          aria-label="Draft IntentSpec with AI Assist"
          className="inline-flex items-center gap-[6px] h-[36px] px-[14px] rounded-[8px] bg-[#f57c00] text-white text-[12px] font-semibold hover:bg-[#e65100] transition-colors"
        >
          <Sparkles size={12} aria-hidden="true" />
          Draft with AI Assist
        </button>
        <button
          type="button"
          onClick={handleManual}
          aria-label="Create IntentSpec manually"
          className="inline-flex items-center gap-[6px] h-[36px] px-[14px] rounded-[8px] bg-white border border-[#e0e0e0] text-[#1a1a1a] text-[12px] font-medium hover:bg-[#fafafa] transition-colors"
        >
          <Plus size={12} aria-hidden="true" />
          Create manually
        </button>
      </div>
    </section>
  );
}
