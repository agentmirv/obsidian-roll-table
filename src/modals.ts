import { App, SuggestModal } from 'obsidian';
import { IMarkdownTable, IPlaceholderMarkdownRow } from './interfaces';

export class TableSuggestModal extends SuggestModal<string> {
	private tableNames: string[];
	private tables: Map<string, IMarkdownTable>;
	private onChoose: (item: string) => void;

	constructor(app: App, tables: Map<string, IMarkdownTable>, onChoose: (item: string) => void) {
		super(app);
		this.tables = tables;
		this.tableNames = Array.from(tables.keys());
		this.onChoose = onChoose;
		this.setPlaceholder('Select a table...');
	}

	private parseInternalLink(text: string): { file: string; heading: string } | null {
		const match = text.match(/^\[\[([^#\]]+)#([^|\]]+)(?:\|[^\]]+)?\]\]$/);
		if (match) {
			return {
				file: match[1],
				heading: match[2]
			};
		}
		return null;
	}

	getSuggestions(query: string): string[] {
		return this.tableNames.filter(name => name.toLowerCase().includes(query.toLowerCase()));
	}

	renderSuggestion(value: string, el: HTMLElement) {
		const linkInfo = this.parseInternalLink(value);
		if (linkInfo) {
			el.createEl('div', { 
				text: `${linkInfo.file} > ${linkInfo.heading}`,
				cls: 'suggestion-internal-link'
			});
		} else {
			el.createEl('div', { text: value });
		}
	}

	onChooseSuggestion(item: string, evt: MouseEvent | KeyboardEvent) {
		this.onChoose(item);
	}
}

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
            row.placeholder.toLowerCase().includes(query.toLowerCase()));
    }

    renderSuggestion(row: IPlaceholderMarkdownRow, el: HTMLElement) {
        el.createEl('div', { text: row.placeholder });
    }

    onChooseSuggestion(row: IPlaceholderMarkdownRow, evt: MouseEvent | KeyboardEvent) {
        this.onChoose(row);
    }
}