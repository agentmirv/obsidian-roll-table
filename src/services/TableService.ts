import { App } from 'obsidian';
import { IMarkdownTable } from '../interfaces';
import { parseMarkdownTables } from '../utils';

export class TableService {
    constructor(private app: App) {}
    
    async getAllMarkdownTables(): Promise<Map<string, IMarkdownTable>> {
        const markdownFiles = this.app.vault.getMarkdownFiles();
        const allTables = new Map<string, IMarkdownTable>();

        for (const file of markdownFiles) {
            try {
                const fileContent = await this.app.vault.read(file);
                const tablesInFile = parseMarkdownTables(fileContent, file.path);
                tablesInFile.forEach((table, tableName) => allTables.set(tableName, table));
            } catch (error) {
                console.error(`Failed to parse tables from ${file.path}:`, error);
            }
        }

        return allTables;
    }
}
