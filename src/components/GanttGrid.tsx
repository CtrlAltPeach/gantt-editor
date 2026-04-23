import { useRef, useState } from "react";
import { useGanttStore } from "../store/useGanttStore";
import { GanttBar } from "./GanttBar";

const COLORS = ["#e05c5c", "#5c8ee0", "#5cc47a", "#e0a85c", "#a05ce0", "#5cc4c4", "#e05ca8", "#8ee05c"];

interface Props {
	svgRef: React.RefObject<SVGSVGElement | null>;
}

export function GanttGrid({ svgRef }: Props) {

	const config = useGanttStore((s) => s.config);
	const bars = useGanttStore((s) => s.bars);
	const addBar = useGanttStore((s) => s.addBar);
	const { years, rows, cellWidth, rowHeight, headerHeight, labelWidth } = config;

	const [colorIndex, setColorIndex] = useState(0);
	const [barLabel, setBarLabel] = useState("1");
	const [isDashed, setIsDashed] = useState(false);
	const dragging = useRef<{ startX: number; rowIndex: number } | null>(null);
	const [preview, setPreview] = useState<{ x: number; width: number; row: number } | null>(null);
	const [snapHint, setSnapHint] = useState<{ x: number; y: number; label: string } | null>(null);

	const totalMonths = years.reduce((s, y) => s + y.months.length, 0);
	const totalWidth = labelWidth + totalMonths * cellWidth;
	const totalHeight = headerHeight * 2 + rows.length * rowHeight;

	const monthColumns: { x: number; label: string }[] = [];
	let x = labelWidth;
	for (const year of years) {
		for (const month of year.months) {
			monthColumns.push({ x, label: month });
			x += cellWidth;
		}
	}

	// Snap: ближайшая точка из 0, 1/3, 1/2, 2/3, 1 каждой ячейки
	const snap = (rawX: number): number => {
		const snapPoints = monthColumns.flatMap((col) =>
			[0, 1 / 3, 1 / 2, 2 / 3, 1].map((f) => col.x + f * cellWidth)
		);
		return snapPoints.reduce((best, p) =>
			Math.abs(p - rawX) < Math.abs(best - rawX) ? p : best
		);
	};

	const getSvgX = (clientX: number) => {
		const rect = svgRef.current!.getBoundingClientRect();
		return clientX - rect.left;
	};

	const getRowIndex = (clientY: number) => {
		const rect = svgRef.current!.getBoundingClientRect();
		const y = clientY - rect.top - headerHeight * 2;
		return Math.max(0, Math.min(rows.length - 1, Math.floor(y / rowHeight)));
	};

	const onMouseDown = (e: React.MouseEvent) => {
		const rawX = getSvgX(e.clientX);
		if (rawX < labelWidth) return;
		const snappedX = snap(rawX);
		const rowIndex = getRowIndex(e.clientY);
		dragging.current = { startX: snappedX, rowIndex };
		setPreview({ x: snappedX, width: 0, row: rowIndex });
		setSnapHint(null);
	};

	const onMouseMove = (e: React.MouseEvent) => {
		const rawX = getSvgX(e.clientX);
		const rawY = e.clientY - svgRef.current!.getBoundingClientRect().top;
		if (rawX >= labelWidth) {
			const snappedX = snap(rawX);
			setSnapHint({ x: snappedX, y: rawY - 16, label: getSnapLabel(snappedX) });
		} else {
			setSnapHint(null);
		}

		if (!dragging.current) return;
		const snappedX = snap(rawX);
		const start = dragging.current.startX;
		const x = Math.min(start, snappedX);
		const width = Math.abs(snappedX - start);
		setPreview({ x, width, row: dragging.current.rowIndex });
	};

	const onMouseUp = () => {
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
				if (Math.abs(col.x + f * cellWidth - snappedX) < 0.5) return label;
			}
		}
		return "";
	};

	return (
		<div>
			{/* Панель инструментов */}
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
			</div>

			<svg ref={svgRef} width={totalWidth} height={totalHeight}
				style={{ cursor: "crosshair", display: "block" }}
				onMouseDown={onMouseDown} onMouseMove={onMouseMove}
				onMouseUp={onMouseUp} onMouseLeave={onMouseUp}>

				{/* Годы */}
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

				{/* Месяцы */}
				{monthColumns.map((col, i) => (
					<g key={i}>
						<rect x={col.x} y={headerHeight} width={cellWidth} height={headerHeight}
							fill="#f8f8f8" stroke="#ccc" strokeWidth={0.5} />
						<text x={col.x + cellWidth / 2} y={headerHeight * 1.5}
							textAnchor="middle" fontSize={10} dominantBaseline="middle">{col.label}</text>
					</g>
				))}

				{/* Строки */}
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

				{/* Полосы */}
				{bars.map((bar) => (
					<GanttBar
						key={bar.id}
						bar={bar}
						snapPoints={monthColumns.flatMap((col) =>
							[0, 1 / 3, 1 / 2, 2 / 3, 1].map((f) => col.x + f * cellWidth)
						)}
						rowCount={rows.length}
						rowHeight={rowHeight}
						headerHeight={headerHeight}
						svgRef={svgRef}
					/>
				))}

				{/* Превью при рисовании */}
				{preview && preview.width > 0 && (
					<rect x={preview.x} y={preview.row * rowHeight + headerHeight * 2 + 8}
						width={preview.width} height={20}
						fill={COLORS[colorIndex]} fillOpacity={0.4} rx={3}
						style={{ pointerEvents: "none" }} />
				)}
				{/* Snap подсказка */}
				{snapHint && snapHint.label && (
					<g style={{ pointerEvents: "none" }}>
						<rect
							x={snapHint.x - 14} y={snapHint.y - 12}
							width={28} height={16} rx={3}
							fill="#333" fillOpacity={0.75}
						/>
						<text
							x={snapHint.x} y={snapHint.y - 4}
							textAnchor="middle" fontSize={10} fill="white"
						>
							{snapHint.label}
						</text>
					</g>
				)}
			</svg>
		</div>
	);
}