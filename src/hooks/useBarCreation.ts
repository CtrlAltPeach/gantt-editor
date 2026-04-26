import { useRef, useState, RefObject } from "react";
import { useGanttStore } from "../store/useGanttStore";
import { GanttBar, GanttConnection } from "../types/gantt";
import { BarLayout } from "../utils/layout";
import { tokens } from "../styles/tokens";

interface ConnDraft {
        fromBarId: string;
        fromEdge: "start" | "end";
        mouseX: number;
        mouseY: number;
}

interface BarCreationOptions {
        svgRef: RefObject<SVGSVGElement | null>;
        zoom: number;
        labelWidth: number;
        cellWidth: number;
        rowHeight: number;
        headerHeight: number;
        rowCount: number;
        bars: GanttBar[];
        layoutMap: Map<string, BarLayout>;
        colorIndex: number;
        barLabel: string;
        isDashed: boolean;
        /** Функция snap — принимает rawX, возвращает snapped X. */
        snap: (rawX: number) => number;
        /** Функция getSnapLabel — возвращает строковую подпись snap-точки. */
        getSnapLabel: (x: number) => string;
}

interface BarCreationResult {
        /** Текущее превью новой полосы при рисовании. */
        preview: { x: number; width: number; row: number } | null;
        /** Текущая подсказка snap-позиции рядом с курсором. */
        snapHint: { x: number; y: number; label: string } | null;
        /** Текущий черновик связи при рисовании стрелки. */
        connDraft: ConnDraft | null;
        /** Устанавливает connDraft — используется при начале рисования связи. */
        setConnDraft: (draft: ConnDraft | null) => void;
        /** Возвращает SVG-точку на краю полосы (середина высоты). */
        getBarEdgePoint: (barId: string, edge: "start" | "end") => { x: number; y: number } | null;
        /** Ищет край полосы вблизи SVG-точки (для завершения рисования связи). */
        findBarEdgeAt: (svgX: number, svgY: number, excludeBarId?: string) => { barId: string; edge: "start" | "end" } | null;
        /** Обработчик mousedown на SVG-холсте — начинает рисование полосы. */
        onMouseDown: (e: React.MouseEvent) => void;
        /** Обработчик mousemove на SVG-холсте — обновляет превью и snap-подсказку. */
        onMouseMove: (e: React.MouseEvent) => void;
        /** Обработчик mouseup на SVG-холсте — фиксирует полосу или связь. */
        onMouseUp: (e: React.MouseEvent) => void;
        /** Обработчик mouseleave на SVG-холсте — сбрасывает рисование при выходе. */
        onMouseLeave: () => void;
}

/**
 * Управляет созданием новых полос и рисованием связей на SVG-холсте.
 * Изолирует все вычисления координат и логику drag-to-create от компонента.
 */
