import { App, MarkdownView, Notice, Plugin } from 'obsidian';
import { IMarkdownTable, IPlaceholderMarkdownTable } from './src/interfaces';
import { TableSuggestModal, PlaceholderSuggestModal } from './src/modals';
import { Outcome } from './src/utils';
import { parseMarkdownTables, getOutcome, generateOutcomeString, insertOutcomeText } from './src/utils';
import { TableService } from './src/services/TableService';

export default class RollTablePlugin extends Plugin {
    private tableService: TableService;
    
    async onload() {
        this.tableService = new TableService(this.app);
        
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
            const availableTables = await this.tableService.getAllMarkdownTables();
            this.openTableSelectionModal(markdownView, availableTables);
        } catch (error) {
            console.error('Failed to process roll table command:', error);
            new Notice('Failed to process roll table command');
        }
    }
    
    private openTableSelectionModal(markdownView: MarkdownView, availableTables: Map<string, IMarkdownTable>): void {
        new TableSuggestModal(this.app, availableTables, (selectedTable: IMarkdownTable) => {
            this.handleTableSelection(markdownView, availableTables, selectedTable.name);
        }).open();
    }

    async getAllMarkdownTables(): Promise<Map<string, IMarkdownTable>> {
        return this.tableService.getAllMarkdownTables();
    }
    
    private async handlePlaceholderTable(
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

    private async processTable(
        table: IMarkdownTable,
        tableName: string,
        markdownView: MarkdownView
    ): Promise<Outcome | null> {
        if (table.type === 'rolled') {
            return getOutcome(table);
        } else {
            return this.handlePlaceholderTable(table, markdownView);
        }
    }

    private async handleTableSelection(
        markdownView: MarkdownView, 
        tables: Map<string, IMarkdownTable>, 
        selectedTableName: string
    ) {
        const outcomes = await this.processTableChain(tables, selectedTableName, markdownView);
        const outcomeText = this.generateOutcomeText(outcomes);
        
        if (!outcomeText) {
            new Notice('No table selected.');
            return;
        }

        this.insertOutcomeIntoEditor(markdownView, outcomeText);
    }
    
    private async processTableChain(
        tables: Map<string, IMarkdownTable>,
        startingTableName: string,
        markdownView: MarkdownView
    ): Promise<Map<string, Outcome>> {
        const outcomes = new Map<string, Outcome>();
        let currentTableName = startingTableName;
        let currentTable = tables.get(currentTableName);

        while (currentTable) {
            console.log(`Processing table: ${currentTableName}`);
            
            const outcome = await this.processTable(currentTable, currentTableName, markdownView);
            if (!outcome) {
                break;
            }

            outcomes.set(currentTableName, outcome);
            
            currentTableName = outcome.row.nextTable;
            if (outcomes.has(currentTableName)) break;
            currentTable = tables.get(currentTableName);
        }
        
        return outcomes;
    }
    
    private generateOutcomeText(outcomes: Map<string, Outcome>): string {
        return Array.from(outcomes.values())
            .map(generateOutcomeString)
            .filter(Boolean)
            .join('');
    }
    
    private insertOutcomeIntoEditor(markdownView: MarkdownView, outcomeText: string): void {
        insertOutcomeText(markdownView, outcomeText);
    }

    onunload() {
        // Cleanup if needed in the future
    }
}
