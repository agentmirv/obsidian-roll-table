import { IBaseMarkdownRow } from './IBaseMarkdownRow';

export interface IRolledMarkdownRow extends IBaseMarkdownRow {
    type: 'rolled';
    roll: string;
}