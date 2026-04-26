import { useEffect, useState } from 'react';
import { cn } from '@utils/cn';
import { useCreateCard } from '@hooks/useCards';
import { useIntentList } from '@hooks/useIntents';
import type { CardType, CardKPI } from '@/types/card';
import { X, Plus, Trash2, Loader2, AlertTriangle } from 'lucide-react';
// D7: IntentSpec picker
import IntentSpecPicker from './IntentSpecPicker';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

const CARD_TYPES: { value: CardType; label: string }[] = [
  { value: 'analysis', label: 'Analysis' },
  { value: 'comparison', label: 'Comparison' },
  { value: 'sweep', label: 'Sweep' },
  { value: 'agent', label: 'Agent' },
  { value: 'gate', label: 'Gate' },
  { value: 'milestone', label: 'Milestone' },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CreateCardModalProps {
  boardId: string;
  isOpen: boolean;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CreateCardModal({ boardId, isOpen, onClose }: CreateCardModalProps) {
  const createCard = useCreateCard(boardId);
  // D7: load intents to expose the picker + smart default.
  const { data: intents } = useIntentList(boardId);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cardType, setCardType] = useState<CardType>('analysis');
  const [intentType, setIntentType] = useState('');
  const [kpis, setKpis] = useState<CardKPI[]>([]);
  // D7: intent_spec_id link
  const [intentSpecId, setIntentSpecId] = useState<string | undefined>(undefined);

  // D7: pre-populate with the board's only intent if there's exactly one and
  // the user hasn't picked anything yet. Re-runs when the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    if (intentSpecId) return;
    if (intents && intents.length === 1) {
      setIntentSpecId(intents[0].id);
    }
  }, [isOpen, intents, intentSpecId]);

  const addKpi = () => {
    setKpis((prev) => [
      ...prev,
      { metric_key: '', target_value: 0, unit: '', tolerance: 0 },
    ]);
  };

  const removeKpi = (index: number) => {
    setKpis((prev) => prev.filter((_, i) => i !== index));
  };

  const updateKpi = (index: number, field: keyof CardKPI, value: string | number) => {
    setKpis((prev) =>
      prev.map((kpi, i) => (i === index ? { ...kpi, [field]: value } : kpi)),
    );
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;

    await createCard.mutateAsync({
      title: title.trim(),
      card_type: cardType,
      intent_type: intentType.trim() || undefined,
      description: description.trim() || undefined,
      kpis: kpis.filter((k) => k.metric_key.trim()),
      // D7: link card to IntentSpec on creation. Backend stores via the
      // `intent_spec_id` column on `cards` (whitelisted in postgres_cards.go).
      intent_spec_id: intentSpecId,
    });

    // Reset form
    setTitle('');
    setDescription('');
    setCardType('analysis');
    setIntentType('');
    setKpis([]);
    setIntentSpecId(undefined);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-[16px] shadow-[0px_8px_40px_rgba(0,0,0,0.2)] w-[520px] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-[24px] py-[16px] border-b border-[#f0f0ec]">
          <h2 className="text-[16px] font-semibold text-[#1a1a1a]">Create Card</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-[28px] h-[28px] flex items-center justify-center rounded-[6px] text-[#acacac] hover:text-[#6b6b6b] hover:bg-[#f0f0ec] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-[24px] py-[20px] flex flex-col gap-[16px]">
          {/* Title */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[#acacac] block mb-[6px]">
              Title <span className="text-[#e74c3c]">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. FEA Stress Analysis"
              className="w-full h-[38px] px-[12px] rounded-[8px] border border-[#e8e8e8] text-[13px] text-[#1a1a1a] placeholder:text-[#acacac] focus:outline-none focus:border-[#ff9800] transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[#acacac] block mb-[6px]">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this card's purpose..."
              rows={3}
              className="w-full px-[12px] py-[10px] rounded-[8px] border border-[#e8e8e8] text-[13px] text-[#1a1a1a] placeholder:text-[#acacac] focus:outline-none focus:border-[#ff9800] transition-colors resize-none"
            />
          </div>

          {/* D7: Linked IntentSpec */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[#acacac] block mb-[6px]">
              Linked IntentSpec
            </label>
            <IntentSpecPicker
              boardId={boardId}
              value={intentSpecId}
              onChange={setIntentSpecId}
              allowClear
            />
            {!intentSpecId && (
              <div className="mt-[6px] flex items-start gap-[6px] p-[8px] rounded-[6px] bg-[#fff3e0] border border-[#ffe0b2]">
                <AlertTriangle size={12} className="text-[#ff9800] shrink-0 mt-[1px]" />
                <span className="text-[10px] text-[#6b6b6b] leading-[14px]">
                  This card has no IntentSpec — its evidence will be empty until linked.
                </span>
              </div>
            )}
          </div>

          {/* Card Type + Intent Type */}
          <div className="grid grid-cols-2 gap-[12px]">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[#acacac] block mb-[6px]">
                Card Type
              </label>
              <select
                value={cardType}
                onChange={(e) => setCardType(e.target.value as CardType)}
                className="w-full h-[38px] px-[12px] rounded-[8px] border border-[#e8e8e8] text-[13px] text-[#1a1a1a] bg-white focus:outline-none focus:border-[#ff9800] transition-colors"
              >
                {CARD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[#acacac] block mb-[6px]">
                Intent Type
              </label>
              <input
                type="text"
                value={intentType}
                onChange={(e) => setIntentType(e.target.value)}
                placeholder="e.g. sim.fea"
                className="w-full h-[38px] px-[12px] rounded-[8px] border border-[#e8e8e8] text-[13px] text-[#1a1a1a] font-mono placeholder:text-[#acacac] focus:outline-none focus:border-[#ff9800] transition-colors"
              />
            </div>
          </div>

          {/* KPIs */}
          <div>
            <div className="flex items-center justify-between mb-[8px]">
              <label className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[#acacac]">
                KPIs
              </label>
              <button
                type="button"
                onClick={addKpi}
                className="text-[11px] text-[#ff9800] font-medium flex items-center gap-[4px] hover:underline"
              >
                <Plus size={12} /> Add KPI
              </button>
            </div>

            {kpis.length === 0 && (
              <p className="text-[11px] text-[#acacac] italic">
                No KPIs defined. Click "Add KPI" to add acceptance criteria.
              </p>
            )}

            <div className="flex flex-col gap-[8px]">
              {kpis.map((kpi, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-[1fr_80px_60px_60px_28px] gap-[8px] items-center"
                >
                  <input
                    type="text"
                    value={kpi.metric_key}
                    onChange={(e) => updateKpi(idx, 'metric_key', e.target.value)}
                    placeholder="metric_key"
                    className="h-[34px] px-[10px] rounded-[6px] border border-[#e8e8e8] text-[12px] font-mono text-[#1a1a1a] placeholder:text-[#acacac] focus:outline-none focus:border-[#ff9800] transition-colors"
                  />
                  <input
                    type="number"
                    value={kpi.target_value || ''}
                    onChange={(e) => updateKpi(idx, 'target_value', Number(e.target.value))}
                    placeholder="Target"
                    className="h-[34px] px-[10px] rounded-[6px] border border-[#e8e8e8] text-[12px] text-[#1a1a1a] placeholder:text-[#acacac] focus:outline-none focus:border-[#ff9800] transition-colors"
                  />
                  <input
                    type="text"
                    value={kpi.unit}
                    onChange={(e) => updateKpi(idx, 'unit', e.target.value)}
                    placeholder="Unit"
                    className="h-[34px] px-[10px] rounded-[6px] border border-[#e8e8e8] text-[12px] text-[#1a1a1a] placeholder:text-[#acacac] focus:outline-none focus:border-[#ff9800] transition-colors"
                  />
                  <input
                    type="number"
                    value={kpi.tolerance || ''}
                    onChange={(e) => updateKpi(idx, 'tolerance', Number(e.target.value))}
                    placeholder="Tol"
                    className="h-[34px] px-[10px] rounded-[6px] border border-[#e8e8e8] text-[12px] text-[#1a1a1a] placeholder:text-[#acacac] focus:outline-none focus:border-[#ff9800] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => removeKpi(idx)}
                    className="w-[28px] h-[28px] flex items-center justify-center rounded-[6px] text-[#acacac] hover:text-[#e74c3c] hover:bg-[#ffebee] transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-[8px] px-[24px] py-[16px] border-t border-[#f0f0ec]">
          <button
            type="button"
            onClick={onClose}
            className="h-[36px] px-[16px] rounded-[8px] text-[12px] font-medium text-[#6b6b6b] border border-[#e8e8e8] hover:bg-[#f0f0ec] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!title.trim() || createCard.isPending}
            className={cn(
              'h-[36px] px-[20px] rounded-[8px] text-[12px] font-semibold text-white transition-colors flex items-center gap-[6px]',
              !title.trim() || createCard.isPending
                ? 'bg-[#d0d0d0] cursor-not-allowed'
                : 'bg-[#ff9800] hover:bg-[#f57c00]',
            )}
          >
            {createCard.isPending && <Loader2 size={14} className="animate-spin" />}
            Create Card
          </button>
        </div>
      </div>
    </div>
  );
}
