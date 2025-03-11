import { IBaseMarkdownRow } from './IBaseMarkdownRow';

export interface IPlaceholderMarkdownRow extends IBaseMarkdownRow {
    type: 'placeholder';
    placeholder: string;
}