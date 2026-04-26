import { useState, useEffect, useMemo } from "react";
import { useGanttStore } from "../store/useGanttStore";
import { GanttBar } from "./GanttBar";
import { computeLayout } from "../utils/layout";
import { tokens } from "../styles/tokens";
import { useSnap } from "../hooks/useSnap";
import { useBarCreation } from "../hooks/useBarCreation";

const COLORS = tokens.bar.colors;

interface Props {
        svgRef: React.RefObject<SVGSVGElement | null>;
}

/** Состояние контекстного меню (полоса или связь). */
interface ContextMenuState {
        x: number;
        y: number;
        type: "bar" | "connection";
        id: string;
        editLabel: string;
}

export function GanttGrid({ svgRef }: Props) {
        const config = useGanttStore((s) => s.config);
        const bars = useGanttStore((s) => s.bars);
        const connections = useGanttStore((s) => s.connections);
        const addBar = useGanttStore((s) => s.addBar);
        const updateBar = useGanttStore((s) => s.updateBar);
        const removeBar = useGanttStore((s) => s.removeBar);
        const removeConnection = useGanttStore((s) => s.removeConnection);
        const { years, rows, cellWidth, rowHeight, headerHeight, labelWidth } = config;

        const layoutMap = useMemo(() => computeLayout(bars, rowHeight), [bars, rowHeight]);

        const [colorIndex, setColorIndex] = useState(0);
        const [barLabel, setBarLabel] = useState("");
        const [isDashed, setIsDashed] = useState(false);
        const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
        const [zoom, setZoom] = useState(1);

        const totalMonths = years.reduce((s, y) => s + y.months.length, 0);
        const totalWidth = labelWidth + totalMonths * cellWidth;
        const totalHeight = headerHeight * 2 + rows.length * rowHeight;

        const monthColumns: { x: number; label: string }[] = [];
        let xCur = labelWidth;
        for (const year of years) {
                for (const month of year.months) {
                        monthColumns.push({ x: xCur, label: month });
                        xCur += cellWidth;
                }
        }

        const { snapPoints, snap, getSnapLabel } = useSnap(monthColumns, cellWidth);

        const {
                preview, snapHint, connDraft, setConnDraft,
                getBarEdgePoint,
                onMouseDown, onMouseMove, onMouseUp, onMouseLeave,
        } = useBarCreation({
                svgRef, zoom, labelWidth, cellWidth, rowHeight, headerHeight,
                rowCount: rows.length, bars, layoutMap, colorIndex, barLabel, isDashed, snap, getSnapLabel,
        });

        const handleStartConnection = (barId: string, edge: "start" | "end") => {
                const pt = getBarEdgePoint(barId, edge);
                if (!pt) return;
                setConnDraft({ fromBarId: barId, fromEdge: edge, mouseX: pt.x, mouseY: pt.y });
        };

        const openContextMenu = (type: "bar" | "connection", id: string, clientX: number, clientY: number) => {
                const editLabel = type === "bar" ? (bars.find((b) => b.id === id)?.label ?? "") : "";
                setContextMenu({ x: clientX, y: clientY, type, id, editLabel });
        };

        const closeContextMenu = () => setContextMenu(null);

        const handleContextMenuDelete = () => {
                if (!contextMenu) return;
                if (contextMenu.type === "bar") removeBar(contextMenu.id);
                else removeConnection(contextMenu.id);
                closeContextMenu();
        };

        const linePath = (x1: number, y1: number, x2: number, y2: number) =>
                `M ${x1} ${y1} L ${x2} ${y2}`;

        useEffect(() => {
                const onKey = (e: KeyboardEvent) => {
                        if (e.key === "Escape") { closeContextMenu(); setConnDraft(null); }
                };
                window.addEventListener("keydown", onKey);
                return () => window.removeEventListener("keydown", onKey);
        }, []);

        useEffect(() => {
                const el = svgRef.current;
                if (!el) return;
                const onWheel = (e: WheelEvent) => {
                        if (!e.ctrlKey) return;
                        e.preventDefault();
                        setZoom((z) => Math.min(3, Math.max(0.3, z * (1 - e.deltaY * 0.001))));
                };
                el.addEventListener("wheel", onWheel, { passive: false });
                return () => el.removeEventListener("wheel", onWheel);
        }, []);

        return (
                <div>
                        {/* Панель инструментов над сеткой */}
                        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
                                <label style={{ fontSize: tokens.font.label }}>Метка:
                                        <input value={barLabel} onChange={(e) => setBarLabel(e.target.value)}
                                                style={{ width: 40, marginLeft: 6, fontSize: tokens.font.label }} />
                                </label>
                                <label style={{ fontSize: tokens.font.label }}>Цвет:</label>
                                {COLORS.map((c, i) => (
                                        <div key={i} onClick={() => setColorIndex(i)}
                                                style={{
                                                        width: tokens.toolbar.swatchSize,
                                                        height: tokens.toolbar.swatchSize,
                                                        background: c,
                                                        borderRadius: tokens.toolbar.swatchRadius,
                                                        cursor: "pointer",
                                                        border: i === colorIndex ? "2px solid #333" : "2px solid transparent",
                                                }} />
                                ))}
                                <label style={{ fontSize: tokens.font.label, display: "flex", alignItems: "center", gap: 6 }}>
                                        <input type="checkbox" checked={isDashed} onChange={(e) => setIsDashed(e.target.checked)} />
                                        Пунктир
                                </label>
                                <span style={{ fontSize: tokens.font.hint, color: tokens.panel.hintColor, marginLeft: 8 }}>
                                        Shift + перетаскивание с края полосы — создать пунктирную стрелку. Ctrl + колесо мыши — масштабирование. Клик по полосе — перетаскивание. Клик по краю полосы — создание связи.
                                </span>
                        </div>

                        <svg ref={svgRef} width={totalWidth * zoom} height={totalHeight * zoom}
                                style={{ cursor: "crosshair", display: "block" }}
                                onMouseDown={onMouseDown} onMouseMove={onMouseMove}
                                onMouseUp={onMouseUp} onMouseLeave={onMouseLeave}>

                                <defs>
                                        <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                                                <polygon points="0 0, 8 3, 0 6" fill={tokens.connection.stroke} />
                                        </marker>
                                        <marker id="arrowhead-preview" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                                                <polygon points="0 0, 8 3, 0 6" fill={tokens.connection.previewStroke} />
                                        </marker>
                                </defs>

                                <g transform={`scale(${zoom})`}>

                                        {/* Заголовок: строка годов */}
                                        {(() => {
                                                let gx = labelWidth;
                                                return years.map((year) => {
                                                        const yearWidth = year.months.length * cellWidth;
                                                        const el = (
                                                                <g key={year.label}>
                                                                        <rect x={gx} y={0} width={yearWidth} height={headerHeight}
                                                                                fill={tokens.grid.headerFill} stroke={tokens.grid.headerBorder} strokeWidth={tokens.grid.borderWidth} />
                                                                        <text x={gx + yearWidth / 2} y={headerHeight / 2}
                                                                                textAnchor="middle" fontSize={tokens.font.medium} dominantBaseline="middle">{year.label}</text>
                                                                </g>
                                                        );
                                                        gx += yearWidth;
                                                        return el;
                                                });
                                        })()}

                                        {/* Заголовок: строка месяцев */}
                                        {monthColumns.map((col, i) => (
                                                <g key={i}>
                                                        <rect x={col.x} y={headerHeight} width={cellWidth} height={headerHeight}
                                                                fill={tokens.grid.subHeaderFill} stroke={tokens.grid.headerBorder} strokeWidth={tokens.grid.borderWidth} />
                                                        <text x={col.x + cellWidth / 2} y={headerHeight * 1.5}
                                                                textAnchor="middle" fontSize={tokens.font.small} dominantBaseline="middle">{col.label}</text>
                                                </g>
                                        ))}

                                        {/* Строки с подписями и ячейками */}
                                        {rows.map((rowLabel, ri) => (
                                                <g key={ri}>
                                                        <rect x={0} y={headerHeight * 2 + ri * rowHeight}
                                                                width={labelWidth} height={rowHeight}
                                                                fill={tokens.grid.labelFill} stroke={tokens.grid.headerBorder} strokeWidth={tokens.grid.borderWidth} />
                                                        <text x={labelWidth / 2} y={headerHeight * 2 + ri * rowHeight + rowHeight / 2}
                                                                textAnchor="middle" fontSize={tokens.font.medium} dominantBaseline="middle">{rowLabel}</text>
                                                        {monthColumns.map((col, ci) => (
                                                                <rect key={ci} x={col.x} y={headerHeight * 2 + ri * rowHeight}
                                                                        width={cellWidth} height={rowHeight}
                                                                        fill={tokens.grid.cellFill} stroke={tokens.grid.cellBorder} strokeWidth={tokens.grid.borderWidth} />
                                                        ))}
                                                </g>
                                        ))}

                                        {/* Полосы */}
                                        {bars.map((bar) => {
                                                const layout = layoutMap.get(bar.id);
                                                return (
                                                        <GanttBar
                                                                key={bar.id}
                                                                bar={bar}
                                                                snapPoints={snapPoints}
                                                                rowCount={rows.length}
                                                                rowHeight={rowHeight}
                                                                headerHeight={headerHeight}
                                                                barHeight={layout?.barHeight ?? tokens.bar.height}
                                                                yOffset={layout?.yOffset ?? tokens.bar.paddingTop}
                                                                zoom={zoom}
                                                                svgRef={svgRef}
                                                                onStartConnection={handleStartConnection}
                                                                onContextMenu={(barId, x, y) => openContextMenu("bar", barId, x, y)}
                                                        />
                                                );
                                        })}

                                        {/* Связи между полосами */}
                                        {connections.map((conn) => {
                                                const from = getBarEdgePoint(conn.fromBarId, conn.fromEdge);
                                                const to = getBarEdgePoint(conn.toBarId, conn.toEdge);
                                                if (!from || !to) return null;
                                                const d = linePath(from.x, from.y, to.x, to.y);
                                                return (
                                                        <g key={conn.id} onContextMenu={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                openContextMenu("connection", conn.id, e.clientX, e.clientY);
                                                        }}>
                                                                <path d={d} stroke="transparent" strokeWidth={8} fill="none" style={{ cursor: "context-menu" }} />
                                                                <path d={d}
                                                                        stroke={tokens.connection.stroke}
                                                                        strokeWidth={tokens.connection.strokeWidth}
                                                                        fill="none"
                                                                        strokeDasharray={tokens.connection.dashPattern}
                                                                        markerEnd="url(#arrowhead)"
                                                                        style={{ pointerEvents: "none" }} />
                                                        </g>
                                                );
                                        })}

                                        {/* Превью новой полосы */}
                                        {preview && preview.width > 0 && (
                                                <rect x={preview.x}
                                                        y={preview.row * rowHeight + headerHeight * 2 + tokens.bar.paddingTop}
                                                        width={preview.width} height={tokens.bar.height}
                                                        fill={COLORS[colorIndex]}
                                                        fillOpacity={tokens.preview.fillOpacity}
                                                        rx={tokens.bar.borderRadius}
                                                        style={{ pointerEvents: "none" }} />
                                        )}

                                        {/* «Резиновая» стрелка при рисовании связи */}
                                        {connDraft && (() => {
                                                const from = getBarEdgePoint(connDraft.fromBarId, connDraft.fromEdge);
                                                if (!from) return null;
                                                const d = linePath(from.x, from.y, connDraft.mouseX, connDraft.mouseY);
                                                return (
                                                        <path d={d}
                                                                stroke={tokens.connection.previewStroke}
                                                                strokeWidth={tokens.connection.strokeWidth}
                                                                fill="none"
                                                                strokeDasharray={tokens.connection.dashPattern}
                                                                markerEnd="url(#arrowhead-preview)"
                                                                style={{ pointerEvents: "none" }} />
                                                );
                                        })()}

                                        {/* Snap-подсказка рядом с курсором */}
                                        {!connDraft && snapHint && snapHint.label && (
                                                <g style={{ pointerEvents: "none" }}>
                                                        <rect x={snapHint.x - 14} y={snapHint.y - 12} width={28} height={16} rx={3}
                                                                fill={tokens.snapHint.fill} fillOpacity={tokens.snapHint.fillOpacity} />
                                                        <text x={snapHint.x} y={snapHint.y - 4}
                                                                textAnchor="middle" fontSize={tokens.font.small} fill={tokens.snapHint.textFill}>
                                                                {snapHint.label}
                                                        </text>
                                                </g>
                                        )}

                                </g>
                        </svg>

                        {/* Контекстное меню */}
                        {contextMenu && (() => {
                                const mi: React.CSSProperties = {
                                        display: "block", width: "100%", textAlign: "left",
                                        padding: "6px 14px", fontSize: tokens.font.label, background: "none",
                                        border: "none", cursor: "pointer", whiteSpace: "nowrap",
                                };
                                const bar = contextMenu.type === "bar" ? bars.find((b) => b.id === contextMenu.id) : null;
                                return (
                                        <>
                                                <div style={{ position: "fixed", inset: 0 }} onClick={closeContextMenu} />
                                                <div style={{
                                                        position: "fixed", left: contextMenu.x, top: contextMenu.y,
                                                        background: tokens.contextMenu.background,
                                                        border: `1px solid ${tokens.contextMenu.borderColor}`,
                                                        borderRadius: tokens.contextMenu.borderRadius,
                                                        padding: "4px 0",
                                                        boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
                                                        zIndex: tokens.contextMenu.zIndex,
                                                        minWidth: tokens.contextMenu.minWidth,
                                                }}>
                                                        {bar ? (
                                                                <>
                                                                        <div style={{ padding: "5px 12px 7px", borderBottom: `1px solid ${tokens.contextMenu.borderColor}` }}>
                                                                                <div style={{ fontSize: tokens.contextMenu.metaFontSize, color: tokens.contextMenu.metaColor, marginBottom: 3 }}>Метка</div>
                                                                                <input
                                                                                        autoFocus
                                                                                        value={contextMenu.editLabel}
                                                                                        onChange={(e) => setContextMenu((c) => c ? { ...c, editLabel: e.target.value } : null)}
                                                                                        onBlur={() => updateBar(contextMenu.id, { label: contextMenu.editLabel })}
                                                                                        onKeyDown={(e) => { if (e.key === "Enter") updateBar(contextMenu.id, { label: contextMenu.editLabel }); }}
                                                                                        style={{ width: "100%", fontSize: tokens.font.label, padding: "2px 4px", boxSizing: "border-box" }}
                                                                                />
                                                                        </div>
                                                                        <div style={{ padding: "6px 12px 7px", borderBottom: `1px solid ${tokens.contextMenu.borderColor}` }}>
                                                                                <div style={{ fontSize: tokens.contextMenu.metaFontSize, color: tokens.contextMenu.metaColor, marginBottom: 4 }}>Цвет</div>
                                                                                <div style={{ display: "flex", gap: 4 }}>
                                                                                        {COLORS.map((c) => (
                                                                                                <div key={c} onClick={() => updateBar(contextMenu.id, { color: c })}
                                                                                                        style={{
                                                                                                                width: tokens.contextMenu.swatchSize,
                                                                                                                height: tokens.contextMenu.swatchSize,
                                                                                                                background: c,
                                                                                                                borderRadius: tokens.contextMenu.swatchRadius,
                                                                                                                cursor: "pointer",
                                                                                                                border: bar.color === c ? "2px solid #222" : "2px solid transparent",
                                                                                                                boxSizing: "border-box",
                                                                                                        }} />
                                                                                        ))}
                                                                                </div>
                                                                        </div>
                                                                        <button style={mi}
                                                                                onMouseEnter={(e) => (e.currentTarget.style.background = tokens.contextMenu.itemHoverBg)}
                                                                                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                                                                                onClick={() => { addBar({ ...bar, id: crypto.randomUUID() }); closeContextMenu(); }}>
                                                                                Дублировать
                                                                        </button>
                                                                        <button style={mi}
                                                                                onMouseEnter={(e) => (e.currentTarget.style.background = tokens.contextMenu.itemHoverBg)}
                                                                                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                                                                                onClick={() => { updateBar(contextMenu.id, { dashed: !bar.dashed }); closeContextMenu(); }}>
                                                                                {bar.dashed ? "Сделать сплошной" : "Сделать пунктирной"}
                                                                        </button>
                                                                        <div style={{ borderTop: `1px solid ${tokens.contextMenu.borderColor}`, margin: "3px 0" }} />
                                                                        <button style={{ ...mi, color: tokens.contextMenu.deleteColor }}
                                                                                onMouseEnter={(e) => (e.currentTarget.style.background = tokens.contextMenu.deleteHoverBg)}
                                                                                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                                                                                onClick={handleContextMenuDelete}>
                                                                                Удалить полосу
                                                                        </button>
                                                                </>
                                                        ) : (
                                                                <button style={mi}
                                                                        onMouseEnter={(e) => (e.currentTarget.style.background = tokens.contextMenu.deleteHoverBg)}
                                                                        onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                                                                        onClick={handleContextMenuDelete}>
                                                                        Удалить связь
                                                                </button>
                                                        )}
                                                </div>
                                        </>
                                );
                        })()}
                </div>
        );
}
