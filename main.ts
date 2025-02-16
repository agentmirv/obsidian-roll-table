import { App, MarkdownView, Notice, Plugin, SuggestModal } from 'obsidian';
import { DiceRoller, Parser } from '@dice-roller/rpg-dice-roller';

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

    async getAllMarkdownTables(): Promise<Map<string, MarkdownTable>> {
        const markdownFiles = this.app.vault.getMarkdownFiles();
        const allTables = new Map<string, MarkdownTable>();

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
	private tables: Map<string, MarkdownTable>;
	private onChoose: (item: string) => void;

	constructor(app: App, tables: Map<string, MarkdownTable>, onChoose: (item: string) => void) {
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

class MarkdownRow {
	constructor(public cells: string[]) {}

	get roll() {
		return this.cells[0];
	}

	get value() {
		return this.cells[1];
	}

	get nextTable() {
		return this.cells[2] || '';
	}
}

class MarkdownTable {
	public roll = '';
	public name = '';
	public isValid = false;
	public rows: MarkdownRow[];

	constructor(rows: MarkdownRow[]) {
		this.rows = rows;
	}
}

class Outcome {
	public tableName = '';
	public tableRoll = '';
	public diceRoll = '';
	public row: MarkdownRow;
}

// Function to parse markdown tables
function parseMarkdownTables(content: string, filePath: string): Map<string, MarkdownTable> {
    const tables = new Map<string, MarkdownTable>();
    const tablePattern = /(^\|.*\|$\n^\|(?:[-:| ]+)\|$(?:\n^\|.*\|$)+)/gm;
    const headerSeparatorPattern = /^\|\s*(:?-+:?)\s*(\|\s*(:?-+:?)\s*)*\|$/;
    let tableMatch;

    while ((tableMatch = tablePattern.exec(content)) !== null) {
        const tableText = tableMatch[0];
        const tableLines = tableText.trim().split('\n');
        
        // Skip tables with less than 2 rows (need header + separator at minimum)
        if (tableLines.length < 2) continue;

        const table = new MarkdownTable([]);
        
        // Validate table has proper header separator
        if (!tableLines[1].trim().match(headerSeparatorPattern)) {
            continue;
        }

        // Parse header row
        const headerCells = parseTableRow(tableLines[0]);
        table.roll = headerCells[0];
        table.name = headerCells[1];

        // Validate table roll expression
        try {
            Parser.parse(table.roll);
            table.isValid = true;
        } catch (error) {
            console.warn(`Invalid roll expression in table "${table.name}" in ${filePath}`);
            continue;
        }

        // Skip if table name or roll is empty
        if (!table.roll || !table.name) {
            continue;
        }

        // Parse content rows (skip header and separator)
        table.rows = tableLines.slice(2).map(line => new MarkdownRow(parseTableRow(line)));

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

function getOutcome(table: MarkdownTable): Outcome | null {
    try {
        const diceRoller = new DiceRoller();
        const diceResult = diceRoller.roll(table.roll);
        const rolledValue = Array.isArray(diceResult) ? diceResult[0].total : diceResult.total;
        
        console.debug(`Rolling ${table.roll} for table "${table.name}": got ${rolledValue}`);

        const matchingRow = table.rows.find(row => {
            const rollValue = row.roll;
            if (rollValue.includes('-')) {
                const [minValue, maxValue] = rollValue.split('-').map(Number);
                return rolledValue >= minValue && rolledValue <= maxValue;
            }
            return parseInt(rollValue) === rolledValue;
        });

        if (!matchingRow) {
            console.warn(`No matching outcome found for roll ${rolledValue} in table "${table.name}"`);
            return null;
        }

        return {
            tableName: table.name,
            tableRoll: table.roll,
            diceRoll: rolledValue.toString(),
            row: matchingRow
        };
    } catch (error) {
        console.error(`Error processing roll for table "${table.name}":`, error);
        return null;
    }
}

function generateOutcomeString(outcome: Outcome): string {
	console.log(`Selected table name: ${outcome.tableName}`);
	console.log(`Random die value: ${outcome.tableRoll}`);

	const outcomeString = `${outcome.tableName}\n${outcome.tableRoll}: ${outcome.diceRoll}\n${outcome.row.value}\n\n`;
    
	return outcomeString;
}

function handleTableSelection(markdownView: MarkdownView, tables: Map<string, MarkdownTable>, selectedTableName: string) {
    const outcomes = new Map<string, Outcome>();
    let currentTableName = selectedTableName;
    let currentTable = tables.get(currentTableName);

    // Process tables and collect outcomes
    while (currentTable) {
        console.log(`Processing table: ${currentTableName}`);
        const outcome = getOutcome(currentTable);
        
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
