import { App, SuggestModal } from 'obsidian';
import { IPlaceholderMarkdownRow } from '../models/IPlaceholderMarkdownRow';

export class PlaceholderSuggestModal extends SuggestModal<IPlaceholderMarkdownRow> {
    private rows: IPlaceholderMarkdownRow[];
    private onChoose: (item: IPlaceholderMarkdownRow) => void;

    constructor(app: App, placeholder: string, rows: IPlaceholderMarkdownRow[], onChoose: (item: IPlaceholderMarkdownRow) => void) {
        super(app);
        this.rows = rows;
        this.onChoose = onChoose;
        this.setPlaceholder(placeholder);
    }

    getSuggestions(query: string): IPlaceholderMarkdownRow[] {
        return this.rows.filter(row => 
            row.placeholder.toLowerCase().includes(query.toLowerCase())
        );
    }

    renderSuggestion(row: IPlaceholderMarkdownRow, el: HTMLElement) {
        el.createEl('div', { text: row.placeholder });
    }

    onChooseSuggestion(row: IPlaceholderMarkdownRow, evt: MouseEvent | KeyboardEvent) {
        this.onChoose(row);
    }
}