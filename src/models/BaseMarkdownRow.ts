import { IBaseMarkdownRow } from './IBaseMarkdownRow';

export class BaseMarkdownRow implements IBaseMarkdownRow {
    constructor(public cells: string[]) {}

    get value() {
        return this.cells[1];
    }

    get nextTable() {
        return this.cells[2] || '';
    }
}