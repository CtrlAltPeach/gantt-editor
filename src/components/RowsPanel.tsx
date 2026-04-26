import { useGanttStore } from "../store/useGanttStore";
import { saveToFile, loadFromFile } from "../utils/fileio";
import { exportToPng } from "../utils/exportPng";

interface Props {
        svgRef: React.RefObject<SVGSVGElement | null>;
}

const MONTHS: string[] = ["Янв", "Фев", "Март", "Апр", "Май", "Июнь", "Июль", "Авг", "Сен", "Окт", "Ноя", "Дек"];

export function RowsPanel({ svgRef }: Props) {
        const { config, bars, connections, setRows, setYears } = useGanttStore();
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
                setYears([...years, { label: `Год ${years.length + 1}`, months: [...MONTHS] }]);
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
                useGanttStore.setState({ bars: data.bars, connections: data.connections ?? [] });
        };

        const handleExport = async () => {
                if (!svgRef.current) return;
                await exportToPng(svgRef.current);
        };

        return (
                <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                        <strong style={{ fontSize: 13 }}>Годы</strong>
                        {years.map((year, i) => (
                                <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                        <span style={{ fontSize: 11, color: "#888", minWidth: 16 }}>{i + 1}.</span>
                                        <input
                                                value={year.label}
                                                onChange={(e) => updateYearLabel(i, e.target.value)}
                                                style={{ flex: 1, fontSize: 12 }}
                                        />
                                        {years.length > 1 && i === years.length - 1 && (
                                                <button onClick={removeLastYear} style={{ fontSize: 12 }}>✕</button>
                                        )}
                                </div>
                        ))}
                        <button onClick={addYear} style={{ fontSize: 12, marginTop: 4 }}>+ Добавить год</button>

                        <hr style={{ margin: "8px 0", border: "none", borderTop: "1px solid #ddd" }} />

                        <strong style={{ fontSize: 13 }}>Строки</strong>
                        {rows.map((r, i) => (
                                <div key={i} style={{ display: "flex", gap: 6 }}>
                                        <input value={r} onChange={(e) => update(i, e.target.value)}
                                                style={{ flex: 1, fontSize: 12 }} />
                                        <button onClick={() => remove(i)} style={{ fontSize: 12 }}>✕</button>
                                </div>
                        ))}
                        <button onClick={add} style={{ fontSize: 12, marginTop: 4 }}>+ Добавить строку</button>

                        <hr style={{ margin: "8px 0", border: "none", borderTop: "1px solid #ddd" }} />

                        <button onClick={handleSave} style={{ fontSize: 12 }}>Сохранить</button>
                        <button onClick={handleLoad} style={{ fontSize: 12 }}>Загрузить</button>
                        <button onClick={handleExport} style={{ fontSize: 12 }}>Экспортировать</button>
                </div>
        );
}