export default function StudioHeader() {
  return (
    <div className="flex items-start justify-between">
      <div>
        <h1 className="text-[2rem] font-light text-content-primary leading-tight tracking-tight">
          Airaie CAD Studio
        </h1>
        <p className="text-sm text-content-helper mt-1.5">
          Precision Parametric Engineering. Secure integration of toolsets and automated logic.
        </p>
      </div>
      <div className="flex items-start gap-4 shrink-0">
        <div className="text-right">
          <p className="text-[11px] text-content-placeholder uppercase tracking-wider mb-1.5 font-medium">System Status</p>
          <div className="inline-flex items-center gap-2 h-8 px-4 bg-card-bg border border-card-border rounded-md shadow-xs">
            <span className="w-2 h-2 bg-status-success rounded-full" />
            <span className="text-xs font-medium text-content-primary tracking-wide">OPERATIONAL</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-content-placeholder uppercase tracking-wider mb-1.5 font-medium">Version</p>
          <div className="inline-flex items-center h-8 px-4 bg-card-bg border border-card-border rounded-md shadow-xs">
            <span className="text-xs font-mono font-medium text-content-primary">v4.2.0-stable</span>
          </div>
        </div>
      </div>
    </div>
  );
}
