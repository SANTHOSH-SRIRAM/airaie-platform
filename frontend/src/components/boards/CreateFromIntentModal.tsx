import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ChevronDown, Loader2 } from 'lucide-react';
import Modal from '@components/ui/Modal';
import Button from '@components/ui/Button';
import { useIntentTypes } from '@hooks/useIntents';
import { createBoardFromIntent } from '@api/boards';
import { cn } from '@utils/cn';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CreateFromIntentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type GovernanceLevel = 'none' | 'light' | 'full';

const GOVERNANCE_OPTIONS: { value: GovernanceLevel; label: string; description: string }[] = [
  { value: 'none', label: 'None', description: 'No governance gates or approvals' },
  { value: 'light', label: 'Light', description: 'Auto evidence collection, no mandatory approvals' },
  { value: 'full', label: 'Full', description: 'Full governance with approval gates and evidence pinning' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CreateFromIntentModal({ isOpen, onClose }: CreateFromIntentModalProps) {
  const navigate = useNavigate();
  const { data: intentTypes, isLoading: typesLoading } = useIntentTypes('engineering');

  const [selectedIntentType, setSelectedIntentType] = useState('');
  const [goal, setGoal] = useState('');
  const [governanceLevel, setGovernanceLevel] = useState<GovernanceLevel>('light');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = selectedIntentType && goal.trim().length > 0 && !isSubmitting;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const board = await createBoardFromIntent({
        intent_type: selectedIntentType,
        goal: goal.trim(),
        governance: { level: governanceLevel },
      });
      onClose();
      navigate(`/boards/${board.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : (err as any)?.message ?? 'Failed to create board';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [canSubmit, selectedIntentType, goal, governanceLevel, onClose, navigate]);

  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      setSelectedIntentType('');
      setGoal('');
      setGovernanceLevel('light');
      setError(null);
      onClose();
    }
  }, [isSubmitting, onClose]);

  return (
    <Modal open={isOpen} onClose={handleClose} title="Create Board from Intent">
      <div className="flex flex-col gap-5 p-1">
        {/* Intent Type Selector */}
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-[0.5px] text-[#acacac] mb-2">
            Intent Type
          </label>
          {typesLoading ? (
            <div className="h-[40px] bg-[#f5f5f0] rounded-[8px] animate-pulse" />
          ) : (
            <div className="relative">
              <select
                value={selectedIntentType}
                onChange={(e) => setSelectedIntentType(e.target.value)}
                className="w-full h-[40px] bg-[#f5f5f0] rounded-[8px] px-3 pr-8 text-[13px] text-[#1a1a1a] border border-[#ece9e3] appearance-none focus:outline-none focus:ring-2 focus:ring-[#2196f3]/20 focus:border-[#2196f3] transition-colors"
              >
                <option value="">Select an intent type...</option>
                {(intentTypes ?? []).map((type) => (
                  <option key={type.slug} value={type.slug}>
                    {type.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#acacac] pointer-events-none" />
            </div>
          )}
          {selectedIntentType && intentTypes && (
            <p className="text-[11px] text-[#6b6b6b] mt-1.5">
              {intentTypes.find((t) => t.slug === selectedIntentType)?.description}
            </p>
          )}
        </div>

        {/* Goal Textarea */}
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-[0.5px] text-[#acacac] mb-2">
            Goal
          </label>
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="Describe the goal of this board, e.g. 'Validate bracket structural integrity under 500N axial load per ISO 12345'"
            rows={3}
            className="w-full bg-[#f5f5f0] rounded-[8px] px-3 py-2.5 text-[13px] text-[#1a1a1a] border border-[#ece9e3] resize-none placeholder:text-[#acacac] focus:outline-none focus:ring-2 focus:ring-[#2196f3]/20 focus:border-[#2196f3] transition-colors"
          />
        </div>

        {/* Governance Level */}
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-[0.5px] text-[#acacac] mb-2">
            Governance Level
          </label>
          <div className="grid grid-cols-3 gap-2">
            {GOVERNANCE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setGovernanceLevel(option.value)}
                className={cn(
                  'flex flex-col items-start gap-1 p-3 rounded-[8px] border text-left transition-colors',
                  governanceLevel === option.value
                    ? 'border-[#ff9800] bg-[#fff8e1]'
                    : 'border-[#ece9e3] bg-[#f5f5f0] hover:bg-[#f0f0ec]'
                )}
              >
                <div className="flex items-center gap-1.5">
                  <Shield
                    size={12}
                    className={governanceLevel === option.value ? 'text-[#ff9800]' : 'text-[#acacac]'}
                  />
                  <span
                    className={cn(
                      'text-[12px] font-semibold',
                      governanceLevel === option.value ? 'text-[#ff9800]' : 'text-[#6b6b6b]'
                    )}
                  >
                    {option.label}
                  </span>
                </div>
                <span className="text-[10px] text-[#949494] leading-tight">
                  {option.description}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 px-3 py-2 bg-[#ffebee] rounded-[8px] text-[12px] text-[#e74c3c]">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="bg-[#ff9800] hover:bg-[#f57c00] text-white border-none"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                Creating...
              </span>
            ) : (
              'Create Board'
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
