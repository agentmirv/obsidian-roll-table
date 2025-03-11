import { IBaseMarkdownTable } from './IBaseMarkdownTable';
import { IMarkdownRow } from './IMarkdownRow';

export class BaseMarkdownTable implements IBaseMarkdownTable {
    public name = '';
    public isValid = false;
    public rows: IMarkdownRow[] = [];

    constructor(rows: IMarkdownRow[]) {
        this.rows = rows;
    }
}