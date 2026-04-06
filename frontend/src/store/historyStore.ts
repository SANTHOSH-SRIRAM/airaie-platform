import { create } from 'zustand';

export interface HistoryCommand {
  id: string;
  label: string;
  execute: () => void;
  undo: () => void;
}

export interface HistoryState {
  undoStack: HistoryCommand[];
  redoStack: HistoryCommand[];
  maxSize: number;

  // Computed-like
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Actions
  push: (command: HistoryCommand) => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  undoStack: [],
  redoStack: [],
  maxSize: 50,

  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,

  push: (command) =>
    set((s) => {
      const newStack = [...s.undoStack, command];
      // Trim if over max size
      if (newStack.length > s.maxSize) {
        newStack.shift();
      }
      return {
        undoStack: newStack,
        redoStack: [], // Clear redo stack on new action
      };
    }),

  undo: () => {
    const s = get();
    if (s.undoStack.length === 0) return;
    const command = s.undoStack[s.undoStack.length - 1];
    command.undo();
    set({
      undoStack: s.undoStack.slice(0, -1),
      redoStack: [...s.redoStack, command],
    });
  },

  redo: () => {
    const s = get();
    if (s.redoStack.length === 0) return;
    const command = s.redoStack[s.redoStack.length - 1];
    command.execute();
    set({
      redoStack: s.redoStack.slice(0, -1),
      undoStack: [...s.undoStack, command],
    });
  },

  clear: () => set({ undoStack: [], redoStack: [] }),
}));