export function useBarCreation({
        svgRef,
        zoom,
        labelWidth,
        cellWidth,
        rowHeight,
        headerHeight,
        rowCount,
        bars,
        layoutMap,
        colorIndex,
        barLabel,
        isDashed,
        snap,
        getSnapLabel,
}: BarCreationOptions): BarCreationResult {
        const { addBar, addConnection } = useGanttStore();

        const COLORS = tokens.bar.colors;
        const EDGE_RADIUS = tokens.bar.edgeRadius;

        const dragging = useRef<{ startX: number; rowIndex: number } | null>(null);
        const [preview, setPreview] = useState<{ x: number; width: number; row: number } | null>(null);
        const [snapHint, setSnapHint] = useState<{ x: number; y: number; label: string } | null>(null);
        const [connDraft, setConnDraft] = useState<ConnDraft | null>(null);

        /** Переводит экранный X в SVG-координату. */
        const getSvgX = (clientX: number): number => {
                const rect = svgRef.current!.getBoundingClientRect();
                return (clientX - rect.left) / zoom;
        };

        /** Переводит экранный Y в SVG-координату. */
        const getSvgY = (clientY: number): number => {
                const rect = svgRef.current!.getBoundingClientRect();
                return (clientY - rect.top) / zoom;
        };

        /** Вычисляет индекс строки по экранному Y (зажат в [0, rowCount-1]). */
        const getRowIndex = (clientY: number): number => {
                const rect = svgRef.current!.getBoundingClientRect();
                const y = (clientY - rect.top) / zoom - headerHeight * 2;
                return Math.max(0, Math.min(rowCount - 1, Math.floor(y / rowHeight)));
        };

        const getBarEdgePoint = (barId: string, edge: "start" | "end"): { x: number; y: number } | null => {
                const bar = bars.find((b) => b.id === barId);
                if (!bar) return null;
                const layout = layoutMap.get(barId);
                const yOff = layout?.yOffset ?? tokens.bar.paddingTop;
                const bHeight = layout?.barHeight ?? tokens.bar.height;
                const x = edge === "start" ? bar.startX : bar.startX + bar.width;
                const y = bar.rowIndex * rowHeight + headerHeight * 2 + yOff + bHeight / 2;
                return { x, y };
        };

        const findBarEdgeAt = (
                svgX: number,
                svgY: number,
                excludeBarId?: string
        ): { barId: string; edge: "start" | "end" } | null => {
                for (const bar of bars) {
                        if (bar.id === excludeBarId) continue;
                        const layout = layoutMap.get(bar.id);
                        const barTop = bar.rowIndex * rowHeight + headerHeight * 2 + (layout?.yOffset ?? tokens.bar.slotPaddingY);
                        const barBottom = barTop + (layout?.barHeight ?? tokens.bar.height);
                        if (svgY < barTop - 6 || svgY > barBottom + 6) continue;
                        if (Math.abs(svgX - bar.startX) <= EDGE_RADIUS)
                                return { barId: bar.id, edge: "start" };
                        if (Math.abs(svgX - (bar.startX + bar.width)) <= EDGE_RADIUS)
                                return { barId: bar.id, edge: "end" };
                }
                return null;
        };

        const onMouseDown = (e: React.MouseEvent) => {
                if (e.shiftKey) return;
                const rawX = getSvgX(e.clientX);
                if (rawX < labelWidth) return;
                const snappedX = snap(rawX);
                const rowIndex = getRowIndex(e.clientY);
                dragging.current = { startX: snappedX, rowIndex };
                setPreview({ x: snappedX, width: 0, row: rowIndex });
                setSnapHint(null);
        };

        const onMouseMove = (e: React.MouseEvent) => {
                const rawX = getSvgX(e.clientX);
                const rawY = getSvgY(e.clientY);

                if (connDraft) {
                        setConnDraft((d) => (d ? { ...d, mouseX: rawX, mouseY: rawY } : null));
                        return;
                }

                if (rawX >= labelWidth) {
                        const snappedX = snap(rawX);
                        setSnapHint({ x: snappedX, y: rawY - 16, label: getSnapLabel(snappedX) });
                } else {
                        setSnapHint(null);
                }

                if (!dragging.current) return;
                const snappedX = snap(rawX);
                const start = dragging.current.startX;
                setPreview({ x: Math.min(start, snappedX), width: Math.abs(snappedX - start), row: dragging.current.rowIndex });
        };

        const onMouseUp = (e: React.MouseEvent) => {
                if (connDraft) {
                        const svgX = getSvgX(e.clientX);
                        const svgY = getSvgY(e.clientY);
                        const target = findBarEdgeAt(svgX, svgY, connDraft.fromBarId);
                        if (target) {
                                const conn: GanttConnection = {
                                        id: crypto.randomUUID(),
                                        fromBarId: connDraft.fromBarId,
                                        fromEdge: connDraft.fromEdge,
                                        toBarId: target.barId,
                                        toEdge: target.edge,
                                };
                                addConnection(conn);
                        }
                        setConnDraft(null);
                        return;
                }

                if (!dragging.current || !preview || preview.width < cellWidth / 3) {
                        dragging.current = null;
                        setPreview(null);
                        return;
                }

                addBar({
                        id: crypto.randomUUID(),
                        rowIndex: dragging.current.rowIndex,
                        startX: preview.x,
                        width: preview.width,
                        color: COLORS[colorIndex % COLORS.length],
                        label: barLabel,
                        dashed: isDashed,
                });
                dragging.current = null;
                setPreview(null);
                setSnapHint(null);
        };

        const onMouseLeave = () => {
                if (connDraft) return;
                dragging.current = null;
                setPreview(null);
        };

        return {
                preview,
                snapHint,
                connDraft,
                setConnDraft,
                getBarEdgePoint,
                findBarEdgeAt,
                onMouseDown,
                onMouseMove,
                onMouseUp,
                onMouseLeave,
        };
}
