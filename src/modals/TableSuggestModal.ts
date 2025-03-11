import { App, SuggestModal } from 'obsidian';
import { IMarkdownTable } from '../models/IMarkdownTable';

export class TableSuggestModal extends SuggestModal<IMarkdownTable> {
	private tables: Map<string, IMarkdownTable>;
	private onChoose: (item: IMarkdownTable) => void;

	constructor(app: App, tables: Map<string, IMarkdownTable>, onChoose: (item: IMarkdownTable) => void) {
		super(app);
		this.tables = tables;
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

	getSuggestions(query: string): IMarkdownTable[] {
		return Array.from(this.tables.values()).filter(table => 
			table.name.toLowerCase().includes(query.toLowerCase()));
	}

	renderSuggestion(table: IMarkdownTable, el: HTMLElement) {
		const linkInfo = this.parseInternalLink(table.name);
		if (linkInfo) {
			el.createEl('div', { 
				text: `${linkInfo.file} > ${linkInfo.heading}`,
				cls: 'suggestion-internal-link'
			});
		} else {
			el.createEl('div', { text: table.name });
		}

		// Add additional table info
		if (table.type === 'rolled') {
			el.createEl('small', { text: `Roll: ${table.roll}` });
		} else if (table.type === 'placeholder') {
			el.createEl('small', { text: `Select: ${table.placeholder}` });
		}
	}

	onChooseSuggestion(table: IMarkdownTable, evt: MouseEvent | KeyboardEvent) {
		this.onChoose(table);
	}
}