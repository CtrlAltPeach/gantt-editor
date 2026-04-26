import { useRef } from "react";
import { useGanttStore } from "../store/useGanttStore";
import { GanttBar as GanttBarType } from "../types/gantt";

interface Props {
        bar: GanttBarType;
        /** Отсортированный список X-координат, к которым примагничивается курсор. */
        snapPoints: number[];
        /** Общее количество строк — ограничивает rowIndex при перетаскивании. */
        rowCount: number;
        rowHeight: number;
        headerHeight: number;
        /** Высота полосы (зависит от числа пересечений в строке). */
        barHeight: number;
        /** Вертикальный отступ от верхнего края строки. */
        yOffset: number;
        /** Текущий масштаб SVG — нужен для пересчёта координат мыши. */
        zoom: number;
        svgRef: React.RefObject<SVGSVGElement | null>;
        /** Вызывается при Shift+клике по краю полосы для начала рисования связи. */
        onStartConnection: (barId: string, edge: "start" | "end") => void;
        /** Вызывается при правом клике — открывает контекстное меню. */
        onContextMenu: (barId: string, x: number, y: number) => void;
}

export function GanttBar({ bar, snapPoints, rowCount, rowHeight, headerHeight, barHeight, yOffset, zoom, svgRef, onStartConnection, onContextMenu }: Props) {
        const { moveBar } = useGanttStore();
        const height = barHeight;
        const y = bar.rowIndex * rowHeight + headerHeight * 2 + yOffset;

        // Запоминаем смещение мыши от левого края полосы при захвате, чтобы не «прыгать».
        const dragOffset = useRef<{ dx: number; dy: number } | null>(null);
        // Предыдущая снаппированная X для вычисления дельты (moveBar принимает deltaX, не абсолютный X).
        const prevSnappedX = useRef(bar.startX);

        /** Возвращает ближайшую точку snap из заранее вычисленного массива. */
        const snap = (rawX: number) =>
                snapPoints.reduce((best, p) =>
                        Math.abs(p - rawX) < Math.abs(best - rawX) ? p : best
                );

        const onMouseDown = (e: React.MouseEvent) => {
                e.stopPropagation(); // не передаём событие сетке (иначе начнётся рисование новой полосы)

                if (e.shiftKey) {
                        // Shift+клик рядом с краем полосы — начало рисования связи.
                        const rect = svgRef.current!.getBoundingClientRect();
                        const mouseX = (e.clientX - rect.left) / zoom;
                        const distToStart = Math.abs(mouseX - bar.startX);
                        const distToEnd = Math.abs(mouseX - (bar.startX + bar.width));
                        if (distToStart <= 14 || distToEnd <= 14) {
                                onStartConnection(bar.id, distToStart <= distToEnd ? "start" : "end");
                        }
                        return;
                }

                // Обычный drag — вычисляем смещение мыши от левого края полосы.
                const rect = svgRef.current!.getBoundingClientRect();
                const mouseX = (e.clientX - rect.left) / zoom;
                const mouseY = (e.clientY - rect.top) / zoom;
                dragOffset.current = { dx: mouseX - bar.startX, dy: mouseY - y };
                prevSnappedX.current = bar.startX;

                const onMove = (ev: MouseEvent) => {
                        if (!dragOffset.current) return;
                        const rawX = (ev.clientX - rect.left) / zoom - dragOffset.current.dx;
                        const rawY = (ev.clientY - rect.top) / zoom;
                        const snappedX = snap(rawX);
                        // Передаём дельту, а не абсолютный X — store сдвинет связанные полосы на то же значение.
                        const deltaX = snappedX - prevSnappedX.current;
                        const rowIndex = Math.max(0, Math.min(
                                rowCount - 1,
                                Math.floor((rawY - headerHeight * 2) / rowHeight)
                        ));
                        moveBar(bar.id, deltaX, rowIndex);
                        prevSnappedX.current = snappedX;
                };

                const onUp = () => {
                        dragOffset.current = null;
                        window.removeEventListener("mousemove", onMove);
                        window.removeEventListener("mouseup", onUp);
                };

                // Слушаем window, чтобы не терять drag при быстром движении мыши за пределы SVG.
                window.addEventListener("mousemove", onMove);
                window.addEventListener("mouseup", onUp);
        };

        const onContextMenuHandler = (e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                onContextMenu(bar.id, e.clientX, e.clientY);
        };

        return (
                <g onMouseDown={onMouseDown} onContextMenu={onContextMenuHandler} style={{ cursor: "grab" }}>
                        <rect
                                x={bar.startX} y={y}
                                width={bar.width} height={height}
                                fill={bar.dashed ? "none" : bar.color}
                                stroke={bar.dashed ? bar.color : "#222"}
                                strokeWidth={1.5}
                                strokeDasharray={bar.dashed ? "5 3" : undefined}
                                rx={3}
                        />
                        <text
                                x={bar.startX + bar.width / 2} y={y + height / 2}
                                textAnchor="middle" dominantBaseline="middle"
                                fontSize={10} fill={bar.dashed ? bar.color : "white"} fontWeight={500}
                                style={{ pointerEvents: "none", userSelect: "none" }}
                        >
                                {bar.label}
                        </text>
                </g>
        );
}
