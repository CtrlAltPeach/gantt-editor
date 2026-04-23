import { useGanttStore } from "../store/useGanttStore";
import { saveToFile, loadFromFile } from "../utils/fileio";
import { exportToPng } from "../utils/exportPng";

interface Props {
        svgRef: React.RefObject<SVGSVGElement | null>;
}

export function RowsPanel({ svgRef }: Props) {
        const { config, bars, setRows } = useGanttStore();
        const rows = config.rows;

        const update = (i: number, val: string) => {
                const next = [...rows];
                next[i] = val;
                setRows(next);
        };

        const add = () => setRows([...rows, `Работа ${rows.length + 1}`]);
        const remove = (i: number) => setRows(rows.filter((_, idx) => idx !== i));

        const handleSave = async () => {
                await saveToFile({ rows, bars });
        };

        const handleLoad = async () => {
                const data = await loadFromFile();
                if (!data) return;
                setRows(data.rows);
                useGanttStore.setState({ bars: data.bars });
        };

        const handleExport = async () => {
                if (!svgRef.current) return;
                await exportToPng(svgRef.current);
        };

        return (
                <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
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