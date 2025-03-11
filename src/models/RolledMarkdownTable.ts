import { IMarkdownRow } from './IMarkdownRow';
import { IRolledMarkdownTable } from './IRolledMarkdownTable';
import { BaseMarkdownTable } from './BaseMarkdownTable';

export class RolledMarkdownTable extends BaseMarkdownTable implements IRolledMarkdownTable {
    public type: 'rolled' = 'rolled';

    constructor(rows: IMarkdownRow[], public roll: string) {
        super(rows);
    }
}