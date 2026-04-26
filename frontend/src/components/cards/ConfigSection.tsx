import type { ReactNode } from 'react';
import { cn } from '@utils/cn';

// ---------------------------------------------------------------------------
// ConfigSection — shared wrapper for AvailableInputsTable, AvailableMethodsTable,
// AddCustomKpiForm, and any other "configuration row" panel on the Card-page.
//
// Provides:
//   - Consistent rounded panel with subtle shadow (matches Hero's surface
//     treatment but with a neutral white background since these aren't the
//     primary Govern surface).
//   - Header row with section title (uppercase, micro-tracking) and an
//     optional right-aligned `actions` slot (e.g., "+ Pin from pool").
//   - `disabled` flag applies a slight opacity so a Mode-locked section is
//     visually distinct without being completely greyed-out (which would
//     suggest the section is broken rather than locked).
// ---------------------------------------------------------------------------

interface ConfigSectionProps {
  title: string;
  children: ReactNode;
  /** Optional right-aligned slot in the header row (button or chip). */
  actions?: ReactNode;
  /**
   * When true, the section's header gets a "locked" badge and the body
   * dims slightly. Used by Mode rules to indicate non-editable sections
   * (Study/Release lock Inputs/Methods).
   */
  disabled?: boolean;
  /**
   * Mode-rule explanation tooltip rendered when `disabled` is true.
   * Defaults to "Locked by Board mode".
   */
  disabledReason?: string;
  /** Optional aria-labelledby target — pass to wrap any child semantics. */
  className?: string;
}

export default function ConfigSection({
  title,
  children,
  actions,
  disabled = false,
  disabledReason = 'Locked by Board mode',
  className,
}: ConfigSectionProps) {
  return (
    <section
      aria-label={title}
      className={cn(
        'bg-white rounded-[12px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.04)] border border-[#f0f0ec] p-[16px]',
        disabled && 'opacity-90',
        className,
      )}
    >
      <header className="flex items-center justify-between mb-[12px] gap-[12px]">
        <div className="flex items-center gap-[8px]">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[#6b6b6b]">
            {title}
          </h2>
          {disabled && (
            <span
              className="text-[9px] font-medium uppercase tracking-[0.5px] px-[8px] h-[18px] inline-flex items-center rounded-full bg-[#fff3e0] text-[#f57c00]"
              title={disabledReason}
            >
              Locked
            </span>
          )}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </header>
      <div className={cn(disabled && 'pointer-events-none opacity-70')}>{children}</div>
    </section>
  );
}
