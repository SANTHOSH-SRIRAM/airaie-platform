import { create } from 'zustand';
import type { Board } from '@/types/board';
import type { Card } from '@/types/card';
import type { Gate, GateStatus } from '@/types/gate';
import type { IntentSpec } from '@/types/intent';
import type { ExecutionPlan } from '@/types/plan';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BoardStore {
  // State
  boards: Board[];
  activeBoard: Board | null;
  cards: Card[];
  gates: Gate[];
  intents: IntentSpec[];
  activePlan: ExecutionPlan | null;

  // Board actions
  setBoards: (boards: Board[]) => void;
  setActiveBoard: (board: Board | null) => void;

  // Card actions
  setCards: (cards: Card[]) => void;
  addCard: (card: Card) => void;
  updateCard: (id: string, data: Partial<Card>) => void;
  removeCard: (id: string) => void;

  // Gate actions
  setGates: (gates: Gate[]) => void;
  addGate: (gate: Gate) => void;
  updateGateStatus: (id: string, status: GateStatus) => void;

  // Intent actions
  setIntents: (intents: IntentSpec[]) => void;

  // Plan actions
  setActivePlan: (plan: ExecutionPlan | null) => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useBoardStore = create<BoardStore>((set) => ({
  // --- State ---
  boards: [],
  activeBoard: null,
  cards: [],
  gates: [],
  intents: [],
  activePlan: null,

  // --- Board actions ---
  setBoards: (boards) => set({ boards }),

  setActiveBoard: (board) => set({ activeBoard: board }),

  // --- Card actions ---
  setCards: (cards) => set({ cards }),

  addCard: (card) => set((s) => ({ cards: [...s.cards, card] })),

  updateCard: (id, data) =>
    set((s) => ({
      cards: s.cards.map((c) => (c.id === id ? { ...c, ...data } : c)),
    })),

  removeCard: (id) =>
    set((s) => ({
      cards: s.cards.filter((c) => c.id !== id),
    })),

  // --- Gate actions ---
  setGates: (gates) => set({ gates }),

  addGate: (gate) => set((s) => ({ gates: [...s.gates, gate] })),

  updateGateStatus: (id, status) =>
    set((s) => ({
      gates: s.gates.map((g) => (g.id === id ? { ...g, status } : g)),
    })),

  // --- Intent actions ---
  setIntents: (intents) => set({ intents }),

  // --- Plan actions ---
  setActivePlan: (plan) => set({ activePlan: plan }),
}));
