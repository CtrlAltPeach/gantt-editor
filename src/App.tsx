import { useRef } from "react";
import { GanttGrid } from "./components/GanttGrid";
import { RowsPanel } from "./components/RowsPanel";

export default function App() {
  const svgRef = useRef<SVGSVGElement | null>(null);

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <aside style={{ width: 220, borderRight: "1px solid #ddd", overflowY: "auto" }}>
        <RowsPanel svgRef={svgRef} />
      </aside>
      <main style={{ flex: 1, overflow: "auto", padding: 16 }}>
        <GanttGrid svgRef={svgRef} />
      </main>
    </div>
  );
}