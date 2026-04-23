import { useRef } from "react";
import { useGanttStore } from "../store/useGanttStore";
import { GanttBar as GanttBarType } from "../types/gantt";

interface Props {
        bar: GanttBarType;
        snapPoints: number[];
        rowCount: number;
        rowHeight: number;
        headerHeight: number;
        svgRef: React.RefObject<SVGSVGElement | null>;
}

export function GanttBar({ bar, snapPoints, rowCount, rowHeight, headerHeight, svgRef }: Props) {
        const { updateBar, removeBar } = useGanttStore();
        const height = 20;
        const y = bar.rowIndex * rowHeight + headerHeight * 2 + 8;

        const dragOffset = useRef<{ dx: number; dy: number } | null>(null);

        const snap = (rawX: number) =>
                snapPoints.reduce((best, p) =>
                        Math.abs(p - rawX) < Math.abs(best - rawX) ? p : best
                );

        const onMouseDown = (e: React.MouseEvent) => {
                e.stopPropagation();
                const rect = svgRef.current!.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;
                dragOffset.current = { dx: mouseX - bar.startX, dy: mouseY - y };

                const onMove = (ev: MouseEvent) => {
                        if (!dragOffset.current) return;
                        const rawX = ev.clientX - rect.left - dragOffset.current.dx;
                        const rawY = ev.clientY - rect.top;
                        const snappedX = snap(rawX);
                        const rowIndex = Math.max(0, Math.min(
                                rowCount - 1,
                                Math.floor((rawY - headerHeight * 2) / rowHeight)
                        ));
                        updateBar(bar.id, { startX: snappedX, rowIndex });
                };

                const onUp = () => {
                        dragOffset.current = null;
                        window.removeEventListener("mousemove", onMove);
                        window.removeEventListener("mouseup", onUp);
                };

                window.addEventListener("mousemove", onMove);
                window.addEventListener("mouseup", onUp);
        };

        const handleDelete = (e: React.MouseEvent) => {
                e.stopPropagation();
                removeBar(bar.id);
        };

        return (
                <g onMouseDown={onMouseDown} style={{ cursor: "grab" }}>
                        <rect
                                x={bar.startX} y={y}
                                width={bar.width} height={height}
                                fill={bar.dashed ? "none" : bar.color}
                                stroke={bar.color}
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
                        <text
                                x={bar.startX + bar.width - 4} y={y + 6}
                                textAnchor="end" fontSize={9}
                                fill={bar.dashed ? bar.color : "white"}
                                style={{ cursor: "pointer" }}
                                onClick={handleDelete}
                        >✕</text>
                </g>
        );
}