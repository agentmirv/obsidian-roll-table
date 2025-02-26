import { isValidDiceRoll, parseMarkdownTables, parseTableRow, getOutcome, generateOutcomeString, insertOutcomeText, Outcome } from '../src/utils';
import { MarkdownView } from 'obsidian';
import { IRolledMarkdownTable, IRolledMarkdownRow } from '../src/interfaces';

// Mock the dice roller library
jest.mock('@dice-roller/rpg-dice-roller', () => {
  return {
    Parser: {
      parse: jest.fn((expression) => {
        if (expression === 'invalid') {
          throw new Error('Invalid expression');
        }
        return { result: true };
      })
    },
    DiceRoller: jest.fn().mockImplementation(() => {
      return {
        roll: jest.fn((expression) => {
          return {
            total: expression === '1d6' ? 3 : 10
          };
        })
      };
    })
  };
});

describe('Utils', () => {
  describe('isValidDiceRoll', () => {
    it('should return true for valid dice expressions', () => {
      expect(isValidDiceRoll('1d6')).toBe(true);
      expect(isValidDiceRoll('2d10+5')).toBe(true);
    });

    it('should return false for invalid dice expressions', () => {
      expect(isValidDiceRoll('invalid')).toBe(false);
    });
  });

  describe('parseTableRow', () => {
    it('should parse a markdown table row correctly', () => {
      const rowText = '| header1 | header2 | header3 |';
      const result = parseTableRow(rowText);
      expect(result).toEqual(['header1', 'header2', 'header3']);
    });

    it('should trim whitespace from cells', () => {
      const rowText = '|  value1  |  value2  |  value3  |';
      const result = parseTableRow(rowText);
      expect(result).toEqual(['value1', 'value2', 'value3']);
    });
  });

  describe('parseMarkdownTables', () => {
    it('should parse valid markdown tables', () => {
      const content = `
| 1d6 | TestTable |
| --- | --------- |
| 1-3 | Result 1  |
| 4-6 | Result 2  |
      `;
      const tables = parseMarkdownTables(content, 'test.md');
      expect(tables.size).toBe(1);
      expect(tables.has('TestTable')).toBe(true);
      
      const table = tables.get('TestTable');
      expect(table?.name).toBe('TestTable');
      expect(table?.type).toBe('rolled');
      if (table?.type === 'rolled') {
        expect(table.roll).toBe('1d6');
        expect(table.rows.length).toBe(2);
        expect(table.rows[0].type).toBe('rolled');
        if (table.rows[0].type === 'rolled') {
          expect(table.rows[0].roll).toBe('1-3');
          expect(table.rows[0].value).toBe('Result 1');
        }
      }
    });

    it('should ignore invalid tables', () => {
      const content = `
| Column1 |
| ------- |
| No header separator |
      `;
      const tables = parseMarkdownTables(content, 'test.md');
      expect(tables.size).toBe(0);
    });
  });

  describe('getOutcome', () => {
    it('should return correct outcome for a dice roll', () => {
      const table: IRolledMarkdownTable = {
        name: 'TestTable',
        type: 'rolled',
        roll: '1d6',
        isValid: true,
        rows: [
          {
            type: 'rolled',
            roll: '1-3',
            cells: ['1-3', 'Result 1'],
            value: 'Result 1',
            nextTable: ''
          },
          {
            type: 'rolled',
            roll: '4-6',
            cells: ['4-6', 'Result 2'],
            value: 'Result 2',
            nextTable: ''
          }
        ]
      };

      const outcome = getOutcome(table);
      expect(outcome).not.toBeNull();
      if (outcome) {
        expect(outcome.tableName).toBe('TestTable');
        expect(outcome.tableRoll).toBe('1d6');
        expect(outcome.diceRoll).toBe('3');
        expect(outcome.row.value).toBe('Result 1');
      }
    });

    it('should return null if no matching row is found', () => {
      const table: IRolledMarkdownTable = {
        name: 'TestTable',
        type: 'rolled',
        roll: '1d6',
        isValid: true,
        rows: [
          {
            type: 'rolled',
            roll: '10-20',
            cells: ['10-20', 'No Match'],
            value: 'No Match',
            nextTable: ''
          }
        ]
      };

      const outcome = getOutcome(table);
      expect(outcome).toBeNull();
    });
  });

  describe('generateOutcomeString', () => {
    it('should generate proper string for rolled outcomes', () => {
      const row: IRolledMarkdownRow = {
        type: 'rolled',
        roll: '1-3',
        cells: ['1-3', 'Result 1'],
        value: 'Result 1',
        nextTable: ''
      };
      
      const outcome = new Outcome('TestTable', '1d6', '3', row);
      const result = generateOutcomeString(outcome);
      expect(result).toBe('TestTable\n1d6: 3\nResult 1\n\n');
    });

    it('should generate proper string for placeholder outcomes', () => {
      const row: IRolledMarkdownRow = {
        type: 'rolled',
        roll: '',
        cells: ['', 'Placeholder Result'],
        value: 'Placeholder Result',
        nextTable: ''
      };
      
      const outcome = new Outcome('TestTable', '', '', row);
      const result = generateOutcomeString(outcome);
      expect(result).toBe('Placeholder Result\n\n');
    });
  });

  describe('insertOutcomeText', () => {
    it('should insert text at cursor position and update cursor', () => {
      const mockEditor = {
        getCursor: jest.fn().mockReturnValue({ line: 5, ch: 10 }),
        replaceRange: jest.fn(),
        setCursor: jest.fn()
      };
      
      const mockView = {
        editor: mockEditor
      } as unknown as MarkdownView;
      
      const outcomeText = 'Test Outcome\nSecond Line';
      
      insertOutcomeText(mockView, outcomeText);
      
      expect(mockEditor.getCursor).toHaveBeenCalled();
      expect(mockEditor.replaceRange).toHaveBeenCalledWith(outcomeText, { line: 5, ch: 10 });
      expect(mockEditor.setCursor).toHaveBeenCalledWith({
        line: 6,
        ch: 11
      });
    });
  });
});