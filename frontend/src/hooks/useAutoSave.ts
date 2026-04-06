import { useCallback, useEffect, useRef, useState } from 'react';
import { useWorkflowStore } from '@store/workflowStore';
import { saveWorkflow } from '@api/workflows';

export interface AutoSaveState {
  isSaving: boolean;
  lastSavedAt: Date | null;
  saveNow: () => Promise<void>;
}

export function useAutoSave(workflowId: string, debounceMs: number = 5000): AutoSaveState {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);

  const doSave = useCallback(async () => {
    if (isSavingRef.current) return;
    const { nodes, edges, metadata, isDirty, markClean } = useWorkflowStore.getState();
    if (!isDirty || !metadata) return;

    isSavingRef.current = true;
    setIsSaving(true);

    try {
      // Build dependency map from edges
      const depsMap = new Map<string, string[]>();
      for (const edge of edges) {
        const deps = depsMap.get(edge.target) ?? [];
        deps.push(edge.source);
        depsMap.set(edge.target, deps);
      }

      await saveWorkflow(workflowId, {
        name: metadata.name,
        steps: nodes.map((n) => ({
          id: n.id,
          name: n.data.label,
          type: (n.data.nodeType === 'tool' ? 'action' : n.data.nodeType) as 'action' | 'condition' | 'loop' | 'parallel',
          status: 'pending' as const,
          action: n.data.subtype,
          config: n.data.inputs,
          position: n.position,
          connections: depsMap.get(n.id) ?? [],
        })),
      });

      markClean();
      setLastSavedAt(new Date());
    } catch (err) {
      console.error('[autoSave] save failed:', err);
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }, [workflowId]);

  // Watch isDirty and debounce auto-save
  useEffect(() => {
    const unsub = useWorkflowStore.subscribe((state) => {
      if (state.isDirty) {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          void doSave();
        }, debounceMs);
      }
    });

    return () => {
      unsub();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [doSave, debounceMs]);

  // Ctrl+S / Cmd+S keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        void doSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [doSave]);

  return { isSaving, lastSavedAt, saveNow: doSave };
}
