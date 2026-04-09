import { useState } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { useUpdateTool } from '@hooks/useTools';
import type { ToolDetail } from '@/types/tool';

interface Props {
  tool: ToolDetail;
  onClose: () => void;
  onSave: () => void;
}

export default function EditToolModal({ tool, onClose, onSave }: Props) {
  const updateMutation = useUpdateTool(tool.id);

  const [name, setName] = useState(tool.name);
  const [description, setDescription] = useState(tool.description);
  const [owner, setOwner] = useState(tool.owner ?? '');
  const [tagsInput, setTagsInput] = useState(tool.domain_tags.join(', '));

  const handleSave = async () => {
    const domain_tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    await updateMutation.mutateAsync({ name, description, owner, domain_tags });
    onSave();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-[16px] border border-[#ece9e3] shadow-2xl w-full max-w-[520px] mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-[32px] py-[20px] border-b border-[#ece9e3]">
          <h2 className="text-[16px] font-bold text-[#1a1a1a]">Edit Tool</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[#f5f5f0] text-[#6b6b6b] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <div className="px-[32px] py-[24px] flex flex-col gap-5">
          <div>
            <label className="text-[11px] font-bold text-[#6b6b6b] uppercase tracking-widest block mb-1.5">
              Tool Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 border border-[#d5d5cf] rounded-[8px] px-3 text-[13px] text-[#1a1a1a] bg-white focus:border-[#2196f3] outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-[#6b6b6b] uppercase tracking-widest block mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-[#d5d5cf] rounded-[8px] px-3 py-2 text-[13px] text-[#1a1a1a] bg-white focus:border-[#2196f3] outline-none resize-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-[#6b6b6b] uppercase tracking-widest block mb-1.5">
              Owner
            </label>
            <input
              type="text"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              className="w-full h-10 border border-[#d5d5cf] rounded-[8px] px-3 text-[13px] text-[#1a1a1a] bg-white focus:border-[#2196f3] outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-[#6b6b6b] uppercase tracking-widest block mb-1.5">
              Domain Tags <span className="text-[#acacac] font-normal normal-case tracking-normal">(comma-separated)</span>
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g. fea, structural, simulation"
              className="w-full h-10 border border-[#d5d5cf] rounded-[8px] px-3 text-[13px] text-[#1a1a1a] bg-white focus:border-[#2196f3] outline-none"
            />
          </div>

          {updateMutation.isError && (
            <p className="text-[12px] text-[#e74c3c] font-medium">
              Failed to save: {(updateMutation.error as Error)?.message ?? 'Unknown error'}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-[32px] py-[20px] border-t border-[#ece9e3] flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="h-[40px] px-5 border border-[#d5d5cf] text-[#6b6b6b] rounded-[8px] text-[13px] font-bold hover:bg-[#fafaf8] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="h-[40px] px-5 bg-[#1a1a1a] text-white rounded-[8px] text-[13px] font-bold hover:bg-[#333] transition-colors shadow-sm flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {updateMutation.isPending ? (
              <><Loader2 size={14} className="animate-spin" /> Saving...</>
            ) : (
              <><Save size={14} /> Save Changes</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
