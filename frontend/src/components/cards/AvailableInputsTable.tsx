import { useMemo } from 'react';
import { Loader2, AlertCircle, Plus } from 'lucide-react';
import { useArtifactList } from '@hooks/useArtifacts';
import { useUpdateIntent } from '@hooks/useIntents';
import ConfigSection from './ConfigSection';
import type { Card } from '@/types/card';
import type { IntentSpec, IntentInput } from '@/types/intent';
import type { CardModeRules } from '@hooks/useCardModeRules';

// ---------------------------------------------------------------------------
// AvailableInputsTable — lists the Board's artifact pool with per-row Pin
// checkboxes that toggle whether the artifact is referenced in the
// IntentSpec's `inputs[]`.
//
// Pinning semantics: pinning an artifact appends a new IntentInput row whose
// `artifact_ref` is the artifact's id. Unpinning removes the matching row.
// We use the artifact id (not the name) as the cross-reference key because
// names can collide across versions.
//
// Disabled state: when `rules.canPinInputs` is false (Study/Release), the
// checkboxes are disabled and the section header shows a "Locked" badge.
// ---------------------------------------------------------------------------

interface AvailableInputsTableProps {
  card: Card;
  intent: IntentSpec;
  rules: CardModeRules;
}

function formatBytes(n: number | undefined): string {
  if (n === undefined || n === null) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AvailableInputsTable({
  card,
  intent,
  rules,
}: AvailableInputsTableProps) {
  const { data: artifacts, isLoading, error } = useArtifactList(card.board_id);
  const updateIntent = useUpdateIntent(intent.id, card.board_id);

  // Map artifact_id → IntentInput row for fast O(1) lookup during render.
  const pinnedById = useMemo(() => {
    const map = new Map<string, IntentInput>();
    for (const inp of intent.inputs ?? []) {
      if (inp.artifact_ref) map.set(inp.artifact_ref, inp);
    }
    return map;
  }, [intent.inputs]);

  const togglePin = async (artifactId: string, name: string, type?: string) => {
    const isPinned = pinnedById.has(artifactId);
    const nextInputs = isPinned
      ? (intent.inputs ?? []).filter((i) => i.artifact_ref !== artifactId)
      : [
          ...(intent.inputs ?? []),
          {
            name: name || `input_${(intent.inputs?.length ?? 0) + 1}`,
            artifact_ref: artifactId,
            type,
            required: true,
          },
        ];
    try {
      await updateIntent.mutateAsync({ inputs: nextInputs });
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? 'Failed to update inputs';
      window.alert(msg);
    }
  };

  const actions = (
    <button
      type="button"
      aria-label="Pin from Board pool"
      title="Pin a new artifact from the Board (Phase 8 stub)"
      disabled={!rules.canPinInputs}
      className="inline-flex items-center gap-[4px] h-[28px] px-[10px] rounded-[6px] text-[11px] font-medium bg-[#f0f0ec] text-[#6b6b6b] hover:bg-[#e0e0e0] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
    >
      <Plus size={11} />
      Pin from Board pool
    </button>
  );

  return (
    <ConfigSection
      title="Available Inputs"
      actions={actions}
      disabled={!rules.canPinInputs}
      disabledReason={
        rules.mode === 'release'
          ? 'Inputs are locked in Release mode'
          : 'Inputs are locked in Study mode (set in Explore)'
      }
    >
      {isLoading && (
        <div className="flex items-center gap-[6px] py-[12px]">
          <Loader2 size={14} className="animate-spin text-[#acacac]" />
          <span className="text-[12px] text-[#acacac]">Loading artifacts…</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-[6px] py-[12px]">
          <AlertCircle size={14} className="text-[#e74c3c]" />
          <span className="text-[12px] text-[#e74c3c]">Failed to load Board artifacts</span>
        </div>
      )}

      {!isLoading && !error && (artifacts?.length ?? 0) === 0 && (
        <p className="text-[12px] text-[#acacac] py-[12px]">
          No artifacts in this Board's pool yet. Run a Card or upload an artifact
          to populate the pool.
        </p>
      )}

      {!isLoading && !error && artifacts && artifacts.length > 0 && (
        <table
          aria-label="Board artifact pool"
          className="w-full text-[12px]"
        >
          <thead>
            <tr className="text-left border-b border-[#f0f0ec]">
              <th scope="col" className="py-[6px] pr-[8px] font-medium text-[#6b6b6b]">
                Artifact
              </th>
              <th scope="col" className="py-[6px] pr-[8px] font-medium text-[#6b6b6b]">
                Type
              </th>
              <th scope="col" className="py-[6px] pr-[8px] font-medium text-[#6b6b6b]">
                Size
              </th>
              <th
                scope="col"
                className="py-[6px] pr-[4px] font-medium text-[#6b6b6b] text-right w-[60px]"
              >
                Pin
              </th>
            </tr>
          </thead>
          <tbody>
            {artifacts.map((a) => {
              const isPinned = pinnedById.has(a.id);
              const displayName = a.name ?? a.id.slice(0, 12);
              return (
                <tr
                  key={a.id}
                  className="border-b border-[#fafafa] hover:bg-[#fafafa] transition-colors"
                >
                  <td className="py-[8px] pr-[8px] text-[#1a1a1a]">
                    <span className="font-medium">{displayName}</span>
                    <span className="ml-[6px] text-[10px] text-[#acacac]">
                      {a.id.slice(0, 12)}
                    </span>
                  </td>
                  <td className="py-[8px] pr-[8px] text-[#6b6b6b]">{a.type}</td>
                  <td className="py-[8px] pr-[8px] text-[#6b6b6b] tabular-nums">
                    {formatBytes(a.size_bytes)}
                  </td>
                  <td className="py-[8px] pr-[4px] text-right">
                    <input
                      type="checkbox"
                      checked={isPinned}
                      onChange={() => togglePin(a.id, displayName, a.type)}
                      disabled={!rules.canPinInputs || updateIntent.isPending}
                      aria-label={isPinned ? `Unpin ${displayName}` : `Pin ${displayName}`}
                      className="w-[14px] h-[14px] accent-[#f57c00] cursor-pointer disabled:cursor-not-allowed"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </ConfigSection>
  );
}
