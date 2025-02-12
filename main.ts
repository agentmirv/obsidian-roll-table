import { App, MarkdownView, Notice, Plugin, SuggestModal } from 'obsidian';
import { DiceRoller, Parser } from '@dice-roller/rpg-dice-roller';

// Remember to rename these classes and interfaces!

export default class MyPlugin extends Plugin {

	async onload() {
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'roll-table',
			name: 'Roll Table',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						this.getAllMarkdownTables().then(tables => {
							new TableSuggestModal(this.app, tables, (item: string) => {
								handleTableSelection(markdownView, tables, item);
							}).open();
						});
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});
	}

	async getAllMarkdownTables(): Promise<Map<string, MarkdownTable>> {
		const files = this.app.vault.getMarkdownFiles();
		const tables = new Map<string, MarkdownTable>();

		for (const file of files) {
			const content = await this.app.vault.read(file);
			const fileTables = parseMarkdownTables(content, file.path);
			fileTables.forEach((table, name) => tables.set(name, table));
		}

		return tables;
	}

	onunload() {

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
	public Row: MarkdownRow;
}

// Function to parse markdown tables
function parseMarkdownTables(text: string, filePath: string): Map<string, MarkdownTable> {
	console.log(`Parsing markdown tables in file: ${filePath}`);
	const tableRegex = /(^\|.*\|$\n^\|(?:[-:| ]+)\|$(?:\n^\|.*\|$)+)/gm;
	const tables = new Map<string, MarkdownTable>();
	let match;

	while ((match = tableRegex.exec(text)) !== null) {
		console.log('Found a table match.');

		const tableText = match[0];
		const rowTexts = tableText.trim().split('\n');
		const headerSeparatorRegex = /^\|\s*(:?-+:?)\s*(\|\s*(:?-+:?)\s*)*\|$/;
		let rows: MarkdownRow[] = [];
		const table = new MarkdownTable(rows);

		// Check if the table has a header row
		if (rowTexts.length > 1 && rowTexts[1].trim().match(headerSeparatorRegex)) {
			console.log('Table has a header row.');
			console.log(`Header row match: ${rowTexts[0]}`);
			const headerRow = new MarkdownRow(rowTexts[0].trim().split('|').slice(1, -1).map(cellText => cellText.trim()));
			table.roll = headerRow.roll; // Use the roll getter
			table.name = headerRow.value; // Use the value getter
			try {
				Parser.parse(table.roll);
				table.isValid = true;
			} catch (error) {
				table.isValid = false;
			}
			rowTexts.splice(0, 2); // Remove header row and separator row
		} else {
			console.log('Table does not have a header row.');
		}

		// Process the remaining rows
		rows = rowTexts.map(rowText => {
			console.log(`Row match: ${rowText}`);
			const cells = rowText.trim().split('|').slice(1, -1).map(cellText => cellText.trim());
			return new MarkdownRow(cells);
		});

		table.rows = rows;

		// Only add the table if it has a header and its roll and name are not blank or empty strings
		if (table.isValid && table.roll && table.name) {
			if (tables.has(table.name)) {
				console.log(`Table with name ${table.name} already exists. Skipping.`);
			} else {
				tables.set(table.name, table);
				console.log('Added a table to the map.');
			}
		} else {
			console.log('Table not added due to missing header, roll, or name.');
		}
	}
	console.log(`Parsed ${tables.size} tables in file: ${filePath}`);
	return tables;
}

// Renamed and refactored function: returns an Outcome instance populated with table data
function getOutcome(table: MarkdownTable): Outcome | null {
	const tableRoll = table.roll;
	const diceRoller = new DiceRoller();
	const rollResult = diceRoller.roll(tableRoll);
	const diceRoll = Array.isArray(rollResult) ? rollResult[0].total : rollResult.total;

	const outcomeRolls = table.rows.map(row => row.roll);
	
	let dieIndex = outcomeRolls.findIndex(value => {
		if (value.includes('-')) {
			const [min, max] = value.split('-').map(Number);
			return diceRoll >= min && diceRoll <= max;
		}
		return parseInt(value) === diceRoll;
	});

	if (dieIndex === -1) {
		return null;
	}

	const outcomeRow = table.rows[dieIndex];
	const outcome = new Outcome();
	outcome.tableName = table.name;
	outcome.tableRoll = tableRoll;
	outcome.diceRoll = diceRoll.toString();
	outcome.Row = outcomeRow;
	return outcome;
}

function generateOutcomeString(outcome: Outcome): string {
	const tableName = outcome.tableName;
	console.log(`Selected table name: ${tableName}`);

	const tableRoll = outcome.tableRoll;
	console.log(`Random die value: ${tableRoll}`);

	const outcomeString = `${tableName}\n${tableRoll}: ${outcome.diceRoll}\n${outcome.Row.value}\n\n`;
	return outcomeString;
}

function handleTableSelection(markdownView: MarkdownView, tables: Map<string, MarkdownTable>, item: string) {
	let outcomeMap = new Map<string, Outcome>();
	let nextTable = item;
	let selectTable = tables.get(nextTable);
	console.log(selectTable);
	
	while (selectTable) {
		console.log(selectTable.name + ':' + selectTable.roll);
		let outcome = getOutcome(selectTable);
		if (outcome) {
			outcomeMap.set(nextTable, outcome);
			nextTable = outcome.Row.nextTable;
			
			if (!outcomeMap.has(nextTable)) {
				console.log(nextTable);
				selectTable = tables.get(nextTable);
			} else {
				break;
			}
		} else {
			new Notice('No matching die value found.');
			break;
		}
	}

	let finalOutcomeString = '';
	for (const outcome of outcomeMap.values()) {
		console.log(outcome);
		const outcomeString = generateOutcomeString(outcome);
		if (outcomeString) {
			finalOutcomeString += outcomeString;
		} else {
			new Notice('No matching die value found.');
			return;
		}
	}

	if (finalOutcomeString) {
		const cursor = markdownView.editor.getCursor();
		markdownView.editor.replaceRange(finalOutcomeString, cursor);
		const newCursor = {
			line: cursor.line + finalOutcomeString.split('\n').length - 1,
			ch: finalOutcomeString.split('\n').pop()?.length || 0
		};
		markdownView.editor.setCursor(newCursor);
	} else {
		new Notice('No table selected.');
	}
}
