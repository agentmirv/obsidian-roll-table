export interface IBaseMarkdownRow {
    cells: string[];
    value: string;
    nextTable: string;
}

export interface IRolledMarkdownRow extends IBaseMarkdownRow {
    type: 'rolled';
    roll: string;
}

export interface IPlaceholderMarkdownRow extends IBaseMarkdownRow {
    type: 'placeholder';
    placeholder: string;
}

export type IMarkdownRow = IRolledMarkdownRow | IPlaceholderMarkdownRow;

export interface IBaseMarkdownTable {
    name: string;
    isValid: boolean;
    rows: IMarkdownRow[];
}

export interface IRolledMarkdownTable extends IBaseMarkdownTable {
    type: 'rolled';
    roll: string;
}

export interface IPlaceholderMarkdownTable extends IBaseMarkdownTable {
    type: 'placeholder';
    placeholder: string;
}

export type IMarkdownTable = IRolledMarkdownTable | IPlaceholderMarkdownTable;