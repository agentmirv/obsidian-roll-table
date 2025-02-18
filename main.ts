import { App, MarkdownView, Notice, Plugin, SuggestModal } from 'obsidian';
import { DiceRoller, Parser } from '@dice-roller/rpg-dice-roller';

// Insert interfaces after imports

interface IBaseMarkdownRow {
    cells: string[];
    value: string;
    nextTable: string;
}

interface IRolledMarkdownRow extends IBaseMarkdownRow {
    type: 'rolled';
    roll: string;
}

interface IPlaceholderMarkdownRow extends IBaseMarkdownRow {
    type: 'placeholder';
    placeholder: string;
}

type IMarkdownRow = IRolledMarkdownRow | IPlaceholderMarkdownRow;

interface IBaseMarkdownTable {
    name: string;
    isValid: boolean;
    rows: IMarkdownRow[];
}

interface IRolledMarkdownTable extends IBaseMarkdownTable {
    type: 'rolled';
    roll: string;
}

interface IPlaceholderMarkdownTable extends IBaseMarkdownTable {
    type: 'placeholder';
    placeholder: string;
}

type IMarkdownTable = IRolledMarkdownTable | IPlaceholderMarkdownTable;

// Remember to rename these classes and interfaces!

export default class RollTablePlugin extends Plugin {
    async onload() {
        this.addCommand({
            id: 'roll-table',
            name: 'Roll Table',
            checkCallback: (checking: boolean) => {
                const activeMarkdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
                
                if (!activeMarkdownView) {
                    return false;
                }

                if (!checking) {
                    this.handleRollTableCommand(activeMarkdownView);
                }

                return true;
            }
        });
    }

    private async handleRollTableCommand(markdownView: MarkdownView): Promise<void> {
        try {
            const availableTables = await this.getAllMarkdownTables();
            new TableSuggestModal(this.app, availableTables, (selectedTable: string) => {
                handleTableSelection(markdownView, availableTables, selectedTable);
            }).open();
        } catch (error) {
            console.error('Failed to process roll table command:', error);
            new Notice('Failed to process roll table command');
        }
    }

    async getAllMarkdownTables(): Promise<Map<string, IMarkdownTable>> {
        const markdownFiles = this.app.vault.getMarkdownFiles();
        const allTables = new Map<string, IMarkdownTable>();

        for (const file of markdownFiles) {
            try {
                const fileContent = await this.app.vault.read(file);
                const tablesInFile = parseMarkdownTables(fileContent, file.path);
                tablesInFile.forEach((table, tableName) => allTables.set(tableName, table));
            } catch (error) {
                console.error(`Failed to parse tables from ${file.path}:`, error);
            }
        }

        return allTables;
    }

    onunload() {
        // Cleanup if needed in the future
    }
}

class TableSuggestModal extends SuggestModal<string> {
	private tableNames: string[];
	private tables: Map<string, IMarkdownTable>;
	private onChoose: (item: string) => void;

	constructor(app: App, tables: Map<string, IMarkdownTable>, onChoose: (item: string) => void) {
		super(app);
		this.tables = tables;
		this.tableNames = Array.from(tables.keys());
		this.onChoose = onChoose;
		this.setPlaceholder('Select a table...');
	}

