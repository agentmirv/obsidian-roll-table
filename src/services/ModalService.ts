import { App, MarkdownView } from 'obsidian';
import { IMarkdownTable } from '../models/IMarkdownTable';
import { IPlaceholderMarkdownTable } from '../models/IPlaceholderMarkdownTable';
import { IPlaceholderMarkdownRow } from '../models/IPlaceholderMarkdownRow';
import { Outcome } from '../utils';
import { IModalService } from './IModalService';
import { PlaceholderSuggestModal } from '../modals/PlaceholderSuggestModal';
import { TableSuggestModal } from '../modals/TableSuggestModal';

export class ModalService implements IModalService {
    private app: App;
    
    constructor(app: App) {
        this.app = app;
    }
    
    openTableSelectionModal(
        markdownView: MarkdownView,
        availableTables: Map<string, IMarkdownTable>,
        onTableSelected: (selectedTable: IMarkdownTable) => void
    ): void {
        new TableSuggestModal(this.app, availableTables, (selectedTable: IMarkdownTable) => {
            onTableSelected(selectedTable);
        }).open();
    }
    
    openPlaceholderSelectionModal(
        table: IPlaceholderMarkdownTable,
        markdownView: MarkdownView
    ): Promise<Outcome | null> {
        return new Promise((resolve) => {
            const placeholderRows = table.rows.filter((row): row is IPlaceholderMarkdownRow => 
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
}