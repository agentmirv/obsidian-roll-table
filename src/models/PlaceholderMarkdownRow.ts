import { IPlaceholderMarkdownRow } from './IPlaceholderMarkdownRow';
import { BaseMarkdownRow } from './BaseMarkdownRow';

export class PlaceholderMarkdownRow extends BaseMarkdownRow implements IPlaceholderMarkdownRow {
    public type: 'placeholder' = 'placeholder';
    
    constructor(cells: string[]) {
        super(cells);
    }

    get placeholder(): string {
        return this.cells[0];
    }
}