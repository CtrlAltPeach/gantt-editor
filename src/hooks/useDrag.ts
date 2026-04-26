import { useRef } from "react";
import { useGanttStore } from "../store/useGanttStore";
import { GanttBar } from "../types/gantt";
import { tokens } from "../styles/tokens";

interface UseDragOptions {
        bar: GanttBar;
        snapPoints: number[];
        rowCount: number;
        rowHeight: number;
        headerHeight: number;
        yOffset: number;
        zoom: number;
        svgRef: React.RefObject<SVGSVGElement | null>;
        onStartConnection: (barId: string, edge: "start" | "end") => void;
        onContextMenu: (barId: string, x: number, y: number) => void;
}

interface UseDragResult {
        /** Обработчик mousedown на полосе — начинает drag или рисование связи. */
        onMouseDown: (e: React.MouseEvent) => void;
        /** Обработчик contextmenu — открывает контекстное меню. */
        onContextMenu: (e: React.MouseEvent) => void;
}

/**
 * Управляет drag-поведением одной полосы:
 * - обычный drag: вычисляет deltaX со snap, обновляет rowIndex
 * - Shift+click у края: инициирует рисование связи
 * - правый клик: открывает контекстное меню
 */
export function useDrag({
        bar,
        snapPoints,
        rowCount,
        rowHeight,
        headerHeight,
        yOffset,
        zoom,
        svgRef,
        onStartConnection,
        onContextMenu,
}: UseDragOptions): UseDragResult {
        const { moveBar } = useGanttStore();

        const y = bar.rowIndex * rowHeight + headerHeight * 2 + yOffset;

        // Смещение мыши от левого края полосы при захвате — предотвращает «прыжок».
        const dragOffset = useRef<{ dx: number; dy: number } | null>(null);
        // Предыдущий snapped X — нужен для вычисления deltaX (moveBar принимает дельту).
        const prevSnappedX = useRef(bar.startX);

        const snapToNearest = (rawX: number): number =>
                snapPoints.reduce((best, p) =>
                        Math.abs(p - rawX) < Math.abs(best - rawX) ? p : best
                );

        const onMouseDown = (e: React.MouseEvent) => {
                e.stopPropagation();

                if (e.shiftKey) {
                        // Shift+клик у края полосы → начать рисование связи.
                        const rect = svgRef.current!.getBoundingClientRect();
                        const mouseX = (e.clientX - rect.left) / zoom;
                        const distToStart = Math.abs(mouseX - bar.startX);
                        const distToEnd = Math.abs(mouseX - (bar.startX + bar.width));
                        if (distToStart <= tokens.bar.edgeRadius || distToEnd <= tokens.bar.edgeRadius) {
                                onStartConnection(bar.id, distToStart <= distToEnd ? "start" : "end");
                        }
                        return;
                }

                const rect = svgRef.current!.getBoundingClientRect();
                const mouseX = (e.clientX - rect.left) / zoom;
                const mouseY = (e.clientY - rect.top) / zoom;
                dragOffset.current = { dx: mouseX - bar.startX, dy: mouseY - y };
                prevSnappedX.current = bar.startX;

                const onMove = (ev: MouseEvent) => {
                        if (!dragOffset.current) return;
                        const rawX = (ev.clientX - rect.left) / zoom - dragOffset.current.dx;
                        const rawY = (ev.clientY - rect.top) / zoom;
                        const snappedX = snapToNearest(rawX);
                        const deltaX = snappedX - prevSnappedX.current;
                        const rowIndex = Math.max(
                                0,
                                Math.min(rowCount - 1, Math.floor((rawY - headerHeight * 2) / rowHeight))
                        );
                        moveBar(bar.id, deltaX, rowIndex);
                        prevSnappedX.current = snappedX;
                };

                const onUp = () => {
                        dragOffset.current = null;
                        window.removeEventListener("mousemove", onMove);
                        window.removeEventListener("mouseup", onUp);
                };

                // Слушаем window, чтобы не терять drag при быстром выходе за пределы SVG.
                window.addEventListener("mousemove", onMove);
                window.addEventListener("mouseup", onUp);
        };

        const onContextMenuHandler = (e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                onContextMenu(bar.id, e.clientX, e.clientY);
        };

        return { onMouseDown, onContextMenu: onContextMenuHandler };
}
