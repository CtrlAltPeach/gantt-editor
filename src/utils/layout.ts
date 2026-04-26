import { GanttBar } from "../types/gantt";

/** Результат вычисления позиции полосы внутри строки при наложениях. */
export interface BarLayout {
        /** Высота полосы в пикселях (уменьшается при наложении). */
        barHeight: number;
        /** Вертикальный отступ от верхнего края строки. */
        yOffset: number;
}

/** Погрешность сравнения координат — исключает ложные наложения из-за float-ошибок. */
const EPS = 0.5;

/** Возвращает true, если две полосы пересекаются по горизонтали. */
function overlaps(a: GanttBar, b: GanttBar): boolean {
        return a.startX < b.startX + b.width - EPS && a.startX + a.width > b.startX + EPS;
}

/**
 * Вычисляет высоту и вертикальное смещение для каждой полосы.
 *
 * Алгоритм:
 * 1. Группируем полосы по строкам.
 * 2. В каждой строке строим граф наложений и находим связные компоненты (BFS).
 * 3. Для каждой компоненты жадно распределяем полосы по «подстрокам»
 *    (interval graph coloring), чтобы пересекающиеся полосы оказались на разных уровнях.
 * 4. Высота каждой полосы = rowHeight / количество_подстрок.
 */
export function computeLayout(bars: GanttBar[], rowHeight: number): Map<string, BarLayout> {
        // Группируем полосы по индексу строки.
        const byRow = new Map<number, GanttBar[]>();
        for (const bar of bars) {
                if (!byRow.has(bar.rowIndex)) byRow.set(bar.rowIndex, []);
                byRow.get(bar.rowIndex)!.push(bar);
        }

        const result = new Map<string, BarLayout>();

        for (const [, rowBars] of byRow) {
                const barById = new Map(rowBars.map((b) => [b.id, b]));

                // Строим список смежности для графа наложений.
                const adj = new Map<string, string[]>();
                for (const bar of rowBars) adj.set(bar.id, []);
                for (let i = 0; i < rowBars.length; i++) {
                        for (let j = i + 1; j < rowBars.length; j++) {
                                if (overlaps(rowBars[i], rowBars[j])) {
                                        adj.get(rowBars[i].id)!.push(rowBars[j].id);
                                        adj.get(rowBars[j].id)!.push(rowBars[i].id);
                                }
                        }
                }

                // BFS — находим связные компоненты графа наложений.
                const visited = new Set<string>();

                for (const startBar of rowBars) {
                        if (visited.has(startBar.id)) continue;

                        const component: GanttBar[] = [];
                        const queue = [startBar.id];
                        visited.add(startBar.id);
                        while (queue.length > 0) {
                                const id = queue.shift()!;
                                component.push(barById.get(id)!);
                                for (const neighborId of adj.get(id)!) {
                                        if (!visited.has(neighborId)) {
                                                visited.add(neighborId);
                                                queue.push(neighborId);
                                        }
                                }
                        }

                        // Одиночная полоса без наложений — стандартный размер.
                        if (component.length === 1 && adj.get(component[0].id)!.length === 0) {
                                result.set(component[0].id, { barHeight: 20, yOffset: 8 });
                                continue;
                        }

                        // Жадная раскраска интервального графа:
                        // сортируем по startX и присваиваем каждой полосе первую
                        // свободную «подстроку» (слот), в которой предыдущая полоса уже закончилась.
                        const sorted = [...component].sort((a, b) => a.startX - b.startX);
                        const subRows = new Map<string, number>();
                        const slotEndX: number[] = []; // правый край последней полосы в каждом слоте

                        for (const bar of sorted) {
                                let slot = -1;
                                for (let i = 0; i < slotEndX.length; i++) {
                                        if (slotEndX[i] <= bar.startX) {
                                                slot = i;
                                                slotEndX[i] = bar.startX + bar.width;
                                                break;
                                        }
                                }
                                if (slot === -1) {
                                        // Все существующие слоты заняты — открываем новый.
                                        slot = slotEndX.length;
                                        slotEndX.push(bar.startX + bar.width);
                                }
                                subRows.set(bar.id, slot);
                        }

                        const N = Math.max(1, slotEndX.length);
                        const slotHeight = rowHeight / N;

                        for (const bar of component) {
                                const subRow = subRows.get(bar.id) ?? 0;
                                result.set(bar.id, {
                                        barHeight: Math.max(6, Math.floor(slotHeight) - 4),
                                        yOffset: subRow * slotHeight + 2,
                                });
                        }
                }
        }

        return result;
}
