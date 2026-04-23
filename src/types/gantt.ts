export interface GanttConfig {
        years: { label: string; months: string[] }[];
        rows: string[];
        cellWidth: number;
        rowHeight: number;
        headerHeight: number;
        labelWidth: number;
}

export interface GanttBar {
        id: string;
        rowIndex: number;
        startX: number;
        width: number;
        color: string;
        label: string;
        dashed: boolean;
}