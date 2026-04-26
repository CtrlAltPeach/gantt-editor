import { useRef, useState, useEffect, useMemo } from "react";
import { useGanttStore } from "../store/useGanttStore";
import { GanttBar } from "./GanttBar";
import { GanttConnection } from "../types/gantt";
import { computeLayout } from "../utils/layout";

/** Палитра цветов для новых полос. */
const COLORS = ["#e05c5c", "#5c8ee0", "#5cc47a", "#e0a85c", "#a05ce0", "#5cc4c4", "#e05ca8", "#8ee05c", "#e08e5c", "#5ce08e", "#8e5ce0", "#e05c8e", "#5c8ee0", "#c45ce0", "#e0c45c", "#5ce0c4"];
/** Радиус захвата края полосы для создания связи (в SVG-пикселях). */
const EDGE_RADIUS = 14;

interface Props {
        svgRef: React.RefObject<SVGSVGElement | null>;
}

/** Временное состояние стрелки связи, которую пользователь рисует в данный момент. */
interface ConnDraft {
        fromBarId: string;
        fromEdge: "start" | "end";
        /** Текущая позиция мыши — конец «резиновой» линии. */
        mouseX: number;
        mouseY: number;
}

/** Состояние контекстного меню (полоса или связь). */
interface ContextMenuState {
        /** Экранные координаты для позиционирования меню. */
        x: number;
        y: number;
        type: "bar" | "connection";
        id: string;
        /** Редактируемая метка (только для полос). */
        editLabel: string;
}

