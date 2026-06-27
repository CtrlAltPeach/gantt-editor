import { CSSProperties, useEffect, useRef, useState } from "react";
import { GanttGrid } from "./components/GanttGrid";
import { RowsPanel } from "./components/RowsPanel";
import { useGanttStore } from "./store/useGanttStore";
import { useHistoryStore } from "./store/useHistoryStore";
import { useThemeStore } from "./store/useThemeStore";

export default function App() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const undo = useHistoryStore((s) => s.undo);
  const redo = useHistoryStore((s) => s.redo);
  const canUndo = useHistoryStore((s) => s.past.length > 0);
  const canRedo = useHistoryStore((s) => s.future.length > 0);
  const { theme, toggle, isDark } = useThemeStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const barsCount = useGanttStore((s) => s.bars.length);
  const connectionsCount = useGanttStore((s) => s.connections.length);
  const rowsCount = useGanttStore((s) => s.config.rows.length);
  const yearsCount = useGanttStore((s) => s.config.years.length);

  // Обработка горячих клавиш Ctrl+Z / Ctrl+Y
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "y" || (e.key === "z" && e.shiftKey))
      ) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  const themeVars = {
    "--color-bg": theme.background,
    "--color-surface": theme.surface,
    "--color-surface-variant": theme.surfaceVariant,
    "--color-sidebar": theme.sidebarBg,
    "--color-input": theme.inputBg,
    "--color-primary": theme.primary,
    "--color-primary-hover": theme.primaryHover,
    "--color-primary-container": theme.primaryContainer,
    "--color-on-primary": theme.onPrimary,
    "--color-on-primary-container": theme.onPrimaryContainer,
    "--color-text": theme.text,
    "--color-text-secondary": theme.textSecondary,
    "--color-text-hint": theme.textHint,
    "--color-border": theme.border,
    "--color-grid": theme.gridLine,
    "--color-header": theme.headerBg,
    "--color-button": theme.buttonBg,
    "--color-button-hover": theme.buttonHover,
    "--color-danger": theme.danger,
    "--color-danger-container": theme.dangerContainer,
  } as CSSProperties;

  return (
    <div className="app-shell" style={themeVars}>
      <header className="top-app-bar">
        <div className="brand">
          <div className="brand-icon">G</div>
          <div>
            <div className="brand-title">Gantt Editor</div>
            <div className="brand-subtitle">Планирование работ и связей</div>
          </div>
        </div>

        <div className="top-actions">
          <button
            className="tonal-button"
            onClick={() => setSidebarOpen((open) => !open)}
            title="Скрыть/показать левую панель"
          >
            {sidebarOpen ? "⟵ Панель" : "⟶ Панель"}
          </button>
          <button
            className="tonal-button"
            onClick={undo}
            disabled={!canUndo}
            title="Ctrl+Z"
          >
            ↶ Отменить
          </button>
          <button
            className="tonal-button"
            onClick={redo}
            disabled={!canRedo}
            title="Ctrl+Y"
          >
            ↷ Повторить
          </button>
          <button
            className="icon-tonal-button"
            onClick={toggle}
            title="Переключить тему"
          >
            {isDark ? "☀" : "🌙"}
          </button>
        </div>
      </header>

      <div className={`workspace ${sidebarOpen ? "" : "sidebar-collapsed"}`}>
        {sidebarOpen && (
          <aside className="side-sheet">
            <RowsPanel svgRef={svgRef} />
          </aside>
        )}

        <main className="content-area">
          <div className="content-header">
            <div>
              <h1 className="content-title">Диаграмма проекта</h1>
              <p className="content-description">
                Рисуйте полосы, связывайте этапы и экспортируйте результат в
                PNG.
              </p>
            </div>
            <div className="stats-row">
              <span className="stat-chip">{yearsCount} г.</span>
              <span className="stat-chip">{rowsCount} строк</span>
              <span className="stat-chip">{barsCount} полос</span>
              <span className="stat-chip">{connectionsCount} связей</span>
            </div>
          </div>

          <GanttGrid svgRef={svgRef} />
        </main>
      </div>
    </div>
  );
}
