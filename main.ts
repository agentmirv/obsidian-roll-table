import { App, MarkdownView, Notice, Plugin } from 'obsidian';
import { IMarkdownTable, IPlaceholderMarkdownTable } from './src/interfaces';
import { TableSuggestModal, PlaceholderSuggestModal } from './src/modals';
import { Outcome } from './src/utils';
import { parseMarkdownTables, getOutcome, generateOutcomeString, insertOutcomeText } from './src/utils';

export default class RollTablePlugin extends Plugin {
    async onload() {
        this.addCommand({
            id: 'roll-table',
            name: 'Roll Table',
            checkCallback: (checking: boolean) => {
                const activeMarkdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
                
                if (!activeMarkdownView) {
                    return false;
                }

                if (!checking) {
                    this.handleRollTableCommand(activeMarkdownView);
                }

                return true;
            }
        });
    }

    private async handleRollTableCommand(markdownView: MarkdownView): Promise<void> {
        try {
            const availableTables = await this.getAllMarkdownTables();
            new TableSuggestModal(this.app, availableTables, (selectedTable: string) => {
                handleTableSelection(markdownView, availableTables, selectedTable);
            }).open();
        } catch (error) {
            console.error('Failed to process roll table command:', error);
            new Notice('Failed to process roll table command');
        }
    }

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

    onunload() {
        // Cleanup if needed in the future
    }
}

async function handlePlaceholderTable(
    table: IPlaceholderMarkdownTable, 
    markdownView: MarkdownView
): Promise<Outcome | null> {
    return new Promise((resolve) => {
        const placeholderRows = table.rows.filter(row => 
            row.type === 'placeholder');
        
        new PlaceholderSuggestModal(
            markdownView.app,
            table.placeholder,
            placeholderRows,
            (selectedRow) => {
                const outcome = new Outcome(
                    table.name,
                    '',
                    '',
                    selectedRow
                );
                resolve(outcome);
            }
        ).open();
    });
}

async function processTable(
    table: IMarkdownTable,
    tableName: string,
    markdownView: MarkdownView
): Promise<Outcome | null> {
    if (table.type === 'rolled') {
        return getOutcome(table);
    } else {
        return handlePlaceholderTable(table, markdownView);
    }
}

async function handleTableSelection(
    markdownView: MarkdownView, 
    tables: Map<string, IMarkdownTable>, 
    selectedTableName: string
) {
    const outcomes = new Map<string, Outcome>();
    let currentTableName = selectedTableName;
    let currentTable = tables.get(currentTableName);

    while (currentTable) {
        console.log(`Processing table: ${currentTableName}`);
        
        const outcome = await processTable(currentTable, currentTableName, markdownView);
        if (!outcome) {
            new Notice('Failed to get outcome for table');
            return;
        }

        outcomes.set(currentTableName, outcome);
        
        currentTableName = outcome.row.nextTable;
        if (outcomes.has(currentTableName)) break;
        currentTable = tables.get(currentTableName);
    }

    const outcomeText = Array.from(outcomes.values())
        .map(generateOutcomeString)
        .filter(Boolean)
        .join('');

    if (!outcomeText) {
        new Notice('No table selected.');
        return;
    }

    insertOutcomeText(markdownView, outcomeText);
}
