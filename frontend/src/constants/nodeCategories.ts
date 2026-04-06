export type WorkflowNodeType = 'trigger' | 'tool' | 'agent' | 'logic' | 'governance' | 'data';

export interface NodeDefinition {
  type: WorkflowNodeType;
  subtype: string;
  label: string;
  description: string;
  icon: string; // lucide icon name
  color: string; // tailwind color class
  defaultInputs: Record<string, { type: string; default?: string }>;
}

export interface NodeCategory {
  id: string;
  label: string;
  nodes: NodeDefinition[];
}

export const NODE_CATEGORIES: NodeCategory[] = [
  {
    id: 'triggers',
    label: 'TRIGGERS',
    nodes: [
      { type: 'trigger', subtype: 'webhook', label: 'Webhook', description: 'HTTP POST trigger', icon: 'Webhook', color: 'text-green-50', defaultInputs: { endpoint: { type: 'string', default: '/validate' } } },
      { type: 'trigger', subtype: 'schedule', label: 'Schedule', description: 'Cron schedule trigger', icon: 'Clock', color: 'text-green-50', defaultInputs: { cron: { type: 'string', default: '0 * * * *' } } },
      { type: 'trigger', subtype: 'event-listener', label: 'Event Listener', description: 'Event-driven trigger', icon: 'Radio', color: 'text-green-50', defaultInputs: { eventType: { type: 'string' } } },
    ],
  },
  {
    id: 'tools',
    label: 'TOOLS',
    nodes: [
      { type: 'tool', subtype: 'fea-solver', label: 'FEA Solver', description: 'Finite element analysis', icon: 'Triangle', color: 'text-blue-60', defaultInputs: { mesh_file: { type: 'artifact' }, threshold: { type: 'number', default: '128' }, output_format: { type: 'string', default: 'VTK' } } },
      { type: 'tool', subtype: 'cfd-engine', label: 'CFD Engine', description: 'Computational fluid dynamics', icon: 'Wind', color: 'text-blue-60', defaultInputs: { geometry: { type: 'artifact' }, solver: { type: 'string', default: 'OpenFOAM' } } },
      { type: 'tool', subtype: 'mesh-generator', label: 'Mesh Generator', description: 'Mesh generation from CAD', icon: 'Grid3x3', color: 'text-blue-60', defaultInputs: { geometry: { type: 'artifact' }, element_type: { type: 'string', default: 'hex8' } } },
      { type: 'tool', subtype: 'material-db', label: 'Material DB', description: 'Material property lookup', icon: 'Database', color: 'text-blue-60', defaultInputs: { material: { type: 'string' }, properties: { type: 'string' } } },
    ],
  },
  {
    id: 'agents',
    label: 'AGENTS',
    nodes: [
      { type: 'agent', subtype: 'ai-optimizer', label: 'AI Optimizer', description: 'Optimization agent', icon: 'Brain', color: 'text-purple-60', defaultInputs: { goal: { type: 'string' }, constraints: { type: 'string' } } },
      { type: 'agent', subtype: 'design-advisor', label: 'Design Advisor', description: 'Design review agent', icon: 'Lightbulb', color: 'text-purple-60', defaultInputs: { context: { type: 'string' } } },
    ],
  },
  {
    id: 'logic',
    label: 'LOGIC',
    nodes: [
      { type: 'logic', subtype: 'condition', label: 'Condition', description: 'If/else branching', icon: 'GitBranch', color: 'text-yellow-30', defaultInputs: { expression: { type: 'string' } } },
      { type: 'logic', subtype: 'loop', label: 'Loop', description: 'Iterate over items', icon: 'Repeat', color: 'text-yellow-30', defaultInputs: { maxIterations: { type: 'number', default: '10' } } },
    ],
  },
  {
    id: 'governance',
    label: 'GOVERNANCE',
    nodes: [
      { type: 'governance', subtype: 'approval-gate', label: 'Approval Gate', description: 'Human approval required', icon: 'ShieldCheck', color: 'text-orange-500', defaultInputs: { approvers: { type: 'string' } } },
      { type: 'governance', subtype: 'evidence-gate', label: 'Evidence Gate', description: 'Evidence verification', icon: 'FileCheck', color: 'text-orange-500', defaultInputs: { criteria: { type: 'string' } } },
    ],
  },
  {
    id: 'data',
    label: 'DATA',
    nodes: [
      { type: 'data', subtype: 'artifact-store', label: 'Artifact Store', description: 'Store/retrieve artifacts', icon: 'HardDrive', color: 'text-teal-50', defaultInputs: { operation: { type: 'string', default: 'store' } } },
      { type: 'data', subtype: 'transform', label: 'Transform', description: 'Data transformation', icon: 'ArrowRightLeft', color: 'text-teal-50', defaultInputs: { script: { type: 'string' } } },
    ],
  },
];

export function findNodeDefinition(subtype: string): NodeDefinition | undefined {
  for (const cat of NODE_CATEGORIES) {
    const found = cat.nodes.find((n) => n.subtype === subtype);
    if (found) return found;
  }
  return undefined;
}
