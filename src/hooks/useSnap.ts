import { useMemo } from "react";

interface MonthColumn {
        x: number;
        label: string;
}

interface UseSnapResult {
        /** Отсортированный массив X-координат всех snap-точек. */
        snapPoints: number[];
        /** Возвращает ближайшую snap-точку для заданного rawX. */
        snap: (rawX: number) => number;
        /** Возвращает строковую подпись snap-точки (0, 1/3, 1/2, 2/3, 1). */
        getSnapLabel: (snappedX: number) => string;
}

const FRACTIONS = [0, 1 / 3, 1 / 2, 2 / 3, 1] as const;

const FRACTION_LABELS: Record<number, string> = {
        0: "0",
        [1 / 3]: "1/3",
        [1 / 2]: "1/2",
        [2 / 3]: "2/3",
        1: "1",
};

/**
 * Вычисляет snap-точки для колонок сетки и предоставляет функции snap/getSnapLabel.
 * Snap-точки: начало ячейки + 1/3, 1/2, 2/3, конец каждой ячейки.
 */
export function useSnap(monthColumns: MonthColumn[], cellWidth: number): UseSnapResult {
        const snapPoints = useMemo(
                () => monthColumns.flatMap((col) => FRACTIONS.map((f) => col.x + f * cellWidth)),
                [monthColumns, cellWidth]
        );

        const snap = (rawX: number): number =>
                snapPoints.reduce((best, p) =>
                        Math.abs(p - rawX) < Math.abs(best - rawX) ? p : best
                );

        const getSnapLabel = (snappedX: number): string => {
                for (const col of monthColumns) {
                        for (const f of FRACTIONS) {
                                if (Math.abs(col.x + f * cellWidth - snappedX) < 0.5)
                                        return FRACTION_LABELS[f] ?? "";
                        }
                }
                return "";
        };

        return { snapPoints, snap, getSnapLabel };
}
