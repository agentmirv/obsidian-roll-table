import { IMarkdownRow } from './IMarkdownRow';
import { IPlaceholderMarkdownTable } from './IPlaceholderMarkdownTable';
import { BaseMarkdownTable } from './BaseMarkdownTable';

export class PlaceholderMarkdownTable extends BaseMarkdownTable implements IPlaceholderMarkdownTable {
    public type: 'placeholder' = 'placeholder';

    constructor(rows: IMarkdownRow[], public placeholder: string) {
        super(rows);
    }
}