import { IRolledMarkdownRow } from './IRolledMarkdownRow';
import { BaseMarkdownRow } from './BaseMarkdownRow';

export class RolledMarkdownRow extends BaseMarkdownRow implements IRolledMarkdownRow {
    public type: 'rolled' = 'rolled';
    
    constructor(cells: string[]) {
        super(cells);
    }

    get roll(): string {
        return this.cells[0];
    }
}