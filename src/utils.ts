import { DiceRoller, Parser } from '@dice-roller/rpg-dice-roller';
import { MarkdownView } from 'obsidian';
import { IMarkdownRow, IMarkdownTable, IRolledMarkdownTable, IPlaceholderMarkdownTable } from './interfaces';
import { createMarkdownRow, createMarkdownTable } from './models';

export class Outcome {
    constructor(
        public tableName: string = '',
        public tableRoll: string = '',
        public diceRoll: string = '',
        public row: IMarkdownRow
    ) {}
}

export function parseMarkdownTables(content: string, filePath: string): Map<string, IMarkdownTable> {
    const tables = new Map<string, IMarkdownTable>();
    const tablePattern = /(^\|.*\|$\n^\|(?:[-:| ]+)\|$(?:\n^\|.*\|$)+)/gm;
    const headerSeparatorPattern = /^\|\s*(:?-+:?)\s*(\|\s*(:?-+:?)\s*)*\|$/;
    let tableMatch;

    while ((tableMatch = tablePattern.exec(content)) !== null) {
        const tableText = tableMatch[0];
        const tableLines = tableText.trim().split('\n');
        
        if (tableLines.length < 2) continue;
        
        if (!tableLines[1].trim().match(headerSeparatorPattern)) {
            continue;
        }

        const headerCells = parseTableRow(tableLines[0]);
        
        if (!headerCells[0] || !headerCells[1]) {
            continue;
        }

        let isRolledTable = false;
        try {
            Parser.parse(headerCells[0]);
            isRolledTable = true;
        } catch {
            isRolledTable = false;
        }

        const rows = tableLines.slice(2).map(line => createMarkdownRow(parseTableRow(line), isRolledTable));
        
        const table = createMarkdownTable(rows, headerCells, isRolledTable);
        table.name = headerCells[1];
        table.isValid = true;

        if (!tables.has(table.name)) {
            tables.set(table.name, table);
        } else {
            console.warn(`Duplicate table name "${table.name}" found in ${filePath}`);
        }
    }

    console.log(`Parsed ${tables.size} valid tables from ${filePath}`);
    return tables;
}

export function parseTableRow(rowText: string): string[] {
    return rowText.trim()
        .split('|')
        .slice(1, -1)
        .map(cell => cell.trim());
}

export function getOutcome(table: IRolledMarkdownTable): Outcome | null {
    try {
        const diceRoller = new DiceRoller();
        const diceResult = diceRoller.roll(table.roll);
        const rolledValue = Array.isArray(diceResult) ? diceResult[0].total : diceResult.total;
        console.debug(`Rolling ${table.roll} for table "${table.name}": got ${rolledValue}`);

        const matchingRow = table.rows.find(row => {
            if (row.type === 'rolled') {
                if (row.roll.includes('-')) {
                    const [minValue, maxValue] = row.roll.split('-').map(Number);
                    return rolledValue >= minValue && rolledValue <= maxValue;
                }
                return parseInt(row.roll) === rolledValue;
            }
            return false;
        });

        if (!matchingRow) {
            console.warn(`No matching outcome found for value ${rolledValue} in table "${table.name}"`);
            return null;
        }

        return new Outcome(
            table.name,
            table.roll,
            rolledValue.toString(),
            matchingRow
        );
    } catch (error) {
        console.error(`Error processing table "${table.name}":`, error);
        return null;
    }
}

export function generateOutcomeString(outcome: Outcome): string {
    if (!outcome.tableRoll && !outcome.diceRoll) {
        // This is a placeholder table outcome
        return outcome.row.value.trim() ? `${outcome.row.value}\n\n` : '';
    }
    // This is a rolled table outcome
    return `${outcome.tableName}\n${outcome.tableRoll}: ${outcome.diceRoll}\n${outcome.row.value}\n\n`;
}

export function insertOutcomeText(markdownView: MarkdownView, outcomeText: string) {
    const cursor = markdownView.editor.getCursor();
    markdownView.editor.replaceRange(outcomeText, cursor);
    
    const newCursor = {
        line: cursor.line + outcomeText.split('\n').length - 1,
        ch: outcomeText.split('\n').pop()?.length || 0
    };
    markdownView.editor.setCursor(newCursor);
}