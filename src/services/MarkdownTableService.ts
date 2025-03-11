import { IMarkdownRow } from '../models/IMarkdownRow';
import { IMarkdownTable } from '../models/IMarkdownTable';
import { RolledMarkdownRow } from '../models/RolledMarkdownRow';
import { PlaceholderMarkdownRow } from '../models/PlaceholderMarkdownRow';
import { RolledMarkdownTable } from '../models/RolledMarkdownTable';
import { PlaceholderMarkdownTable } from '../models/PlaceholderMarkdownTable';

export class MarkdownTableService {
    createMarkdownRow(cells: string[], isRolledTable: boolean): IMarkdownRow {
        if (isRolledTable) {
            return new RolledMarkdownRow(cells);
        }
        return new PlaceholderMarkdownRow(cells);
    }

    createMarkdownTable(rows: IMarkdownRow[], headerCells: string[], isRolledTable: boolean): IMarkdownTable {
        if (isRolledTable) {
            return new RolledMarkdownTable(rows, headerCells[0]);
        }
        return new PlaceholderMarkdownTable(rows, headerCells[0]);
    }
}