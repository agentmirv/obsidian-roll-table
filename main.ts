import { App, MarkdownView, Notice, Plugin } from 'obsidian';
import { IMarkdownTable } from './src/models/IMarkdownTable';
import { IPlaceholderMarkdownTable } from './src/models/IPlaceholderMarkdownTable';
import { Outcome } from './src/utils';
import { parseMarkdownTables, getOutcome, generateOutcomeString, insertOutcomeText } from './src/utils';
import { TableService } from './src/services/TableService';
import { IModalService } from './src/services/IModalService';
import { ModalService } from './src/services/ModalService';

export default class RollTablePlugin extends Plugin {
    private tableService: TableService;
    private modalService: IModalService;
    
    async onload() {
        this.tableService = new TableService(this.app);
        this.modalService = new ModalService(this.app);
        
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
            this.modalService.openTableSelectionModal(
                markdownView, 
                availableTables,
                (selectedTable: IMarkdownTable) => {
                    this.handleTableSelection(markdownView, availableTables, selectedTable.name);
                }
            );
        } catch (error) {
            console.error('Failed to process roll table command:', error);
            new Notice('Failed to process roll table command');
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

        insertOutcomeText(markdownView, outcomeText);
    }

    private async processTable(
        table: IMarkdownTable,
        tableName: string,
        markdownView: MarkdownView
    ): Promise<Outcome | null> {
        if (table.type === 'rolled') {
            return getOutcome(table);
        } else {
            return this.modalService.openPlaceholderSelectionModal(table, markdownView);
        }
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
    
    onunload() {
        // Cleanup if needed in the future
    }
}
