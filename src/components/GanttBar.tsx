import { useRef, useState } from "react";
import { useGanttStore } from "../store/useGanttStore";
import { useThemeStore } from "../store/useThemeStore";
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
  /** Y-позиция строки в SVG-координатах. */
  rowYPosition: number;
  /** Масштаб временной шкалы — меняет только X-координаты таймлайна. */
  zoom: number;
  /** Ширина левой колонки: она не масштабируется. */
  labelWidth: number;
  svgRef: React.RefObject<SVGSVGElement | null>;
  /** Вызывается при Shift+клике по краю полосы для начала рисования связи. */
  onStartConnection: (barId: string, edge: "start" | "end") => void;
  /** Вызывается при правом клике — открывает контекстное меню. */
  onContextMenu: (barId: string, x: number, y: number) => void;
}

const HANDLE_WIDTH = 10; // ширина зоны захвата на краях полосы

export function GanttBar({
  bar,
  snapPoints,
  rowCount,
  rowHeight,
  headerHeight,
  barHeight,
  yOffset,
  rowYPosition,
  zoom,
  labelWidth,
  svgRef,
  onStartConnection,
  onContextMenu,
}: Props) {
  const { moveBar, resizeBar } = useGanttStore();
  const theme = useThemeStore((s) => s.theme);
  const height = barHeight;
  const y = rowYPosition + yOffset;
  const renderX = labelWidth + (bar.startX - labelWidth) * zoom;
  const renderWidth = bar.width * zoom;
  const toModelX = (x: number) => labelWidth + (x - labelWidth) / zoom;

  // Запоминаем смещение мыши от левого края полосы при захвате, чтобы не «прыгать».
  const dragOffset = useRef<{ dx: number; dy: number } | null>(null);
  // Предыдущая снаппированная X для вычисления дельты (moveBar принимает deltaX, не абсолютный X).
  const prevSnappedX = useRef(bar.startX);
  // Режим resize: 'left' — тянем левый край, 'right' — правый, null — обычный drag.
  const [resizeMode, setResizeMode] = useState<"left" | "right" | null>(null);

  /** Возвращает ближайшую точку snap из заранее вычисленного массива. */
  const snap = (rawX: number) =>
    snapPoints.reduce((best, p) =>
      Math.abs(p - rawX) < Math.abs(best - rawX) ? p : best,
    );

  const onMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation(); // не передаём событие сетке (иначе начнётся рисование новой полосы)

    const rect = svgRef.current!.getBoundingClientRect();
    const mouseRenderX = e.clientX - rect.left;
    const mouseX = toModelX(mouseRenderX);

    if (e.shiftKey) {
      // Shift+клик рядом с краем полосы — начало рисования связи.
      const distToStart = Math.abs(mouseRenderX - renderX);
      const distToEnd = Math.abs(mouseRenderX - (renderX + renderWidth));
      if (distToStart <= 14 || distToEnd <= 14) {
        onStartConnection(bar.id, distToStart <= distToEnd ? "start" : "end");
      }
      return;
    }

    // Проверяем, попал ли клик в зону resize (края полосы).
    const distToStart = mouseRenderX - renderX;
    const distToEnd = renderX + renderWidth - mouseRenderX;

    if (distToStart >= 0 && distToStart <= HANDLE_WIDTH) {
      // Клик у левого края — resize левого края.
      setResizeMode("left");
      prevSnappedX.current = bar.startX;
      const onMove = (ev: MouseEvent) => {
        const rawX = toModelX(ev.clientX - rect.left);
        const snappedX = snap(rawX);
        const deltaStart = snappedX - prevSnappedX.current;
        if (deltaStart !== 0) {
          resizeBar(bar.id, deltaStart, 0);
          prevSnappedX.current = snappedX;
        }
      };
      const onUp = () => {
        setResizeMode(null);
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
      return;
    }

    if (distToEnd >= 0 && distToEnd <= HANDLE_WIDTH) {
      // Клик у правого края — resize правого края.
      setResizeMode("right");
      prevSnappedX.current = bar.startX + bar.width;
      const onMove = (ev: MouseEvent) => {
        const rawX = toModelX(ev.clientX - rect.left);
        const snappedX = snap(rawX);
        const deltaWidth = snappedX - prevSnappedX.current;
        if (deltaWidth !== 0) {
          resizeBar(bar.id, 0, deltaWidth);
          prevSnappedX.current = snappedX;
        }
      };
      const onUp = () => {
        setResizeMode(null);
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
      return;
    }

    // Обычный drag — вычисляем смещение мыши от левого края полосы.
    const mouseY = e.clientY - rect.top;
    dragOffset.current = { dx: mouseX - bar.startX, dy: mouseY - y };
    prevSnappedX.current = bar.startX;

    const onMove = (ev: MouseEvent) => {
      if (!dragOffset.current) return;
      const rawX = toModelX(ev.clientX - rect.left) - dragOffset.current.dx;
      const rawY = ev.clientY - rect.top;
      const snappedX = snap(rawX);
      // Передаём дельту, а не абсолютный X — store сдвинет связанные полосы на то же значение.
      const deltaX = snappedX - prevSnappedX.current;
      const rowIndex = Math.max(
        0,
        Math.min(
          rowCount - 1,
          Math.floor((rawY - headerHeight * 2) / rowHeight),
        ),
      );
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
    <g
      onMouseDown={onMouseDown}
      onContextMenu={onContextMenuHandler}
      style={{ cursor: resizeMode ? "ew-resize" : "grab" }}
    >
      {/* Основная полоса */}
      <rect
        x={renderX}
        y={y}
        width={renderWidth}
        height={height}
        fill={bar.dashed ? "none" : bar.color}
        stroke={bar.dashed ? bar.color : theme.gridLine}
        strokeWidth={1.5}
        strokeDasharray={bar.dashed ? "5 3" : undefined}
        rx={3}
      />
      {/* Левый resize handle */}
      <rect
        x={renderX}
        y={y}
        width={HANDLE_WIDTH}
        height={height}
        fill="transparent"
        style={{ cursor: "ew-resize" }}
      />
      {/* Правый resize handle */}
      <rect
        x={renderX + renderWidth - HANDLE_WIDTH}
        y={y}
        width={HANDLE_WIDTH}
        height={height}
        fill="transparent"
        style={{ cursor: "ew-resize" }}
      />
      <text
        x={renderX + renderWidth / 2}
        y={y + height / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={12}
        fill={bar.dashed ? bar.color : "white"}
        fontWeight={500}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        {bar.label}
      </text>
    </g>
  );
}
