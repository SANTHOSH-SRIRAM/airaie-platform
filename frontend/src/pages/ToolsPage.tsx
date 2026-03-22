import { Wrench, Cpu, Database, Puzzle, FlaskConical, Ruler, Box } from 'lucide-react';
import Card from '@components/ui/Card';

const tools = [
  { icon: Wrench, name: 'FEA Solver', description: 'Finite element analysis for structural simulation', status: 'Active' },
  { icon: Cpu, name: 'CFD Engine', description: 'Computational fluid dynamics processing', status: 'Active' },
  { icon: Database, name: 'Material Library', description: 'Engineering material properties database', status: 'Active' },
  { icon: Puzzle, name: 'Generative Design', description: 'AI-driven topology optimization', status: 'Active' },
  { icon: FlaskConical, name: 'Thermal Analysis', description: 'Heat transfer and thermal stress solver', status: 'Available' },
  { icon: Ruler, name: 'Tolerance Stack-Up', description: 'Geometric dimensioning and tolerancing', status: 'Available' },
  { icon: Box, name: 'Mesh Generator', description: 'Automated 3D mesh generation tools', status: 'Available' },
];

export default function ToolsPage() {
  return (
    <div className="p-6 space-y-6 max-w-[1584px]">
      <div>
        <h1 className="text-[2rem] font-light text-content-primary leading-tight tracking-tight">Tools</h1>
        <p className="text-sm text-content-helper mt-1.5">Engineering tools and solvers available in your workspace.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {tools.map((tool) => (
          <Card key={tool.name} hover variant="elevated" className="flex-1">
            <div className="px-5 py-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-md bg-surface-layer border border-border-subtle flex items-center justify-center shrink-0">
                  <tool.icon size={20} className="text-content-secondary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-content-primary">{tool.name}</h3>
                    <span className={`text-[11px] font-medium uppercase tracking-wider ${tool.status === 'Active' ? 'text-status-success' : 'text-content-placeholder'}`}>
                      {tool.status}
                    </span>
                  </div>
                  <p className="text-xs text-content-helper mt-1 leading-relaxed">{tool.description}</p>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
