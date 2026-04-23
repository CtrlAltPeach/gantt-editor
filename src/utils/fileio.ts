import { save, open } from "@tauri-apps/plugin-dialog";
import { writeTextFile, readTextFile } from "@tauri-apps/plugin-fs";
import { GanttBar } from "../types/gantt";

export interface SaveData {
        rows: string[];
        bars: GanttBar[];
}

export async function saveToFile(data: SaveData): Promise<void> {
        const path = await save({
                filters: [{ name: "Gantt", extensions: ["json"] }],
                defaultPath: "diagram.json",
        });
        if (!path) return;
        await writeTextFile(path, JSON.stringify(data, null, 2));
}

export async function loadFromFile(): Promise<SaveData | null> {
        const path = await open({
                filters: [{ name: "Gantt", extensions: ["json"] }],
                multiple: false,
        });
        if (!path) return null;
        const text = await readTextFile(path as string);
        return JSON.parse(text) as SaveData;
}