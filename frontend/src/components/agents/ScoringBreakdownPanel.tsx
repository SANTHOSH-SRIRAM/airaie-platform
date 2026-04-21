export default function ScoringBreakdownPanel() {
  return (
    <div data-testid="scoring-breakdown-panel" className="p-3">
      <p className="text-[10px] font-medium tracking-wider text-cds-text-secondary uppercase mb-3">
        TOOL SCORING BREAKDOWN
      </p>
      <div data-testid="scoring-breakdown-empty" className="text-center py-8">
        <p className="text-xs font-medium text-cds-text-secondary">Scoring breakdown coming soon</p>
        <p className="text-[11px] text-cds-text-secondary mt-1 leading-relaxed">
          Per-run scoring is not yet exposed by the backend.
        </p>
      </div>
    </div>
  );
}
