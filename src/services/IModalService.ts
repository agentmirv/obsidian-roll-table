import { MarkdownView } from 'obsidian';
import { IMarkdownTable } from '../models/IMarkdownTable';
import { IPlaceholderMarkdownTable } from '../models/IPlaceholderMarkdownTable';
import { Outcome } from '../utils';

export interface IModalService {
    openTableSelectionModal(
        markdownView: MarkdownView, 
        availableTables: Map<string, IMarkdownTable>,
        onChoose: (table: IMarkdownTable) => void
    ): void;
    
    openPlaceholderSelectionModal(
        table: IPlaceholderMarkdownTable,
        markdownView: MarkdownView
    ): Promise<Outcome | null>;
}