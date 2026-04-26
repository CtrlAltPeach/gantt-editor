import { create } from "zustand";
import { GanttConfig, GanttBar, GanttConnection } from "../types/gantt";
import { tokens } from "../styles/tokens";

/** Глобальное состояние приложения и набор действий для его изменения. */
interface GanttStore {
        /** Параметры сетки диаграммы. */
        config: GanttConfig;
        /** Все полосы на диаграмме. */
        bars: GanttBar[];
        /** Связи между полосами (стрелки). */
        connections: GanttConnection[];

        /** Заменяет список строк. */
        setRows: (rows: string[]) => void;
        /** Заменяет список годов (меняет размер и подписи сетки). */
        setYears: (years: GanttConfig["years"]) => void;
        /** Добавляет новую полосу. */
        addBar: (bar: GanttBar) => void;
        /** Обновляет произвольные поля полосы по id. */
        updateBar: (id: string, patch: Partial<GanttBar>) => void;
        /**
         * Перемещает полосу и все транзитивно связанные с ней полосы.
         * @param deltaX  Сдвиг по горизонтали в SVG-пикселях.
         * @param rowIndex  Новая строка (только для перетаскиваемой полосы).
         */
        moveBar: (id: string, deltaX: number, rowIndex?: number) => void;
        /** Удаляет полосу и все связи, в которых она участвует. */
        removeBar: (id: string) => void;
        /** Добавляет связь между двумя полосами. */
        addConnection: (conn: GanttConnection) => void;
        /** Удаляет связь по id. */
        removeConnection: (id: string) => void;
}

export const useGanttStore = create<GanttStore>((set) => ({
        config: {
                years: [
                        { label: "Год 1", months: ["Янв", "Фев", "Март", "Апр", "Май", "Июнь", "Июль", "Авг", "Сен", "Окт", "Ноя", "Дек"] },
                ],
                rows: ["Монтаж оборудования", "ПНР", "Надземная часть", "Подземная часть", "Инженерные сети", "Дороги и благоустройство"],
                cellWidth: tokens.grid.defaultCellWidth,
                rowHeight: tokens.grid.defaultRowHeight,
                headerHeight: tokens.grid.defaultHeaderHeight,
                labelWidth: tokens.grid.defaultLabelWidth,
        },
        bars: [],
        connections: [],

        setRows: (rows) => set((s) => ({ config: { ...s.config, rows } })),
        setYears: (years) => set((s) => ({ config: { ...s.config, years } })),
        addBar: (bar) => set((s) => ({ bars: [...s.bars, bar] })),
        updateBar: (id, patch) => set((s) => ({
                bars: s.bars.map((b) => (b.id === id ? { ...b, ...patch } : b)),
        })),

        moveBar: (id, deltaX, rowIndex?) => set((s) => {
                if (deltaX === 0 && rowIndex === undefined) return s;

                // BFS по графу связей — собираем все полосы, жёстко связанные с перетаскиваемой,
                // чтобы сдвинуть их вместе и не нарушить топологию диаграммы.
                const visited = new Set<string>([id]);
                const queue = [id];
                while (queue.length > 0) {
                        const cur = queue.shift()!;
                        for (const c of s.connections) {
                                const nb = c.fromBarId === cur ? c.toBarId
                                        : c.toBarId === cur ? c.fromBarId
                                                : null;
                                if (nb && !visited.has(nb)) { visited.add(nb); queue.push(nb); }
                        }
                }

                return {
                        bars: s.bars.map((b) => {
                                if (!visited.has(b.id)) return b;
                                const patch: Partial<GanttBar> = {};
                                // Не даём полосе уйти левее колонки с подписями.
                                if (deltaX !== 0) patch.startX = Math.max(s.config.labelWidth, b.startX + deltaX);
                                // Строку меняем только у непосредственно перетаскиваемой полосы.
                                if (b.id === id && rowIndex !== undefined) patch.rowIndex = rowIndex;
                                return { ...b, ...patch };
                        }),
                };
        }),

        removeBar: (id) => set((s) => ({
                bars: s.bars.filter((b) => b.id !== id),
                // Удаляем все связи с участием удалённой полосы, чтобы не оставлять «висячих» рёбер.
                connections: s.connections.filter((c) => c.fromBarId !== id && c.toBarId !== id),
        })),
        addConnection: (conn) => set((s) => ({ connections: [...s.connections, conn] })),
        removeConnection: (id) => set((s) => ({ connections: s.connections.filter((c) => c.id !== id) })),
}));
