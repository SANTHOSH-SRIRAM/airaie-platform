export default function StudioHeader() {
  return (
    <div className="flex items-start justify-between">
      <div>
        <h1 className="text-[28px] font-light text-content-primary leading-tight">
          Airaie CAD Studio <span className="text-brand-secondary">| Professional</span>
        </h1>
        <p className="text-sm text-content-secondary mt-1.5">
          Precision Parametric Engineering. Secure integration of toolsets and automated logic.
        </p>
      </div>
      <div className="flex items-start gap-5 shrink-0">
        <div className="text-right">
          <p className="text-[10px] text-content-tertiary uppercase tracking-widest font-medium mb-1.5">
            System Status
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-surface-border rounded-md">
            <span className="w-2 h-2 bg-status-success rounded-sm" />
            <span className="text-xs font-medium text-content-primary tracking-wide">OPERATIONAL</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-content-tertiary uppercase tracking-widest font-medium mb-1.5">
            Version
          </p>
          <div className="inline-flex items-center px-3 py-1.5 border border-surface-border rounded-md">
            <span className="text-xs font-mono font-medium text-content-primary">v4.2.0-stable</span>
          </div>
        </div>
      </div>
    </div>
  );
}
