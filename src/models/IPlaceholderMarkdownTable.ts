import { IBaseMarkdownTable } from './IBaseMarkdownTable';

export interface IPlaceholderMarkdownTable extends IBaseMarkdownTable {
    type: 'placeholder';
    placeholder: string;
}