export function GanttGrid({ svgRef }: Props) {
        const config = useGanttStore((s) => s.config);
        const bars = useGanttStore((s) => s.bars);
        const connections = useGanttStore((s) => s.connections);
        const addBar = useGanttStore((s) => s.addBar);
        const updateBar = useGanttStore((s) => s.updateBar);
        const removeBar = useGanttStore((s) => s.removeBar);
        const addConnection = useGanttStore((s) => s.addConnection);
        const removeConnection = useGanttStore((s) => s.removeConnection);
        const { years, rows, cellWidth, rowHeight, headerHeight, labelWidth } = config;

        // Пересчитываем layout при изменении полос или высоты строки.
        const layoutMap = useMemo(() => computeLayout(bars, rowHeight), [bars, rowHeight]);

        const [colorIndex, setColorIndex] = useState(0);
        const [barLabel, setBarLabel] = useState("");
        const [isDashed, setIsDashed] = useState(false);
        const dragging = useRef<{ startX: number; rowIndex: number } | null>(null);
        const [preview, setPreview] = useState<{ x: number; width: number; row: number } | null>(null);
        const [snapHint, setSnapHint] = useState<{ x: number; y: number; label: string } | null>(null);
        const [connDraft, setConnDraft] = useState<ConnDraft | null>(null);
        const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
        const [zoom, setZoom] = useState(1);

        // Суммарная ширина и высота SVG-контента (до применения zoom).
        const totalMonths = years.reduce((s, y) => s + y.months.length, 0);
        const totalWidth = labelWidth + totalMonths * cellWidth;
        const totalHeight = headerHeight * 2 + rows.length * rowHeight;

        // Строим массив колонок (месяцев) с их X-координатами.
        const monthColumns: { x: number; label: string }[] = [];
        let xCur = labelWidth;
        for (const year of years) {
                for (const month of year.months) {
                        monthColumns.push({ x: xCur, label: month });
                        xCur += cellWidth;
                }
        }

        /**
         * Возвращает ближайшую точку примагничивания:
         * начало ячейки, 1/3, 1/2, 2/3 и конец каждой ячейки.
         */
        const snap = (rawX: number): number => {
                const snapPoints = monthColumns.flatMap((col) =>
                        [0, 1 / 3, 1 / 2, 2 / 3, 1].map((f) => col.x + f * cellWidth)
                );
                return snapPoints.reduce((best, p) =>
                        Math.abs(p - rawX) < Math.abs(best - rawX) ? p : best
                );
        };

        /** Переводит экранный X в SVG-координату с учётом масштаба. */
        const getSvgX = (clientX: number) => {
                const rect = svgRef.current!.getBoundingClientRect();
                return (clientX - rect.left) / zoom;
        };

        /** Переводит экранный Y в SVG-координату с учётом масштаба. */
        const getSvgY = (clientY: number) => {
                const rect = svgRef.current!.getBoundingClientRect();
                return (clientY - rect.top) / zoom;
        };

        /** Возвращает индекс строки по экранному Y (0-based, зажат в допустимый диапазон). */
        const getRowIndex = (clientY: number) => {
                const rect = svgRef.current!.getBoundingClientRect();
                const y = (clientY - rect.top) / zoom - headerHeight * 2;
                return Math.max(0, Math.min(rows.length - 1, Math.floor(y / rowHeight)));
        };

        /**
         * Возвращает SVG-точку на краю полосы (по середине высоты).
         * Используется как начало/конец стрелки связи.
         */
        const getBarEdgePoint = (barId: string, edge: "start" | "end") => {
                const bar = bars.find((b) => b.id === barId);
                if (!bar) return null;
                const layout = layoutMap.get(barId);
                const yOff = layout?.yOffset ?? 8;
                const bHeight = layout?.barHeight ?? 20;
                const x = edge === "start" ? bar.startX : bar.startX + bar.width;
                const y = bar.rowIndex * rowHeight + headerHeight * 2 + yOff + bHeight / 2;
                return { x, y };
        };

        /**
         * Ищет край полосы вблизи указанной SVG-точки.
         * Возвращает { barId, edge } или null, если ничего не найдено.
         * @param excludeBarId  Полоса, которую нужно пропустить (исходная при рисовании связи).
         */
        const findBarEdgeAt = (svgX: number, svgY: number, excludeBarId?: string) => {
                for (const bar of bars) {
                        if (bar.id === excludeBarId) continue;
                        const layout = layoutMap.get(bar.id);
                        const barTop = bar.rowIndex * rowHeight + headerHeight * 2 + (layout?.yOffset ?? 2);
                        const barBottom = barTop + (layout?.barHeight ?? 20);
                        if (svgY < barTop - 6 || svgY > barBottom + 6) continue;
                        if (Math.abs(svgX - bar.startX) <= EDGE_RADIUS)
                                return { barId: bar.id, edge: "start" as const };
                        if (Math.abs(svgX - (bar.startX + bar.width)) <= EDGE_RADIUS)
                                return { barId: bar.id, edge: "end" as const };
                }
                return null;
        };

        /** Строит SVG path «прямая линия» из двух точек. */
        const linePath = (x1: number, y1: number, x2: number, y2: number) =>
                `M ${x1} ${y1} L ${x2} ${y2}`;

        /** Возвращает строковую подпись snap-точки (0, 1/3, 1/2, 2/3, 1) для подсказки. */
        const getSnapLabel = (snappedX: number): string => {
                for (const col of monthColumns) {
                        const fractions = [
                                { f: 0, label: "0" }, { f: 1 / 3, label: "1/3" },
                                { f: 1 / 2, label: "1/2" }, { f: 2 / 3, label: "2/3" }, { f: 1, label: "1" },
                        ];
                        for (const { f, label } of fractions) {
                                if (Math.abs(col.x + f * cellWidth - snappedX) < 0.5) return label;
                        }
                }
                return "";
        };

        // — Обработчики событий мыши —

        /** Начало рисования новой полосы (левая кнопка мыши на свободном месте). */
        const onMouseDown = (e: React.MouseEvent) => {
                if (e.shiftKey) return; // Shift зарезервирован для создания связей
                const rawX = getSvgX(e.clientX);
                if (rawX < labelWidth) return; // клик в колонке подписей — игнорируем
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
                        // Обновляем конец «резиновой» стрелки связи.
                        setConnDraft((d) => d ? { ...d, mouseX: rawX, mouseY: rawY } : null);
                        return;
                }

                if (rawX >= labelWidth) {
                        const snappedX = snap(rawX);
                        setSnapHint({ x: snappedX, y: rawY - 16, label: getSnapLabel(snappedX) });
                } else {
                        setSnapHint(null);
                }

                if (!dragging.current) return;
                // Пересчитываем превью: x берём от меньшего, ширина — модуль разности.
                const snappedX = snap(rawX);
                const start = dragging.current.startX;
                const x = Math.min(start, snappedX);
                const width = Math.abs(snappedX - start);
                setPreview({ x, width, row: dragging.current.rowIndex });
        };

        const onMouseUp = (e: React.MouseEvent) => {
                if (connDraft) {
                        // Завершаем рисование связи: ищем край полосы под курсором.
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

                // Игнорируем слишком короткие полосы (менее 1/3 ячейки).
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
                if (connDraft) return; // не прерываем рисование связи — пользователь может вернуться
                dragging.current = null;
                setPreview(null);
        };

        /** Инициирует рисование связи от указанного края полосы. */
        const handleStartConnection = (barId: string, edge: "start" | "end") => {
                const pt = getBarEdgePoint(barId, edge);
                if (!pt) return;
                setConnDraft({ fromBarId: barId, fromEdge: edge, mouseX: pt.x, mouseY: pt.y });
        };

        /** Открывает контекстное меню для полосы или связи. */
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

        // Escape — закрыть контекстное меню и отменить рисование связи.
        useEffect(() => {
                const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { closeContextMenu(); setConnDraft(null); } };
                window.addEventListener("keydown", onKey);
                return () => window.removeEventListener("keydown", onKey);
        }, []);

        // Ctrl + колесо мыши — масштабирование (зажат в диапазон 0.3–3×).
        useEffect(() => {
                const el = svgRef.current;
                if (!el) return;
                const onWheel = (e: WheelEvent) => {
                        if (!e.ctrlKey) return;
                        e.preventDefault();
                        setZoom((z) => Math.min(3, Math.max(0.3, z * (1 - e.deltaY * 0.001))));
                };
                // passive: false — нужен, чтобы preventDefault() сработал.
                el.addEventListener("wheel", onWheel, { passive: false });
                return () => el.removeEventListener("wheel", onWheel);
        }, []);

        // Список snap-точек передаётся в каждую GanttBar для drag-примагничивания.
        const snapPoints = monthColumns.flatMap((col) =>
                [0, 1 / 3, 1 / 2, 2 / 3, 1].map((f) => col.x + f * cellWidth)
        );

        return (
                <div>
                        {/* Панель инструментов над сеткой */}
                        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
                                <label style={{ fontSize: 12 }}>Метка:
                                        <input value={barLabel} onChange={(e) => setBarLabel(e.target.value)}
                                                style={{ width: 40, marginLeft: 6, fontSize: 12 }} />
                                </label>
                                <label style={{ fontSize: 12 }}>Цвет:</label>
                                {COLORS.map((c, i) => (
                                        <div key={i} onClick={() => setColorIndex(i)}
                                                style={{
                                                        width: 20, height: 20, background: c, borderRadius: 4, cursor: "pointer",
                                                        border: i === colorIndex ? "2px solid #333" : "2px solid transparent"
                                                }} />
                                ))}
                                <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                                        <input type="checkbox" checked={isDashed} onChange={(e) => setIsDashed(e.target.checked)} />
                                        Пунктир
                                </label>
                                <span style={{ fontSize: 14, color: "#999", marginLeft: 8 }}>
                                        Shift + перетаскивание с края полосы — создать пунктирную стрелку. Ctrl + колесо мыши — масштабирование. Клик по полосе — перетаскивание. Клик по краю полосы — создание связи.
                                </span>
                        </div>

                        {/* SVG-холст. Размер атрибутов = логический размер × zoom (масштаб через transform внутри). */}
                        <svg ref={svgRef} width={totalWidth * zoom} height={totalHeight * zoom}
                                style={{ cursor: "crosshair", display: "block" }}
                                onMouseDown={onMouseDown} onMouseMove={onMouseMove}
                                onMouseUp={onMouseUp} onMouseLeave={onMouseLeave}>

                                <defs>
                                        {/* Наконечник стрелки для реальных связей */}
                                        <marker id="arrowhead" markerWidth="8" markerHeight="6"
                                                refX="7" refY="3" orient="auto">
                                                <polygon points="0 0, 8 3, 0 6" fill="#555" />
                                        </marker>
                                        {/* Наконечник стрелки для превью (серый) */}
                                        <marker id="arrowhead-preview" markerWidth="8" markerHeight="6"
                                                refX="7" refY="3" orient="auto">
                                                <polygon points="0 0, 8 3, 0 6" fill="#888" />
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
                                                                                fill="#f0f0f0" stroke="#ccc" strokeWidth={0.5} />
                                                                        <text x={gx + yearWidth / 2} y={headerHeight / 2}
                                                                                textAnchor="middle" fontSize={11} dominantBaseline="middle">{year.label}</text>
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
                                                                fill="#f8f8f8" stroke="#ccc" strokeWidth={0.5} />
                                                        <text x={col.x + cellWidth / 2} y={headerHeight * 1.5}
                                                                textAnchor="middle" fontSize={10} dominantBaseline="middle">{col.label}</text>
                                                </g>
                                        ))}

                                        {/* Строки с подписями и ячейками */}
                                        {rows.map((rowLabel, ri) => (
                                                <g key={ri}>
                                                        <rect x={0} y={headerHeight * 2 + ri * rowHeight}
                                                                width={labelWidth} height={rowHeight}
                                                                fill="#fafafa" stroke="#ccc" strokeWidth={0.5} />
                                                        <text x={labelWidth / 2} y={headerHeight * 2 + ri * rowHeight + rowHeight / 2}
                                                                textAnchor="middle" fontSize={11} dominantBaseline="middle">{rowLabel}</text>
                                                        {monthColumns.map((col, ci) => (
                                                                <rect key={ci} x={col.x} y={headerHeight * 2 + ri * rowHeight}
                                                                        width={cellWidth} height={rowHeight}
                                                                        fill="white" stroke="#e0e0e0" strokeWidth={0.5} />
                                                        ))}
                                                </g>
                                        ))}

                                        {/* Полосы (высота и смещение берутся из computeLayout) */}
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
                                                                barHeight={layout?.barHeight ?? 20}
                                                                yOffset={layout?.yOffset ?? 8}
                                                                zoom={zoom}
                                                                svgRef={svgRef}
                                                                onStartConnection={handleStartConnection}
                                                                onContextMenu={(barId, x, y) => openContextMenu("bar", barId, x, y)}
                                                        />
                                                );
                                        })}

                                        {/* Связи между полосами.
                                            Невидимый широкий path нужен для захвата правого клика. */}
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
                                                                {/* Прозрачная «зона клика» шире видимой линии */}
                                                                <path d={d} stroke="transparent" strokeWidth={8} fill="none" style={{ cursor: "context-menu" }} />
                                                                <path d={d} stroke="#555" strokeWidth={1.5} fill="none"
                                                                        strokeDasharray="4 3" markerEnd="url(#arrowhead)"
                                                                        style={{ pointerEvents: "none" }} />
                                                        </g>
                                                );
                                        })}

                                        {/* Превью новой полосы при рисовании */}
                                        {preview && preview.width > 0 && (
                                                <rect x={preview.x} y={preview.row * rowHeight + headerHeight * 2 + 8}
                                                        width={preview.width} height={20}
                                                        fill={COLORS[colorIndex]} fillOpacity={0.4} rx={3}
                                                        style={{ pointerEvents: "none" }} />
                                        )}

                                        {/* «Резиновая» стрелка при рисовании связи */}
                                        {connDraft && (() => {
                                                const from = getBarEdgePoint(connDraft.fromBarId, connDraft.fromEdge);
                                                if (!from) return null;
                                                const d = linePath(from.x, from.y, connDraft.mouseX, connDraft.mouseY);
                                                return (
                                                        <path d={d} stroke="#888" strokeWidth={1.5} fill="none"
                                                                strokeDasharray="4 3" markerEnd="url(#arrowhead-preview)"
                                                                style={{ pointerEvents: "none" }} />
                                                );
                                        })()}

                                        {/* Подсказка с долей ячейки рядом с курсором */}
                                        {!connDraft && snapHint && snapHint.label && (
                                                <g style={{ pointerEvents: "none" }}>
                                                        <rect x={snapHint.x - 14} y={snapHint.y - 12} width={28} height={16} rx={3}
                                                                fill="#333" fillOpacity={0.75} />
                                                        <text x={snapHint.x} y={snapHint.y - 4}
                                                                textAnchor="middle" fontSize={10} fill="white">
                                                                {snapHint.label}
                                                        </text>
                                                </g>
                                        )}

                                </g>
                        </svg>

                        {/* Контекстное меню (полоса или связь) */}
                        {contextMenu && (() => {
                                const mi: React.CSSProperties = {
                                        display: "block", width: "100%", textAlign: "left",
                                        padding: "6px 14px", fontSize: 12, background: "none",
                                        border: "none", cursor: "pointer", whiteSpace: "nowrap",
                                };
                                const bar = contextMenu.type === "bar" ? bars.find((b) => b.id === contextMenu.id) : null;
                                return (
                                        <>
                                                {/* Прозрачный оверлей на весь экран — клик закрывает меню */}
                                                <div style={{ position: "fixed", inset: 0 }} onClick={closeContextMenu} />
                                                <div style={{
                                                        position: "fixed", left: contextMenu.x, top: contextMenu.y,
                                                        background: "white", border: "1px solid #ddd", borderRadius: 4,
                                                        padding: "4px 0", boxShadow: "0 2px 8px rgba(0,0,0,0.18)", zIndex: 1000,
                                                        minWidth: 180,
                                                }}>
                                                        {bar ? (
                                                                <>
                                                                        <div style={{ padding: "5px 12px 7px", borderBottom: "1px solid #eee" }}>
                                                                                <div style={{ fontSize: 10, color: "#aaa", marginBottom: 3 }}>Метка</div>
                                                                                <input
                                                                                        autoFocus
                                                                                        value={contextMenu.editLabel}
                                                                                        onChange={(e) => setContextMenu((c) => c ? { ...c, editLabel: e.target.value } : null)}
                                                                                        onBlur={() => updateBar(contextMenu.id, { label: contextMenu.editLabel })}
                                                                                        onKeyDown={(e) => { if (e.key === "Enter") updateBar(contextMenu.id, { label: contextMenu.editLabel }); }}
                                                                                        style={{ width: "100%", fontSize: 12, padding: "2px 4px", boxSizing: "border-box" }}
                                                                                />
                                                                        </div>
                                                                        <div style={{ padding: "6px 12px 7px", borderBottom: "1px solid #eee" }}>
                                                                                <div style={{ fontSize: 10, color: "#aaa", marginBottom: 4 }}>Цвет</div>
                                                                                <div style={{ display: "flex", gap: 4 }}>
                                                                                        {COLORS.map((c) => (
                                                                                                <div key={c} onClick={() => updateBar(contextMenu.id, { color: c })}
                                                                                                        style={{
                                                                                                                width: 18, height: 18, background: c, borderRadius: 3, cursor: "pointer",
                                                                                                                border: bar.color === c ? "2px solid #222" : "2px solid transparent",
                                                                                                                boxSizing: "border-box",
                                                                                                        }} />
                                                                                        ))}
                                                                                </div>
                                                                        </div>
                                                                        <button style={mi}
                                                                                onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f5f5")}
                                                                                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                                                                                onClick={() => { addBar({ ...bar, id: crypto.randomUUID() }); closeContextMenu(); }}>
                                                                                Дублировать
                                                                        </button>
                                                                        <button style={mi}
                                                                                onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f5f5")}
                                                                                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                                                                                onClick={() => { updateBar(contextMenu.id, { dashed: !bar.dashed }); closeContextMenu(); }}>
                                                                                {bar.dashed ? "Сделать сплошной" : "Сделать пунктирной"}
                                                                        </button>
                                                                        <div style={{ borderTop: "1px solid #eee", margin: "3px 0" }} />
                                                                        <button style={{ ...mi, color: "#c33" }}
                                                                                onMouseEnter={(e) => (e.currentTarget.style.background = "#fff0f0")}
                                                                                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                                                                                onClick={handleContextMenuDelete}>
                                                                                Удалить полосу
                                                                        </button>
                                                                </>
                                                        ) : (
                                                                <button style={mi}
                                                                        onMouseEnter={(e) => (e.currentTarget.style.background = "#fff0f0")}
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