	private parseInternalLink(text: string): { file: string; heading: string } | null {
		// Match [[file#heading]] or [[file#heading|display name]]
		const match = text.match(/^\[\[([^#\]]+)#([^|\]]+)(?:\|[^\]]+)?\]\]$/);
		if (match) {
			return {
				file: match[1],
				heading: match[2]
			};
		}
		return null;
	}

	getSuggestions(query: string): string[] {
		// Return all suggestions that contain the query
		return this.tableNames.filter(name => name.toLowerCase().includes(query.toLowerCase()));
	}

	renderSuggestion(value: string, el: HTMLElement) {
		const linkInfo = this.parseInternalLink(value);
		if (linkInfo) {
			el.createEl('div', { 
				text: `${linkInfo.file} > ${linkInfo.heading}`,
				cls: 'suggestion-internal-link'
			});
		} else {
			el.createEl('div', { text: value });
		}
	}

	onChooseSuggestion(item: string, evt: MouseEvent | KeyboardEvent) {
		this.onChoose(item);
	}
}

class BaseMarkdownRow {
    constructor(public cells: string[]) {}

    get value() {
        return this.cells[1];
    }

    get nextTable() {
        return this.cells[2] || '';
    }
}

class RolledMarkdownRow extends BaseMarkdownRow implements IRolledMarkdownRow {
    public type: 'rolled' = 'rolled';
    
    constructor(cells: string[]) {
        super(cells);
    }

    get roll(): string {
        return this.cells[0];
    }
}

class PlaceholderMarkdownRow extends BaseMarkdownRow implements IPlaceholderMarkdownRow {
    public type: 'placeholder' = 'placeholder';
    
    constructor(cells: string[]) {
        super(cells);
    }

    get placeholder(): string {
        return this.cells[0];
    }
}

class BaseMarkdownTable {
    public name = '';
    public isValid = false;
    public rows: IMarkdownRow[] = [];

    constructor(rows: IMarkdownRow[]) {
        this.rows = rows;
    }
}

class RolledMarkdownTable extends BaseMarkdownTable implements IRolledMarkdownTable {
    public type: 'rolled' = 'rolled';
    public roll: string;

    constructor(rows: IMarkdownRow[], roll: string) {
        super(rows);
        this.roll = roll;
    }
}

class PlaceholderMarkdownTable extends BaseMarkdownTable implements IPlaceholderMarkdownTable {
    public type: 'placeholder' = 'placeholder';
    public placeholder: string;

    constructor(rows: IMarkdownRow[], placeholder: string) {
        super(rows);
        this.placeholder = placeholder;
    }
}

function createMarkdownRow(cells: string[]): IMarkdownRow {
    try {
        Parser.parse(cells[0]);
        return new RolledMarkdownRow(cells);
    } catch {
        return new PlaceholderMarkdownRow(cells);
    }
}

function createMarkdownTable(rows: IMarkdownRow[], headerCells: string[]): IMarkdownTable {
    try {
        Parser.parse(headerCells[0]);
        return new RolledMarkdownTable(rows, headerCells[0]);
    } catch {
        return new PlaceholderMarkdownTable(rows, headerCells[0]);
    }
}

class Outcome {
    constructor(
        public tableName: string = '',
        public tableRoll: string = '',
        public diceRoll: string = '',
        public row: IMarkdownRow
    ) {}
}

// Function to parse markdown tables
function parseMarkdownTables(content: string, filePath: string): Map<string, IMarkdownTable> {
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

        // Parse header row
        const headerCells = parseTableRow(tableLines[0]);
        
        // Skip if table name or roll/placeholder is empty
        if (!headerCells[0] || !headerCells[1]) {
            continue;
        }

        // Parse content rows (skip header and separator)
        const rows = tableLines.slice(2).map(line => createMarkdownRow(parseTableRow(line)));
        
        const table = createMarkdownTable(rows, headerCells);
        table.name = headerCells[1];
        table.isValid = true;

        // Add table if not duplicate
        if (!tables.has(table.name)) {
            tables.set(table.name, table);
        } else {
            console.warn(`Duplicate table name "${table.name}" found in ${filePath}`);
        }
    }

    console.log(`Parsed ${tables.size} valid tables from ${filePath}`);
    return tables;
}

// Helper function to parse table row cells
function parseTableRow(rowText: string): string[] {
    return rowText.trim()
        .split('|')
        .slice(1, -1)  // Remove first and last empty cells
        .map(cell => cell.trim());
}

function getOutcome(table: IRolledMarkdownTable): Outcome | null {
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
            return false; // Skip placeholder rows in rolled tables
        });

        if (!matchingRow) {
            console.warn(`No matching outcome found for value ${rolledValue} in table "${table.name}"`);
            return null;
        }

        return {
            tableName: table.name,
            tableRoll: table.roll,
            diceRoll: rolledValue.toString(),
            row: matchingRow as any // TODO: Update Outcome type to properly handle union types
        };
    } catch (error) {
        console.error(`Error processing table "${table.name}":`, error);
        return null;
    }
}

function generateOutcomeString(outcome: Outcome): string {
	console.log(`Selected table name: ${outcome.tableName}`);
	console.log(`Random die value: ${outcome.tableRoll}`);

	const outcomeString = `${outcome.tableName}\n${outcome.tableRoll}: ${outcome.diceRoll}\n${outcome.row.value}\n\n`;
    
	return outcomeString;
}

function handleTableSelection(markdownView: MarkdownView, tables: Map<string, IMarkdownTable>, selectedTableName: string) {
    const outcomes = new Map<string, Outcome>();
    let currentTableName = selectedTableName;
    let currentTable = tables.get(currentTableName);

    // Process tables and collect outcomes
    while (currentTable) {
        console.log(`Processing table: ${currentTableName}`);
        
        let outcome: Outcome | null = null;
        if (currentTable.type === 'rolled') {
            outcome = getOutcome(currentTable);
        } else {
            // Placeholder tables will be handled differently
            // TODO: Implement placeholder table outcome logic
            new Notice('Placeholder table processing not yet implemented');
            return;
        }
        
        if (!outcome) {
            new Notice('Failed to get outcome for table');
            return;
        }

        outcomes.set(currentTableName, outcome);
        currentTableName = outcome.row.nextTable;

        // Break if we've already processed this table (prevent infinite loops)
        if (outcomes.has(currentTableName)) {
            break;
        }

        currentTable = tables.get(currentTableName);
    }

    // Generate final outcome text
    let outcomeText = '';
    for (const outcome of outcomes.values()) {
        const outcomeString = generateOutcomeString(outcome);
        if (!outcomeString) {
            new Notice('Failed to generate outcome text');
            return;
        }
        outcomeText += outcomeString;
    }

    if (!outcomeText) {
        new Notice('No table selected.');
        return;
    }

    // Insert text at cursor position
    const cursor = markdownView.editor.getCursor();
    markdownView.editor.replaceRange(outcomeText, cursor);
    
    // Update cursor position to end of inserted text
    const newCursor = {
        line: cursor.line + outcomeText.split('\n').length - 1,
        ch: outcomeText.split('\n').pop()?.length || 0
    };
    markdownView.editor.setCursor(newCursor);
}
