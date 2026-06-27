import { create } from "zustand";
import { useGanttStore } from "./useGanttStore";

/** Снимок состояния для истории. */
interface Snapshot {
  bars: ReturnType<typeof useGanttStore.getState>["bars"];
  connections: ReturnType<typeof useGanttStore.getState>["connections"];
  config: ReturnType<typeof useGanttStore.getState>["config"];
}

interface HistoryStore {
  /** Стек прошлых состояний (для undo). */
  past: Snapshot[];
  /** Стек будущих состояний (для redo). */
  future: Snapshot[];

  /** Сохранить текущее состояние в историю перед изменением. */
  saveSnapshot: () => void;
  /** Отменить последнее действие. */
  undo: () => void;
  /** Повторить отменённое действие. */
  redo: () => void;
  /** Очистить историю. */
  clear: () => void;
  /** Можно ли отменить. */
  canUndo: () => boolean;
  /** Можно ли повторить. */
  canRedo: () => boolean;
}

const MAX_HISTORY = 50;

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  past: [],
  future: [],

  saveSnapshot: () => {
    const { bars, connections, config } = useGanttStore.getState();
    const snapshot: Snapshot = {
      bars: JSON.parse(JSON.stringify(bars)),
      connections: JSON.parse(JSON.stringify(connections)),
      config: JSON.parse(JSON.stringify(config)),
    };
    set((state) => ({
      past: [...state.past.slice(-MAX_HISTORY + 1), snapshot],
      future: [], // Новое действие очищает redo-стек
    }));
  },

  undo: () => {
    const { past, future } = get();
    if (past.length === 0) return;

    // Сохраняем текущее состояние в future
    const { bars, connections, config } = useGanttStore.getState();
    const current: Snapshot = {
      bars: JSON.parse(JSON.stringify(bars)),
      connections: JSON.parse(JSON.stringify(connections)),
      config: JSON.parse(JSON.stringify(config)),
    };

    // Восстанавливаем предыдущее состояние
    const previous = past[past.length - 1];
    useGanttStore.setState({
      bars: previous.bars,
      connections: previous.connections,
      config: previous.config,
    });

    set({
      past: past.slice(0, -1),
      future: [current, ...future],
    });
  },

  redo: () => {
    const { past, future } = get();
    if (future.length === 0) return;

    // Сохраняем текущее состояние в past
    const { bars, connections, config } = useGanttStore.getState();
    const current: Snapshot = {
      bars: JSON.parse(JSON.stringify(bars)),
      connections: JSON.parse(JSON.stringify(connections)),
      config: JSON.parse(JSON.stringify(config)),
    };

    // Восстанавливаем следующее состояние
    const next = future[0];
    useGanttStore.setState({
      bars: next.bars,
      connections: next.connections,
      config: next.config,
    });

    set({
      past: [...past, current],
      future: future.slice(1),
    });
  },

  clear: () => set({ past: [], future: [] }),

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,
}));
