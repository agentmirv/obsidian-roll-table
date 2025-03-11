import { IMarkdownRow } from './IMarkdownRow';

export interface IBaseMarkdownTable {
    name: string;
    isValid: boolean;
    rows: IMarkdownRow[];
}