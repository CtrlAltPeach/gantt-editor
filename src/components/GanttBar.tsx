import { useDrag } from "../hooks/useDrag";
import { GanttBar as GanttBarType } from "../types/gantt";
import { tokens } from "../styles/tokens";

interface Props {
        bar: GanttBarType;
        snapPoints: number[];
        rowCount: number;
        rowHeight: number;
        headerHeight: number;
        barHeight: number;
        yOffset: number;
        zoom: number;
        svgRef: React.RefObject<SVGSVGElement | null>;
        onStartConnection: (barId: string, edge: "start" | "end") => void;
        onContextMenu: (barId: string, x: number, y: number) => void;
}

export function GanttBar({ bar, snapPoints, rowCount, rowHeight, headerHeight, barHeight, yOffset, zoom, svgRef, onStartConnection, onContextMenu }: Props) {
        const y = bar.rowIndex * rowHeight + headerHeight * 2 + yOffset;

        const { onMouseDown, onContextMenu: handleContextMenu } = useDrag({
                bar, snapPoints, rowCount, rowHeight, headerHeight, yOffset, zoom, svgRef, onStartConnection, onContextMenu,
        });

        return (
                <g onMouseDown={onMouseDown} onContextMenu={handleContextMenu} style={{ cursor: "grab" }}>
                        <rect
                                x={bar.startX} y={y}
                                width={bar.width} height={barHeight}
                                fill={bar.dashed ? "none" : bar.color}
                                stroke={bar.dashed ? bar.color : tokens.bar.strokeColor}
                                strokeWidth={tokens.bar.strokeWidth}
                                strokeDasharray={bar.dashed ? tokens.bar.dashedPattern : undefined}
                                rx={tokens.bar.borderRadius}
                        />
                        <text
                                x={bar.startX + bar.width / 2} y={y + barHeight / 2}
                                textAnchor="middle" dominantBaseline="middle"
                                fontSize={tokens.bar.fontSize} fill={bar.dashed ? bar.color : "white"} fontWeight={tokens.bar.fontWeight}
                                style={{ pointerEvents: "none", userSelect: "none" }}
                        >
                                {bar.label}
                        </text>
                </g>
        );
}
