import { IBaseMarkdownTable } from './IBaseMarkdownTable';

export interface IRolledMarkdownTable extends IBaseMarkdownTable {
    type: 'rolled';
    roll: string;
}