import { useState } from 'react';
import { cn } from '@utils/cn';
import { FileText, Plus, Loader2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

import type { BoardRecord } from '@/types/board';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RecordType =
  | 'hypothesis'
  | 'claim'
  | 'protocol_step'
  | 'note'
  | 'decision'
  | 'requirement';

const RECORD_TYPE_CONFIG: Record<
  RecordType,
  { label: string; bg: string; text: string }
> = {
  hypothesis: { label: 'Hypothesis', bg: 'bg-[#e3f2fd]', text: 'text-[#2196f3]' },
  claim: { label: 'Claim', bg: 'bg-[#f3e5f5]', text: 'text-[#9c27b0]' },
  protocol_step: { label: 'Protocol', bg: 'bg-[#e8f5e9]', text: 'text-[#4caf50]' },
  note: { label: 'Note', bg: 'bg-[#fff3e0]', text: 'text-[#ff9800]' },
  decision: { label: 'Decision', bg: 'bg-[#fce4ec]', text: 'text-[#e91e63]' },
  requirement: { label: 'Requirement', bg: 'bg-[#e0f2f1]', text: 'text-[#009688]' },
};

const RECORD_TYPES: { value: RecordType; label: string }[] = [
  { value: 'hypothesis', label: 'Hypothesis' },
  { value: 'claim', label: 'Claim' },
  { value: 'protocol_step', label: 'Protocol Step' },
  { value: 'note', label: 'Note' },
  { value: 'decision', label: 'Decision' },
  { value: 'requirement', label: 'Requirement' },
];

// ---------------------------------------------------------------------------
// Inline Add Record Form
// ---------------------------------------------------------------------------

interface AddRecordFormProps {
  onSubmit: (type: RecordType, content: string, title: string) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

function AddRecordForm({ onSubmit, onCancel, isSubmitting }: AddRecordFormProps) {
  const [recordType, setRecordType] = useState<RecordType>('note');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const handleSubmit = async () => {
    if (!content.trim()) return;
    await onSubmit(recordType, content.trim(), title.trim());
    setTitle('');
    setContent('');
    setRecordType('note');
  };

  return (
    <div className="border border-[#ece9e3] rounded-[12px] p-[16px] bg-[#fafaf8] flex flex-col gap-[12px]">
      <span className="text-[11px] font-semibold text-[#acacac] uppercase tracking-[0.5px]">
        New Record
      </span>

      {/* Type selector */}
      <div>
        <label className="text-[11px] font-semibold text-[#acacac] uppercase tracking-[0.5px] block mb-[6px]">
          Type
        </label>
        <select
          value={recordType}
          onChange={(e) => setRecordType(e.target.value as RecordType)}
          className="w-full h-[36px] px-[10px] rounded-[8px] border border-[#e8e8e8] text-[13px] text-[#1a1a1a] bg-white focus:outline-none focus:border-[#ff9800] transition-colors"
        >
          {RECORD_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Title (optional) */}
      <div>
        <label className="text-[11px] font-semibold text-[#acacac] uppercase tracking-[0.5px] block mb-[6px]">
          Title <span className="text-[#acacac] font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Short title for this record..."
          className="w-full h-[36px] px-[10px] rounded-[8px] border border-[#e8e8e8] text-[13px] text-[#1a1a1a] placeholder:text-[#acacac] focus:outline-none focus:border-[#ff9800] transition-colors"
        />
      </div>

      {/* Content */}
      <div>
        <label className="text-[11px] font-semibold text-[#acacac] uppercase tracking-[0.5px] block mb-[6px]">
          Content <span className="text-[#e74c3c]">*</span>
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Describe this record in detail..."
          rows={4}
          className="w-full px-[10px] py-[8px] rounded-[8px] border border-[#e8e8e8] text-[13px] text-[#1a1a1a] placeholder:text-[#acacac] focus:outline-none focus:border-[#ff9800] transition-colors resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-[8px]">
        <button
          type="button"
          onClick={onCancel}
          className="h-[34px] px-[14px] rounded-[8px] text-[12px] font-medium text-[#6b6b6b] border border-[#e8e8e8] hover:bg-[#f0f0ec] transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!content.trim() || isSubmitting}
          className={cn(
            'h-[34px] px-[18px] rounded-[8px] text-[12px] font-semibold text-white transition-colors flex items-center gap-[6px]',
            !content.trim() || isSubmitting
              ? 'bg-[#d0d0d0] cursor-not-allowed'
              : 'bg-[#ff9800] hover:bg-[#f57c00]',
          )}
        >
          {isSubmitting && <Loader2 size={12} className="animate-spin" />}
          Add Record
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Record Row
// ---------------------------------------------------------------------------

interface RecordRowProps {
  record: BoardRecord;
}

function RecordRow({ record }: RecordRowProps) {
  const [expanded, setExpanded] = useState(false);

  const typeKey = record.record_type as RecordType;
  const typeConfig = RECORD_TYPE_CONFIG[typeKey] ?? {
    label: record.record_type,
    bg: 'bg-[#f0f0ec]',
    text: 'text-[#6b6b6b]',
  };

  const contentText = (record.content?.text as string | undefined) ?? '';

  const isLong = contentText.length > 200;
  const displayText = isLong && !expanded ? contentText.slice(0, 200) + '…' : contentText;

  const formattedDate = new Date(record.created_at).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="border border-[#ece9e3] rounded-[12px] p-[16px] bg-white hover:border-[#d8d4ce] transition-colors">
      {/* Header row */}
      <div className="flex items-center gap-[8px] mb-[8px]">
        <span
          className={cn(
            'h-[20px] px-[8px] rounded-[4px] text-[10px] font-medium inline-flex items-center shrink-0',
            typeConfig.bg,
            typeConfig.text,
          )}
        >
          {typeConfig.label}
        </span>

        {record.title && (
          <span className="text-[13px] font-semibold text-[#1a1a1a] truncate flex-1">
            {record.title}
          </span>
        )}

        <span className="text-[10px] text-[#9b978f] ml-auto shrink-0">{formattedDate}</span>
      </div>

      {/* Content */}
      {contentText && (
        <div>
          <p className="text-[12px] text-[#1a1a1a] leading-[18px] whitespace-pre-wrap">
            {displayText}
          </p>
          {isLong && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-[6px] flex items-center gap-[4px] text-[11px] text-[#ff9800] hover:underline font-medium"
            >
              {expanded ? (
                <>
                  <ChevronUp size={12} /> Show less
                </>
              ) : (
                <>
                  <ChevronDown size={12} /> Show more
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Metadata row */}
      <div className="flex items-center gap-[12px] mt-[8px]">
        {record.actor && (
          <span className="text-[10px] text-[#9b978f]">
            by <span className="font-medium text-[#6b6b6b]">{record.actor}</span>
          </span>
        )}
        {record.run_id && (
          <span className="text-[10px] font-mono text-[#9b978f]">
            run: {record.run_id.slice(0, 12)}
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-[48px]">
      <div className="w-[48px] h-[48px] rounded-[12px] bg-[#f0f0ec] flex items-center justify-center mb-[12px]">
        <FileText size={20} className="text-[#acacac]" />
      </div>
      <p className="text-[13px] font-medium text-[#1a1a1a]">No records yet</p>
      <p className="text-[11px] text-[#acacac] mt-[4px] text-center max-w-[220px]">
        Capture hypotheses, decisions, protocol steps and other notes for this board
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-[14px] h-[34px] px-[16px] bg-[#ff9800] hover:bg-[#f57c00] text-white rounded-[8px] text-[12px] font-semibold flex items-center gap-[6px] transition-colors"
      >
        <Plus size={13} strokeWidth={2.5} /> Add Record
      </button>
    </div>
  );
}

import { useRecords, useCreateRecord } from '@hooks/useBoards';

// ---------------------------------------------------------------------------
// RecordsTab
// ---------------------------------------------------------------------------

export interface RecordsTabProps {
  boardId: string;
}

export default function RecordsTab({ boardId }: RecordsTabProps) {
  const { data: records, isLoading, error } = useRecords(boardId);
  const createRecord = useCreateRecord(boardId);

  const [showForm, setShowForm] = useState(false);
  const [filterType, setFilterType] = useState<RecordType | 'all'>('all');

  const handleCreate = async (type: RecordType, content: string, title: string) => {
    await createRecord.mutateAsync({
      record_type: type,
      title,
      content,
    });
    setShowForm(false);
  };

  const filteredRecords = records
    ? filterType === 'all'
      ? records
      : records.filter((r) => r.record_type === filterType)
    : [];

  return (
    <div className="flex flex-col gap-[12px]">
      {/* Header card */}
      <div className="bg-white rounded-[12px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)] p-[20px]">
        <div className="flex items-center justify-between mb-[14px]">
          <div className="flex items-center gap-[8px]">
            <FileText size={15} className="text-[#1a1a1a]" />
            <span className="text-[14px] font-semibold text-[#1a1a1a]">Records</span>
            {records && records.length > 0 && (
              <span className="h-[18px] min-w-[18px] px-[5px] rounded-full bg-[#f0f0ec] text-[10px] font-medium text-[#6b6b6b] flex items-center justify-center">
                {records.length}
              </span>
            )}
          </div>

          {!showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="h-[32px] px-[14px] bg-[#ff9800] hover:bg-[#f57c00] text-white rounded-[8px] text-[11px] font-semibold flex items-center gap-[5px] transition-colors"
            >
              <Plus size={12} strokeWidth={2.5} /> Add Record
            </button>
          )}
        </div>

        {/* Filter chips */}
        {records && records.length > 0 && (
          <div className="flex items-center gap-[6px] flex-wrap">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={cn(
                'h-[24px] px-[10px] rounded-full text-[10px] font-medium transition-colors',
                filterType === 'all'
                  ? 'bg-[#1a1a1a] text-white'
                  : 'bg-[#f0f0ec] text-[#6b6b6b] hover:bg-[#e8e8e8]',
              )}
            >
              All
            </button>
            {RECORD_TYPES.map((t) => {
              const count = records.filter((r) => r.record_type === t.value).length;
              if (count === 0) return null;
              const cfg = RECORD_TYPE_CONFIG[t.value];
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setFilterType(t.value)}
                  className={cn(
                    'h-[24px] px-[10px] rounded-full text-[10px] font-medium transition-colors',
                    filterType === t.value
                      ? cn(cfg.bg, cfg.text, 'ring-1 ring-current')
                      : 'bg-[#f0f0ec] text-[#6b6b6b] hover:bg-[#e8e8e8]',
                  )}
                >
                  {t.label} ({count})
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Inline add form */}
      {showForm && (
        <div className="bg-white rounded-[12px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)] p-[20px]">
          <AddRecordForm
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
            isSubmitting={createRecord.isPending}
          />
        </div>
      )}

      {/* Content area */}
      <div className="bg-white rounded-[12px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)] p-[20px]">
        {isLoading ? (
          <div className="flex items-center justify-center py-[40px]">
            <Loader2 size={20} className="animate-spin text-[#acacac]" />
            <span className="ml-[8px] text-[12px] text-[#acacac]">Loading records...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-[40px] gap-[8px]">
            <AlertCircle size={16} className="text-[#e74c3c]" />
            <span className="text-[12px] text-[#e74c3c]">Failed to load records</span>
          </div>
        ) : filteredRecords.length === 0 && !showForm ? (
          <EmptyState onAdd={() => setShowForm(true)} />
        ) : filteredRecords.length === 0 && showForm ? (
          <p className="text-[12px] text-[#acacac] text-center py-[20px]">
            No records matching the selected filter
          </p>
        ) : (
          <div className="flex flex-col gap-[8px]">
            {filteredRecords.map((record) => (
              <RecordRow key={record.id} record={record} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
