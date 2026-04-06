import { useState, useCallback } from 'react';
import { useAgentMemories, useCreateMemory, useDeleteMemory } from '@hooks/useAgents';
import type { AgentMemory } from '@api/agents';
import type { MemoryType, CreateMemoryData } from '@api/agentMemory';

/* ---------- Constants ---------- */

const MEMORY_TABS: { value: MemoryType | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'fact', label: 'Facts' },
  { value: 'preference', label: 'Preferences' },
  { value: 'lesson', label: 'Lessons' },
  { value: 'error_pattern', label: 'Error Patterns' },
];

const TYPE_COLORS: Record<MemoryType, { bg: string; text: string }> = {
  fact: { bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-700 dark:text-blue-300' },
  preference: { bg: 'bg-purple-100 dark:bg-purple-900/40', text: 'text-purple-700 dark:text-purple-300' },
  lesson: { bg: 'bg-green-100 dark:bg-green-900/40', text: 'text-green-700 dark:text-green-300' },
  error_pattern: { bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-700 dark:text-red-300' },
};

const TYPE_LABELS: Record<MemoryType, string> = {
  fact: 'Fact',
  preference: 'Preference',
  lesson: 'Lesson',
  error_pattern: 'Error Pattern',
};

/* ---------- Props ---------- */

interface MemoryBrowserProps {
  agentId: string;
}

/* ---------- Sub-components ---------- */

function MemoryCard({
  memory,
  onDelete,
}: {
  memory: AgentMemory;
  onDelete: (id: string) => void;
}) {
  const colors = TYPE_COLORS[memory.memory_type];
  const relevancePercent = Math.round(memory.relevance * 100);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 transition-shadow hover:shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mb-2 flex items-start justify-between">
        <span
          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}
        >
          {TYPE_LABELS[memory.memory_type]}
        </span>
        <button
          type="button"
          onClick={() => onDelete(memory.id)}
          className="rounded p-1 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950"
          title="Delete memory"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </svg>
        </button>
      </div>

      <p className="mb-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        {memory.content}
      </p>

      {/* Tags */}
      {memory.tags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1">
          {memory.tags.map((tag) => (
            <span
              key={tag}
              className="inline-block rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Relevance bar */}
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs text-zinc-500 dark:text-zinc-400">Relevance</span>
        <div className="h-1.5 flex-1 rounded-full bg-zinc-200 dark:bg-zinc-700">
          <div
            className="h-1.5 rounded-full bg-blue-500 transition-all"
            style={{ width: `${relevancePercent}%` }}
          />
        </div>
        <span className="text-xs font-mono text-zinc-500">{relevancePercent}%</span>
      </div>

      {/* Source run */}
      {memory.source_run_id && (
        <p className="text-xs text-zinc-400">
          Source:{' '}
          <span className="font-mono text-zinc-500 dark:text-zinc-400">
            {memory.source_run_id}
          </span>
        </p>
      )}
    </div>
  );
}

function AddMemoryForm({
  onSubmit,
  onCancel,
  isPending,
}: {
  onSubmit: (data: CreateMemoryData) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [memoryType, setMemoryType] = useState<MemoryType>('fact');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [relevance, setRelevance] = useState(0.8);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    onSubmit({
      memory_type: memoryType,
      content: content.trim(),
      tags: tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      relevance,
    });
  };

  const inputClass =
    'w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500';
  const labelClass = 'block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1';

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-800 dark:bg-blue-950/30"
    >
      <h4 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Add Memory</h4>
      <div className="space-y-3">
        <div>
          <label className={labelClass}>Type</label>
          <select
            className={inputClass}
            value={memoryType}
            onChange={(e) => setMemoryType(e.target.value as MemoryType)}
          >
            {MEMORY_TABS.filter((t) => t.value !== 'all').map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Content</label>
          <textarea
            className={`${inputClass} min-h-[60px] resize-y`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What should the agent remember?"
            rows={2}
            required
          />
        </div>
        <div>
          <label className={labelClass}>Tags (comma-separated)</label>
          <input
            className={inputClass}
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="e.g. materials, aluminum, best-practice"
          />
        </div>
        <div>
          <label className={labelClass}>
            Relevance
            <span className="ml-2 text-xs font-normal text-zinc-500">
              {relevance.toFixed(2)}
            </span>
          </label>
          <input
            type="range"
            className="w-full accent-blue-600"
            min={0}
            max={1}
            step={0.05}
            value={relevance}
            onChange={(e) => setRelevance(parseFloat(e.target.value))}
          />
        </div>
        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={!content.trim() || isPending}
            className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? 'Saving...' : 'Save Memory'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-zinc-300 px-4 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}

/* ---------- Main Component ---------- */

export default function MemoryBrowser({ agentId }: MemoryBrowserProps) {
  const [activeTab, setActiveTab] = useState<MemoryType | 'all'>('all');
  const [showAddForm, setShowAddForm] = useState(false);

  const typeFilter = activeTab === 'all' ? undefined : activeTab;
  const { data: memories = [], isLoading } = useAgentMemories(agentId, typeFilter);
  const createMutation = useCreateMemory(agentId);
  const deleteMutation = useDeleteMemory(agentId);

  const handleCreate = useCallback(
    (data: CreateMemoryData) => {
      createMutation.mutate(data, {
        onSuccess: () => setShowAddForm(false),
      });
    },
    [createMutation],
  );

  const handleDelete = useCallback(
    (memoryId: string) => {
      deleteMutation.mutate(memoryId);
    },
    [deleteMutation],
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Agent Memories
          {memories.length > 0 && (
            <span className="ml-2 text-sm font-normal text-zinc-500">({memories.length})</span>
          )}
        </h3>
        {!showAddForm && (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            + Add Memory
          </button>
        )}
      </div>

      {/* Type filter tabs */}
      <div className="flex gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-800">
        {MEMORY_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveTab(tab.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.value
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Add form */}
      {showAddForm && (
        <AddMemoryForm
          onSubmit={handleCreate}
          onCancel={() => setShowAddForm(false)}
          isPending={createMutation.isPending}
        />
      )}

      {/* Memory list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800"
            />
          ))}
        </div>
      ) : memories.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 py-12 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {activeTab === 'all'
              ? 'No memories yet. Add memories to help this agent learn from past interactions.'
              : `No ${TYPE_LABELS[activeTab as MemoryType]?.toLowerCase()} memories found.`}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {memories.map((memory) => (
            <MemoryCard key={memory.id} memory={memory} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
