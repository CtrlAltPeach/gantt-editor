import type { RefObject } from "react";
import { useGanttStore } from "../store/useGanttStore";
import { useThemeStore } from "../store/useThemeStore";
import { saveToFile, loadFromFile } from "../utils/fileio";
import { exportToPng } from "../utils/exportPng";

interface Props {
  svgRef: RefObject<SVGSVGElement | null>;
}

const MONTHS: string[] = [
  "Янв",
  "Фев",
  "Март",
  "Апр",
  "Май",
  "Июнь",
  "Июль",
  "Авг",
  "Сен",
  "Окт",
  "Ноя",
  "Дек",
];

export function RowsPanel({ svgRef }: Props) {
  const { config, bars, connections, setRows, setYears } = useGanttStore();
  const { toggle, isDark } = useThemeStore();
  const rows = config.rows;
  const years = config.years;

  const update = (i: number, val: string) => {
    const next = [...rows];
    next[i] = val;
    setRows(next);
  };

  const add = () => setRows([...rows, `Работа ${rows.length + 1}`]);
  const remove = (i: number) => setRows(rows.filter((_, idx) => idx !== i));

  const addYear = () =>
    setYears([
      ...years,
      { label: `Год ${years.length + 1}`, months: [...MONTHS] },
    ]);
  const removeLastYear = () => {
    if (years.length <= 1) return;
    setYears(years.slice(0, -1));
  };
  const updateYearLabel = (i: number, label: string) => {
    const next = [...years];
    next[i] = { ...next[i], label };
    setYears(next);
  };

  const handleSave = async () => {
    await saveToFile({ rows, years, bars, connections });
  };

  const handleLoad = async () => {
    const data = await loadFromFile();
    if (!data) return;
    setRows(data.rows);
    if (data.years) setYears(data.years);
    useGanttStore.setState({
      bars: data.bars,
      connections: data.connections ?? [],
    });
  };

  const handleExport = async () => {
    if (!svgRef.current) return;
    await exportToPng(svgRef.current);
  };

  return (
    <div className="panel">
      <section className="panel-section">
        <div className="section-heading">
          <div className="section-title">
            <span className="section-icon">📅</span>
            Годы
          </div>
          <span className="section-meta">{years.length}</span>
        </div>

        <div className="form-list">
          {years.map((year, i) => (
            <div key={i} className="form-row">
              <span className="row-index">{i + 1}</span>
              <input
                className="material-input"
                value={year.label}
                onChange={(e) => updateYearLabel(i, e.target.value)}
              />
              {years.length > 1 && i === years.length - 1 ? (
                <button
                  className="icon-button"
                  onClick={removeLastYear}
                  title="Удалить последний год"
                >
                  ✕
                </button>
              ) : (
                <span />
              )}
            </div>
          ))}
        </div>

        <button className="material-button full" onClick={addYear}>
          + Добавить год
        </button>
      </section>

      <section className="panel-section">
        <div className="section-heading">
          <div className="section-title">
            <span className="section-icon">☰</span>
            Строки
          </div>
          <span className="section-meta">{rows.length}</span>
        </div>

        <div className="form-list">
          {rows.map((row, i) => (
            <div key={i} className="form-row simple">
              <input
                className="material-input"
                value={row}
                onChange={(e) => update(i, e.target.value)}
              />
              <button
                className="icon-button"
                onClick={() => remove(i)}
                title="Удалить строку"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <button className="material-button full" onClick={add}>
          + Добавить строку
        </button>
      </section>

      <section className="panel-section">
        <div className="section-heading">
          <div className="section-title">
            <span className="section-icon">💾</span>
            Файлы
          </div>
        </div>

        <div className="button-stack">
          <button className="material-button filled full" onClick={handleSave}>
            Сохранить JSON
          </button>
          <button className="material-button full" onClick={handleLoad}>
            Загрузить JSON
          </button>
          <button className="material-button full" onClick={handleExport}>
            Экспорт PNG
          </button>
        </div>
      </section>

      <section className="panel-section">
        <div className="section-heading">
          <div className="section-title">
            <span className="section-icon">🎨</span>
            Вид
          </div>
        </div>

        <button className="material-button full" onClick={toggle}>
          {isDark ? "☀ Светлая тема" : "🌙 Тёмная тема"}
        </button>
      </section>
    </div>
  );
}
