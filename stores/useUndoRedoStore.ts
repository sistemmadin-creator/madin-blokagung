import { create } from 'zustand';

export const MAX_HISTORY_STEPS = 5;

export interface UndoRedoAction {
  id: string;
  module: 'jadwal' | 'absensi' | 'santri' | 'asatidz' | 'muhafadzoh' | 'umum';
  title: string;
  timestamp: number;
  undo: () => Promise<boolean | void>;
  redo: () => Promise<boolean | void>;
}

export interface HistoryNotification {
  message: string;
  type: 'action' | 'undo' | 'redo' | 'error';
  timestamp: number;
}

interface UndoRedoState {
  undoStack: UndoRedoAction[];
  redoStack: UndoRedoAction[];
  isExecuting: boolean;
  notification: HistoryNotification | null;

  // Actions
  recordAction: (action: Omit<UndoRedoAction, 'id' | 'timestamp'>) => void;
  undo: () => Promise<boolean>;
  redo: () => Promise<boolean>;
  clearHistory: () => void;
  dismissNotification: () => void;
}

export const useUndoRedoStore = create<UndoRedoState>((set, get) => ({
  undoStack: [],
  redoStack: [],
  isExecuting: false,
  notification: null,

  recordAction: (action) => {
    const newAction: UndoRedoAction = {
      ...action,
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `act_${Date.now()}_${Math.random()}`,
      timestamp: Date.now(),
    };

    set((state) => {
      // Ring buffer: simpan maksimal (MAX_HISTORY_STEPS - 1) aksi terdahulu, lalu sisipkan aksi baru
      const trimmedUndo = state.undoStack.slice(-(MAX_HISTORY_STEPS - 1));
      return {
        undoStack: [...trimmedUndo, newAction],
        redoStack: [], // Tiap aksi mutasi baru mereset redo stack
        notification: {
          message: `Perubahan tersimpan: ${action.title}`,
          type: 'action',
          timestamp: Date.now(),
        },
      };
    });
  },

  undo: async () => {
    const { undoStack, redoStack, isExecuting } = get();
    if (isExecuting || undoStack.length === 0) return false;

    // Ambil aksi terakhir dari undo stack
    const actionToUndo = undoStack[undoStack.length - 1];
    const nextUndoStack = undoStack.slice(0, -1);

    set({ isExecuting: true });
    try {
      await actionToUndo.undo();

      set((state) => {
        const trimmedRedo = state.redoStack.slice(-(MAX_HISTORY_STEPS - 1));
        return {
          undoStack: nextUndoStack,
          redoStack: [...trimmedRedo, actionToUndo],
          isExecuting: false,
          notification: {
            message: `Undo berhasil: ${actionToUndo.title}`,
            type: 'undo',
            timestamp: Date.now(),
          },
        };
      });
      return true;
    } catch (err) {
      console.error('Gagal menjalankan Undo:', err);
      set({
        isExecuting: false,
        notification: {
          message: `Gagal membatalkan: ${actionToUndo.title}`,
          type: 'error',
          timestamp: Date.now(),
        },
      });
      return false;
    }
  },

  redo: async () => {
    const { undoStack, redoStack, isExecuting } = get();
    if (isExecuting || redoStack.length === 0) return false;

    // Ambil aksi terakhir dari redo stack
    const actionToRedo = redoStack[redoStack.length - 1];
    const nextRedoStack = redoStack.slice(0, -1);

    set({ isExecuting: true });
    try {
      await actionToRedo.redo();

      set((state) => {
        const trimmedUndo = state.undoStack.slice(-(MAX_HISTORY_STEPS - 1));
        return {
          undoStack: [...trimmedUndo, actionToRedo],
          redoStack: nextRedoStack,
          isExecuting: false,
          notification: {
            message: `Redo berhasil: ${actionToRedo.title}`,
            type: 'redo',
            timestamp: Date.now(),
          },
        };
      });
      return true;
    } catch (err) {
      console.error('Gagal menjalankan Redo:', err);
      set({
        isExecuting: false,
        notification: {
          message: `Gagal mengulangi: ${actionToRedo.title}`,
          type: 'error',
          timestamp: Date.now(),
        },
      });
      return false;
    }
  },

  clearHistory: () => {
    set({ undoStack: [], redoStack: [], notification: null });
  },

  dismissNotification: () => {
    set({ notification: null });
  },
}));

if (typeof window !== 'undefined') {
  (window as any).useUndoRedoStore = useUndoRedoStore;
}
