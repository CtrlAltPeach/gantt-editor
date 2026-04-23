import { create } from "zustand";
import { GanttConfig, GanttBar } from "../types/gantt";

interface GanttStore {
        config: GanttConfig;
        bars: GanttBar[];
        setRows: (rows: string[]) => void;
        addBar: (bar: GanttBar) => void;
        updateBar: (id: string, patch: Partial<GanttBar>) => void;
        removeBar: (id: string) => void;
}

export const useGanttStore = create<GanttStore>((set) => ({
        config: {
                years: [
                        { label: "Год 1", months: ["Я", "Ф", "М", "А", "М", "И", "И", "А", "С", "О", "Н", "Д"] },
                        { label: "Год 2", months: ["Я", "Ф", "М", "А", "М", "И", "И", "А", "С", "О", "Н", "Д"] },
                        { label: "Год 3", months: ["Я", "Ф", "М", "А", "М", "И", "И", "А", "С", "О", "Н", "Д"] },
                ],
                rows: ["Монтаж оборудования", "ПНР", "Надземная часть", "Подземная часть", "Инженерные сети", "Дороги и благоустройство"],
                cellWidth: 40,
                rowHeight: 36,
                headerHeight: 24,
                labelWidth: 160,
        },
        bars: [],
        setRows: (rows) => set((s) => ({ config: { ...s.config, rows } })),
        addBar: (bar) => set((s) => ({ bars: [...s.bars, bar] })),
        updateBar: (id, patch) => set((s) => ({
                bars: s.bars.map((b) => (b.id === id ? { ...b, ...patch } : b)),
        })),
        removeBar: (id) => set((s) => ({ bars: s.bars.filter((b) => b.id !== id) })),
}));