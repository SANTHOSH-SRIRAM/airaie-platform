import { Zap, Brain, Eye, Layers, Sparkles, Gauge, ScanLine, Workflow } from 'lucide-react';
import Card from '@components/ui/Card';
import ProgressBar from '@components/ui/ProgressBar';

const capabilities = [
  { icon: Brain, name: 'AI-Assisted Design', description: 'Machine learning models for design optimization and prediction', tier: 'Enterprise', usage: 68 },
  { icon: Sparkles, name: 'Generative Topology', description: 'Automated topology optimization with manufacturing constraints', tier: 'Enterprise', usage: 42 },
  { icon: Eye, name: 'Real-Time Visualization', description: '3D rendering with physically-based materials and lighting', tier: 'Professional', usage: 91 },
  { icon: Layers, name: 'Multi-Physics Coupling', description: 'Coupled structural, thermal, and fluid simulations', tier: 'Enterprise', usage: 23 },
  { icon: ScanLine, name: 'Automated Meshing', description: 'Intelligent mesh refinement and quality optimization', tier: 'Professional', usage: 85 },
  { icon: Gauge, name: 'Performance Profiling', description: 'Solver benchmarking and resource utilization analysis', tier: 'Professional', usage: 56 },
  { icon: Workflow, name: 'Batch Processing', description: 'Parallel job scheduling across compute clusters', tier: 'Enterprise', usage: 34 },
  { icon: Zap, name: 'Instant Preview', description: 'Sub-second preview of simulation results', tier: 'All Plans', usage: 97 },
];

const tierStyle: Record<string, string> = {
  'Enterprise': 'text-content-primary bg-surface-layer',
  'Professional': 'text-content-secondary bg-surface-layer',
  'All Plans': 'text-status-success bg-status-success-bg',
};

export default function CapabilitiesPage() {
  return (
    <div className="p-6 space-y-6 max-w-[1584px]">
      <div>
        <h1 className="text-[2rem] font-light text-content-primary leading-tight tracking-tight">Capabilities</h1>
        <p className="text-sm text-content-helper mt-1.5">Platform features and compute capabilities available to your organization.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {capabilities.map((cap) => (
          <Card key={cap.name} variant="elevated">
            <div className="px-5 py-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-md bg-surface-layer border border-border-subtle flex items-center justify-center shrink-0">
                  <cap.icon size={20} className="text-content-secondary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-semibold text-content-primary">{cap.name}</h3>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${tierStyle[cap.tier]}`}>
                      {cap.tier}
                    </span>
                  </div>
                  <p className="text-xs text-content-helper leading-relaxed">{cap.description}</p>
                  <div className="mt-3">
                    <ProgressBar value={cap.usage} label="Usage" size="sm" showPercent />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
