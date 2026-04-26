import { save, open } from "@tauri-apps/plugin-dialog";
import { writeTextFile, readTextFile } from "@tauri-apps/plugin-fs";
import { GanttBar, GanttConfig, GanttConnection } from "../types/gantt";

/**
 * Структура данных, сохраняемых в JSON-файл.
 * Поля years и connections опциональны для обратной совместимости со старыми файлами.
 */
export interface SaveData {
        rows: string[];
        years?: GanttConfig["years"];
        bars: GanttBar[];
        connections?: GanttConnection[];
}

/**
 * Открывает системный диалог «Сохранить как» и записывает диаграмму в JSON.
 * Ничего не делает, если пользователь отменил диалог.
 */
export async function saveToFile(data: SaveData): Promise<void> {
        const path = await save({
                filters: [{ name: "Gantt", extensions: ["json"] }],
                defaultPath: "diagram.json",
        });
        if (!path) return;
        await writeTextFile(path, JSON.stringify(data, null, 2));
}

/**
 * Открывает системный диалог выбора файла и загружает диаграмму из JSON.
 * Возвращает null, если пользователь отменил диалог.
 */
export async function loadFromFile(): Promise<SaveData | null> {
        const path = await open({
                filters: [{ name: "Gantt", extensions: ["json"] }],
                multiple: false,
        });
        if (!path) return null;
        const text = await readTextFile(path as string);
        return JSON.parse(text) as SaveData;
}
