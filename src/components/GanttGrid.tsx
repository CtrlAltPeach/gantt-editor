import { useRef, useState, useEffect, useMemo } from "react";
import { useGanttStore } from "../store/useGanttStore";
import { useThemeStore } from "../store/useThemeStore";
import { GanttBar } from "./GanttBar";
import { GanttConnection } from "../types/gantt";
import { computeLayout } from "../utils/layout";

/** Палитра цветов для новых полос — Tailwind CSS оттенки. */
const COLORS = [
  "#3B82F6", // blue-500
  "#10B981", // emerald-500
  "#F59E0B", // amber-500
  "#EF4444", // red-500
  "#8B5CF6", // violet-500
  "#EC4899", // pink-500
  "#14B8A6", // teal-500
  "#F97316", // orange-500
  "#6366F1", // indigo-500
  "#A855F7", // purple-500
];
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
  const { years, rows, cellWidth, rowHeight, headerHeight, labelWidth } =
    config;
  const theme = useThemeStore((s) => s.theme);

  // Пересчитываем layout при изменении полос или высоты строки.
  const layoutMap = useMemo(
    () => computeLayout(bars, rowHeight),
    [bars, rowHeight],
  );

  const [colorIndex, setColorIndex] = useState(0);
  const [barLabel, setBarLabel] = useState("");
  const [isDashed, setIsDashed] = useState(false);
  const dragging = useRef<{ startX: number; rowIndex: number } | null>(null);
  const [preview, setPreview] = useState<{
    x: number;
    width: number;
    row: number;
  } | null>(null);
  const [snapHint, setSnapHint] = useState<{
    x: number;
    y: number;
    label: string;
  } | null>(null);
  const [hoverCell, setHoverCell] = useState<{
    row: number;
    month: number;
  } | null>(null);
  const [connDraft, setConnDraft] = useState<ConnDraft | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [zoom, setZoom] = useState(1);

  const scaledCellWidth = cellWidth * zoom;
  const toRenderX = (modelX: number) =>
    labelWidth + (modelX - labelWidth) * zoom;
  const toModelX = (renderX: number) =>
    labelWidth + (renderX - labelWidth) / zoom;

  // Вычисляем высоту каждой строки (может увеличиваться при пересечениях).
  const rowHeights = useMemo(() => {
    const heights = new Array(rows.length).fill(rowHeight);
    for (const [barId, layout] of layoutMap) {
      const bar = bars.find((b) => b.id === barId);
      if (bar) {
        heights[bar.rowIndex] = Math.max(
          heights[bar.rowIndex],
          layout.actualRowHeight,
        );
      }
    }
    return heights;
  }, [layoutMap, bars, rows.length, rowHeight]);

  // Y-координаты для каждой строки (накопленная сумма высот).
  const rowYPositions = useMemo(() => {
    const positions = [headerHeight * 2];
    for (let i = 1; i < rows.length; i++) {
      positions.push(positions[i - 1] + rowHeights[i - 1]);
    }
    return positions;
  }, [rowHeights, rows.length, headerHeight]);

  // Суммарная ширина и высота SVG-контента. Zoom меняет только ширину таймлайна.
  const totalMonths = years.reduce((s, y) => s + y.months.length, 0);
  const totalWidth = labelWidth + totalMonths * scaledCellWidth;
  const totalHeight =
    headerHeight * 2 + rowHeights.reduce((sum, h) => sum + h, 0);

  // Строим массив колонок (месяцев) с экранными и модельными X-координатами.
  const monthColumns: {
    x: number;
    modelX: number;
    label: string;
    index: number;
  }[] = [];
  let xCur = labelWidth;
  let modelXCur = labelWidth;
  let monthIndex = 0;
  for (const year of years) {
    for (const month of year.months) {
      monthColumns.push({
        x: xCur,
        modelX: modelXCur,
        label: month,
        index: monthIndex,
      });
      xCur += scaledCellWidth;
      modelXCur += cellWidth;
      monthIndex += 1;
    }
  }

  /**
   * Возвращает ближайшую точку примагничивания:
   * начало ячейки, 1/3, 1/2, 2/3 и конец каждой ячейки.
   */
  const snap = (rawX: number): number => {
    const snapPoints = monthColumns.flatMap((col) =>
      [0, 1 / 3, 1 / 2, 2 / 3, 1].map((f) => col.modelX + f * cellWidth),
    );
    return snapPoints.reduce((best, p) =>
      Math.abs(p - rawX) < Math.abs(best - rawX) ? p : best,
    );
  };

  /** Переводит экранный X в SVG-координату. */
  const getSvgX = (clientX: number) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return clientX - rect.left;
  };

  /** Переводит экранный X в модельную координату таймлайна. */
  const getModelX = (clientX: number) => toModelX(getSvgX(clientX));

  /** Переводит экранный Y в SVG-координату. */
  const getSvgY = (clientY: number) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return clientY - rect.top;
  };

  /** Возвращает индекс строки по экранному Y (0-based, зажат в допустимый диапазон). */
  const getRowIndex = (clientY: number) => {
    const y = getSvgY(clientY) - headerHeight * 2;
    // Ищем строку по накопленной высоте
    for (let i = 0; i < rows.length; i++) {
      if (y < rowYPositions[i] - rowYPositions[0] + rowHeights[i]) {
        return i;
      }
    }
    return rows.length - 1;
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
    const modelX = edge === "start" ? bar.startX : bar.startX + bar.width;
    const x = toRenderX(modelX);
    const y = rowYPositions[bar.rowIndex] + yOff + bHeight / 2;
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
      const barTop = rowYPositions[bar.rowIndex] + (layout?.yOffset ?? 2);
      const barBottom = barTop + (layout?.barHeight ?? 20);
      if (svgY < barTop - 6 || svgY > barBottom + 6) continue;
      if (Math.abs(svgX - toRenderX(bar.startX)) <= EDGE_RADIUS)
        return { barId: bar.id, edge: "start" as const };
      if (Math.abs(svgX - toRenderX(bar.startX + bar.width)) <= EDGE_RADIUS)
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
        { f: 0, label: "0" },
        { f: 1 / 3, label: "1/3" },
        { f: 1 / 2, label: "1/2" },
        { f: 2 / 3, label: "2/3" },
        { f: 1, label: "1" },
      ];
      for (const { f, label } of fractions) {
        if (Math.abs(col.modelX + f * cellWidth - snappedX) < 0.5) return label;
      }
    }
    return "";
  };

  // — Обработчики событий мыши —

  /** Начало рисования новой полосы (левая кнопка мыши на свободном месте). */
  const onMouseDown = (e: React.MouseEvent) => {
    if (e.shiftKey) return; // Shift зарезервирован для создания связей
    const renderX = getSvgX(e.clientX);
    if (renderX < labelWidth) return; // клик в колонке подписей — игнорируем
    const rawX = getModelX(e.clientX);
    const snappedX = snap(rawX);
    const rowIndex = getRowIndex(e.clientY);
    dragging.current = { startX: snappedX, rowIndex };
    setPreview({ x: snappedX, width: 0, row: rowIndex });
    setSnapHint(null);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const renderX = getSvgX(e.clientX);
    const rawX = getModelX(e.clientX);
    const rawY = getSvgY(e.clientY);

    if (connDraft) {
      // Обновляем конец «резиновой» стрелки связи.
      setConnDraft((d) => (d ? { ...d, mouseX: renderX, mouseY: rawY } : null));
      return;
    }

    if (renderX >= labelWidth) {
      const snappedX = snap(rawX);
      const month = Math.max(
        0,
        Math.min(totalMonths - 1, Math.floor((rawX - labelWidth) / cellWidth)),
      );
      const row = getRowIndex(e.clientY);
      setHoverCell({ row, month });
      setSnapHint({
        x: toRenderX(snappedX),
        y: rawY - 16,
        label: getSnapLabel(snappedX),
      });
    } else {
      setSnapHint(null);
      setHoverCell(null);
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
    const currentColorIndex = colorIndex % COLORS.length;
    const autoLabel = barLabel.trim() || String(currentColorIndex + 1);
    addBar({
      id: crypto.randomUUID(),
      rowIndex: dragging.current.rowIndex,
      startX: preview.x,
      width: preview.width,
      color: COLORS[currentColorIndex],
      label: autoLabel,
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
    setSnapHint(null);
    setHoverCell(null);
  };

  /** Инициирует рисование связи от указанного края полосы. */
  const handleStartConnection = (barId: string, edge: "start" | "end") => {
    const pt = getBarEdgePoint(barId, edge);
    if (!pt) return;
    setConnDraft({
      fromBarId: barId,
      fromEdge: edge,
      mouseX: pt.x,
      mouseY: pt.y,
    });
  };

  /** Открывает контекстное меню для полосы или связи. */
  const openContextMenu = (
    type: "bar" | "connection",
    id: string,
    clientX: number,
    clientY: number,
  ) => {
    const editLabel =
      type === "bar" ? (bars.find((b) => b.id === id)?.label ?? "") : "";
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
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeContextMenu();
        setConnDraft(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Ctrl + колесо мыши — масштабирование таймлайна (только ширина месяцев).
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      setZoom((z) => Math.min(2.4, Math.max(0.6, z * (1 - e.deltaY * 0.001))));
    };
    // passive: false — нужен, чтобы preventDefault() сработал.
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Список snap-точек передаётся в каждую GanttBar для drag-примагничивания.
  const snapPoints = monthColumns.flatMap((col) =>
    [0, 1 / 3, 1 / 2, 2 / 3, 1].map((f) => col.modelX + f * cellWidth),
  );

  return (
    <div className="gantt-grid">
      {/* Панель инструментов над сеткой */}
      <div className="editor-toolbar material-card">
        <label className="field-inline">
          Метка
          <input
            className="material-input compact"
            value={barLabel}
            onChange={(e) => setBarLabel(e.target.value)}
          />
        </label>

        <div className="toolbar-group color-group">
          <span className="toolbar-label">Цвет</span>
          <div className="swatch-row">
            {COLORS.map((c, i) => (
              <button
                key={i}
                className={`color-swatch ${i === colorIndex ? "selected" : ""}`}
                onClick={() => setColorIndex(i)}
                style={{ background: c }}
                title={`Цвет ${i + 1}`}
              />
            ))}
          </div>
        </div>

        <label className="switch-control">
          <input
            type="checkbox"
            checked={isDashed}
            onChange={(e) => setIsDashed(e.target.checked)}
          />
          <span className="switch-track">
            <span className="switch-thumb" />
          </span>
          Пунктир
        </label>

        <span className="toolbar-hint">
          Shift + край полосы — связь · Ctrl + колесо — масштаб · край полосы —
          resize
        </span>
      </div>

      <section className="canvas-card material-card">
        <div className="canvas-header">
          <div>
            <h2>Рабочая область</h2>
            <p>Кликните и протяните по сетке, чтобы создать новую полосу.</p>
          </div>
          <span className="zoom-pill">Масштаб {Math.round(zoom * 100)}%</span>
        </div>

        <div className="canvas-viewport">
          {/* SVG-холст: zoom меняет только X-координаты таймлайна. */}
          <svg
            ref={svgRef}
            className="gantt-svg"
            width={totalWidth}
            height={totalHeight}
            style={{
              cursor: "crosshair",
              display: "block",
              background: theme.svgBackground,
            }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseLeave}
          >
            <defs>
              {/* Наконечник стрелки для реальных связей */}
              <marker
                id="arrowhead"
                markerWidth="8"
                markerHeight="6"
                refX="7"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" fill={theme.arrowColor} />
              </marker>
              {/* Наконечник стрелки для превью (серый) */}
              <marker
                id="arrowhead-preview"
                markerWidth="8"
                markerHeight="6"
                refX="7"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" fill={theme.textSecondary} />
              </marker>
            </defs>

            <g>
              {/* Заголовок: строка годов */}
              {(() => {
                let gx = labelWidth;
                return years.map((year) => {
                  const yearWidth = year.months.length * scaledCellWidth;
                  const el = (
                    <g key={year.label}>
                      <rect
                        x={gx}
                        y={0}
                        width={yearWidth}
                        height={headerHeight}
                        fill={theme.headerBg}
                        stroke={theme.gridLine}
                        strokeWidth={0.5}
                      />
                      <text
                        x={gx + yearWidth / 2}
                        y={headerHeight / 2}
                        textAnchor="middle"
                        fontSize={13}
                        dominantBaseline="middle"
                        fill={theme.headerText}
                        fontWeight={700}
                      >
                        {year.label}
                      </text>
                    </g>
                  );
                  gx += yearWidth;
                  return el;
                });
              })()}

              {/* Заголовок: строка месяцев */}
              {monthColumns.map((col, i) => (
                <g key={i}>
                  <rect
                    x={col.x}
                    y={headerHeight}
                    width={scaledCellWidth}
                    height={headerHeight}
                    fill={theme.headerBg}
                    stroke={theme.gridLine}
                    strokeWidth={col.index % 3 === 0 ? 1 : 0.5}
                  />
                  <text
                    x={col.x + scaledCellWidth / 2}
                    y={headerHeight * 1.5}
                    textAnchor="middle"
                    fontSize={scaledCellWidth < 42 ? 9 : 11}
                    dominantBaseline="middle"
                    fill={theme.headerText}
                  >
                    {col.label}
                  </text>
                </g>
              ))}

              {/* Строки с подписями и ячейками */}
              {rows.map((rowLabel, ri) => (
                <g key={ri}>
                  <rect
                    x={0}
                    y={rowYPositions[ri]}
                    width={labelWidth}
                    height={rowHeights[ri]}
                    fill={theme.sidebarBg}
                    stroke={theme.gridLine}
                    strokeWidth={0.5}
                  />
                  <text
                    x={labelWidth / 2}
                    y={rowYPositions[ri] + rowHeights[ri] / 2}
                    textAnchor="middle"
                    fontSize={12}
                    dominantBaseline="middle"
                    fill={theme.text}
                    fontWeight={600}
                  >
                    {rowLabel}
                  </text>
                  {monthColumns.map((col, ci) => (
                    <rect
                      key={ci}
                      x={col.x}
                      y={rowYPositions[ri]}
                      width={scaledCellWidth}
                      height={rowHeights[ri]}
                      fill={ri % 2 === 0 ? theme.svgBackground : theme.surface}
                      stroke={theme.gridLine}
                      strokeWidth={col.index % 3 === 0 ? 0.9 : 0.45}
                    />
                  ))}
                </g>
              ))}

              {/* Подсветка hover: строка и колонка */}
              {hoverCell && (
                <>
                  <rect
                    x={labelWidth}
                    y={rowYPositions[hoverCell.row]}
                    width={totalMonths * scaledCellWidth}
                    height={rowHeights[hoverCell.row]}
                    fill={theme.primary}
                    fillOpacity={0.06}
                    pointerEvents="none"
                  />
                  <rect
                    x={monthColumns[hoverCell.month].x}
                    y={headerHeight * 2}
                    width={scaledCellWidth}
                    height={totalHeight - headerHeight * 2}
                    fill={theme.primary}
                    fillOpacity={0.04}
                    pointerEvents="none"
                  />
                </>
              )}

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
                    rowYPosition={rowYPositions[bar.rowIndex]}
                    zoom={zoom}
                    labelWidth={labelWidth}
                    svgRef={svgRef}
                    onStartConnection={handleStartConnection}
                    onContextMenu={(barId, x, y) =>
                      openContextMenu("bar", barId, x, y)
                    }
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
                  <g
                    key={conn.id}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openContextMenu(
                        "connection",
                        conn.id,
                        e.clientX,
                        e.clientY,
                      );
                    }}
                  >
                    {/* Прозрачная «зона клика» шире видимой линии */}
                    <path
                      d={d}
                      stroke="transparent"
                      strokeWidth={8}
                      fill="none"
                      style={{ cursor: "context-menu" }}
                    />
                    <path
                      d={d}
                      stroke={theme.arrowColor}
                      strokeWidth={1.5}
                      fill="none"
                      strokeDasharray="4 3"
                      markerEnd="url(#arrowhead)"
                      style={{ pointerEvents: "none" }}
                    />
                  </g>
                );
              })}

              {/* Превью новой полосы при рисовании */}
              {preview && preview.width > 0 && (
                <rect
                  x={toRenderX(preview.x)}
                  y={preview.row * rowHeight + headerHeight * 2 + 9}
                  width={preview.width * zoom}
                  height={Math.min(30, rowHeight - 18)}
                  fill={COLORS[colorIndex]}
                  fillOpacity={0.4}
                  rx={3}
                  style={{ pointerEvents: "none" }}
                />
              )}

              {/* «Резиновая» стрелка при рисовании связи */}
              {connDraft &&
                (() => {
                  const from = getBarEdgePoint(
                    connDraft.fromBarId,
                    connDraft.fromEdge,
                  );
                  if (!from) return null;
                  const d = linePath(
                    from.x,
                    from.y,
                    connDraft.mouseX,
                    connDraft.mouseY,
                  );
                  return (
                    <path
                      d={d}
                      stroke={theme.textSecondary}
                      strokeWidth={1.5}
                      fill="none"
                      strokeDasharray="4 3"
                      markerEnd="url(#arrowhead-preview)"
                      style={{ pointerEvents: "none" }}
                    />
                  );
                })()}

              {/* Подсказка с долей ячейки рядом с курсором */}
              {!connDraft && snapHint && snapHint.label && (
                <g style={{ pointerEvents: "none" }}>
                  <rect
                    x={snapHint.x - 14}
                    y={snapHint.y - 12}
                    width={28}
                    height={16}
                    rx={3}
                    fill={theme.primary}
                    fillOpacity={0.9}
                  />
                  <text
                    x={snapHint.x}
                    y={snapHint.y - 4}
                    textAnchor="middle"
                    fontSize={10}
                    fill="white"
                  >
                    {snapHint.label}
                  </text>
                </g>
              )}
            </g>
          </svg>
        </div>
      </section>

      {/* Контекстное меню (полоса или связь) */}
      {contextMenu &&
        (() => {
          const mi: React.CSSProperties = {
            display: "block",
            width: "100%",
            textAlign: "left",
            padding: "6px 14px",
            fontSize: 12,
            background: "none",
            border: "none",
            cursor: "pointer",
            whiteSpace: "nowrap",
            color: theme.text,
          };
          const bar =
            contextMenu.type === "bar"
              ? bars.find((b) => b.id === contextMenu.id)
              : null;
          return (
            <>
              {/* Прозрачный оверлей на весь экран — клик закрывает меню */}
              <div
                style={{ position: "fixed", inset: 0 }}
                onClick={closeContextMenu}
              />
              <div
                style={{
                  position: "fixed",
                  left: contextMenu.x,
                  top: contextMenu.y,
                  background: theme.menuBg,
                  border: `1px solid ${theme.menuBorder}`,
                  borderRadius: 16,
                  padding: "6px 0",
                  boxShadow: `0 14px 32px ${theme.menuShadow}`,
                  zIndex: 1000,
                  minWidth: 180,
                }}
              >
                {bar ? (
                  <>
                    <div
                      style={{
                        padding: "5px 12px 7px",
                        borderBottom: `1px solid ${theme.border}`,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10,
                          color: theme.textSecondary,
                          marginBottom: 3,
                        }}
                      >
                        Метка
                      </div>
                      <input
                        autoFocus
                        value={contextMenu.editLabel}
                        onChange={(e) =>
                          setContextMenu((c) =>
                            c ? { ...c, editLabel: e.target.value } : null,
                          )
                        }
                        onBlur={() =>
                          updateBar(contextMenu.id, {
                            label: contextMenu.editLabel,
                          })
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter")
                            updateBar(contextMenu.id, {
                              label: contextMenu.editLabel,
                            });
                        }}
                        style={{
                          width: "100%",
                          fontSize: 12,
                          padding: "2px 4px",
                          boxSizing: "border-box",
                          background: theme.inputBg,
                          color: theme.text,
                          border: `1px solid ${theme.border}`,
                        }}
                      />
                    </div>
                    <div
                      style={{
                        padding: "6px 12px 7px",
                        borderBottom: `1px solid ${theme.border}`,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10,
                          color: theme.textSecondary,
                          marginBottom: 4,
                        }}
                      >
                        Цвет
                      </div>
                      <div style={{ display: "flex", gap: 4 }}>
                        {COLORS.map((c) => (
                          <div
                            key={c}
                            onClick={() =>
                              updateBar(contextMenu.id, { color: c })
                            }
                            style={{
                              width: 18,
                              height: 18,
                              background: c,
                              borderRadius: 3,
                              cursor: "pointer",
                              border:
                                bar.color === c
                                  ? `2px solid ${theme.primary}`
                                  : "2px solid transparent",
                              boxSizing: "border-box",
                            }}
                          />
                        ))}
                      </div>
                    </div>
                    <button
                      style={mi}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = theme.buttonHover)
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "none")
                      }
                      onClick={() => {
                        addBar({ ...bar, id: crypto.randomUUID() });
                        closeContextMenu();
                      }}
                    >
                      Дублировать
                    </button>
                    <button
                      style={mi}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = theme.buttonHover)
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "none")
                      }
                      onClick={() => {
                        updateBar(contextMenu.id, { dashed: !bar.dashed });
                        closeContextMenu();
                      }}
                    >
                      {bar.dashed ? "Сделать сплошной" : "Сделать пунктирной"}
                    </button>
                    <div
                      style={{
                        borderTop: `1px solid ${theme.border}`,
                        margin: "3px 0",
                      }}
                    />
                    <button
                      className="context-menu-button-danger"
                      style={{ ...mi, color: theme.danger }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          theme.dangerContainer)
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "none")
                      }
                      onClick={handleContextMenuDelete}
                    >
                      Удалить полосу
                    </button>
                  </>
                ) : (
                  <button
                    className="context-menu-button-danger"
                    style={{ ...mi, color: theme.danger }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = theme.dangerContainer)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "none")
                    }
                    onClick={handleContextMenuDelete}
                  >
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
