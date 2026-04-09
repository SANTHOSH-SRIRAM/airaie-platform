import { Plus, Trash2 } from 'lucide-react';
import Button from '@components/ui/Button';
import { cn } from '@utils/cn';

const PORT_TYPES = ['string', 'integer', 'number', 'boolean', 'artifact', 'json', 'object'] as const;

export interface PortRow {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

interface ContractPortEditorProps {
  label: string;
  ports: PortRow[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, field: keyof PortRow, value: string | boolean) => void;
  className?: string;
}

export default function ContractPortEditor({
  label,
  ports,
  onAdd,
  onRemove,
  onUpdate,
  className,
}: ContractPortEditorProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[#acacac]">{label}</span>
        <Button variant="ghost" size="sm" icon={<Plus size={14} />} onClick={onAdd}>
          Add
        </Button>
      </div>

      {ports.length === 0 && (
        <p className="text-[11px] text-[#acacac] py-2">No {label.toLowerCase()} defined yet.</p>
      )}

      {ports.length > 0 && (
        <div className="space-y-1">
          {/* Header */}
          <div className="grid grid-cols-[1fr_100px_44px_1fr_32px] gap-2 px-2 text-[10px] font-medium uppercase tracking-[0.5px] text-[#acacac]">
            <span>Name</span>
            <span>Type</span>
            <span>Req</span>
            <span>Description</span>
            <span />
          </div>

          {/* Rows */}
          {ports.map((port, idx) => (
            <div
              key={idx}
              className="grid grid-cols-[1fr_100px_44px_1fr_32px] items-center gap-2 rounded-[8px] bg-[#f5f5f0] px-2 py-1.5"
            >
              <input
                className="h-7 rounded-[6px] bg-white px-2 text-[11px] text-[#1a1a1a] border border-[#ece9e3] focus:outline-none focus:border-[#2196f3]"
                placeholder="port_name"
                value={port.name}
                onChange={(e) => onUpdate(idx, 'name', e.target.value)}
              />
              <select
                className="h-7 rounded-[6px] bg-white px-1 text-[11px] text-[#1a1a1a] border border-[#ece9e3] focus:outline-none focus:border-[#2196f3]"
                value={port.type}
                onChange={(e) => onUpdate(idx, 'type', e.target.value)}
              >
                {PORT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <label className="flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={port.required}
                  onChange={(e) => onUpdate(idx, 'required', e.target.checked)}
                  className="accent-[#2196f3]"
                />
              </label>
              <input
                className="h-7 rounded-[6px] bg-white px-2 text-[11px] text-[#1a1a1a] border border-[#ece9e3] focus:outline-none focus:border-[#2196f3]"
                placeholder="Optional description"
                value={port.description}
                onChange={(e) => onUpdate(idx, 'description', e.target.value)}
              />
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded-[6px] text-[#acacac] hover:text-[#e74c3c] hover:bg-[#ffebee] transition-colors"
                onClick={() => onRemove(idx)}
                aria-label={`Remove ${port.name || 'port'}`}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
