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
							new SampleSuggestModal(this.app, tables, (item: string) => {
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

class SampleSuggestModal extends SuggestModal<string> {
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

	getSuggestions(query: string): string[] {
		// Return all suggestions that contain the query
		return this.tableNames.filter(name => name.toLowerCase().includes(query.toLowerCase()));
	}

	renderSuggestion(value: string, el: HTMLElement) {
		el.createEl('div', { text: value });
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
			tables.set(`${filePath} - ${table.name}`, table);
			console.log('Added a table to the map.');
		} else {
			console.log('Table not added due to missing header, roll, or name.');
		}
	}
	console.log(`Parsed ${tables.size} tables in file: ${filePath}`);
	return tables;
}

function generateOutcomeString(selectedTable: MarkdownTable): string | null {
	const tableName = selectedTable.name;
	console.log(`Selected table name: ${tableName}`);

	// Generate a random die value based on the roll column header
	const tableRoll = selectedTable.roll; // Use the roll property
	const diceRoller = new DiceRoller();
	const rollResult = diceRoller.roll(tableRoll);
	const diceRoll = Array.isArray(rollResult) ? rollResult[0].total : rollResult.total;
	console.log(`Random die value: ${diceRoll}`);

	// Set dieValues to the values of the first column
	const outcomeRolls = selectedTable.rows.map(row => row.roll); // Use the roll getter
	console.log(`Die values: ${outcomeRolls}`);

	let dieIndex = -1;
	for (let i = 0; i < outcomeRolls.length; i++) {
		const value = outcomeRolls[i];
		if (value.includes('-')) {
			const [min, max] = value.split('-').map(Number);
			if (diceRoll >= min && diceRoll <= max) {
				dieIndex = i;
				break;
			}
		} else if (parseInt(value) === diceRoll) {
			dieIndex = i;
			break;
		}
	}

	if (dieIndex === -1) {
		console.log('No matching die value found.');
		return null;
	}

	console.log(`Die index: ${dieIndex}`);
	const outcomeRow = selectedTable.rows[dieIndex];
	const outcome = outcomeRow.value; // Use the value getter
	console.log(`Outcome: ${outcome}`);

	const outcomeString = `${tableName}\n${tableRoll}: ${diceRoll}\n${outcome}\n`;
	return outcomeString;
}

function handleTableSelection(markdownView: MarkdownView, tables: Map<string, MarkdownTable>, item: string) {
	const selectTable = tables.get(item);
	if (selectTable) {
		const outcomeString = generateOutcomeString(selectTable);
		if (outcomeString) {
			const cursor = markdownView.editor.getCursor();
			markdownView.editor.replaceRange(outcomeString, cursor);
			const newCursor = {
				line: cursor.line + outcomeString.split('\n').length - 1,
				ch: outcomeString.split('\n').pop()?.length || 0
			};
			markdownView.editor.setCursor(newCursor);
		} else {
			new Notice('No matching die value found.');
		}
	} else {
		new Notice('No table selected.');
	}
}