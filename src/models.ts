import { IBaseMarkdownRow, IMarkdownRow, IRolledMarkdownRow, IPlaceholderMarkdownRow, IMarkdownTable, IRolledMarkdownTable, IPlaceholderMarkdownTable } from './interfaces';
import { Parser } from '@dice-roller/rpg-dice-roller';

export class BaseMarkdownRow {
    constructor(public cells: string[]) {}

    get value() {
        return this.cells[1];
    }

    get nextTable() {
        return this.cells[2] || '';
    }
}

export class RolledMarkdownRow extends BaseMarkdownRow implements IRolledMarkdownRow {
    public type: 'rolled' = 'rolled';
    
    constructor(cells: string[]) {
        super(cells);
    }

    get roll(): string {
        return this.cells[0];
    }
}

export class PlaceholderMarkdownRow extends BaseMarkdownRow implements IPlaceholderMarkdownRow {
    public type: 'placeholder' = 'placeholder';
    
    constructor(cells: string[]) {
        super(cells);
    }

    get placeholder(): string {
        return this.cells[0];
    }
}

export class BaseMarkdownTable {
    public name = '';
    public isValid = false;
    public rows: IMarkdownRow[] = [];

    constructor(rows: IMarkdownRow[]) {
        this.rows = rows;
    }
}

export class RolledMarkdownTable extends BaseMarkdownTable implements IRolledMarkdownTable {
    public type: 'rolled' = 'rolled';

    constructor(rows: IMarkdownRow[], public roll: string) {
        super(rows);
    }
}

export class PlaceholderMarkdownTable extends BaseMarkdownTable implements IPlaceholderMarkdownTable {
    public type: 'placeholder' = 'placeholder';

    constructor(rows: IMarkdownRow[], public placeholder: string) {
        super(rows);
    }
}

export function createMarkdownRow(cells: string[], isRolledTable: boolean): IMarkdownRow {
    if (isRolledTable) {
        return new RolledMarkdownRow(cells);
    }
    return new PlaceholderMarkdownRow(cells);
}

export function createMarkdownTable(rows: IMarkdownRow[], headerCells: string[], isRolledTable: boolean): IMarkdownTable {
    if (isRolledTable) {
        return new RolledMarkdownTable(rows, headerCells[0]);
    }
    return new PlaceholderMarkdownTable(rows, headerCells[0]);
}