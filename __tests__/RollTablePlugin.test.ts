import { App, MarkdownView, Plugin, Notice } from 'obsidian';
import RollTablePlugin from '../main';
import { TableService } from '../src/services/TableService';
import * as utils from '../src/utils';
import { IMarkdownTable, IRolledMarkdownTable } from '../src/interfaces';

// Mock the TableSuggestModal class
jest.mock('../src/modals', () => {
  return {
    TableSuggestModal: jest.fn().mockImplementation(() => {
      return {
        open: jest.fn().mockImplementation(function() {
          // Simulate selecting a table by calling the callback
          setTimeout(() => {
            this.onChooseItem({
              name: 'TestTable',
              type: 'rolled'
            });
          }, 0);
        }),
        onChooseItem: jest.fn()
      };
    }),
    PlaceholderSuggestModal: jest.fn().mockImplementation(() => {
      return {
        open: jest.fn().mockImplementation(function() {
          // Simulate selecting a placeholder row
          setTimeout(() => {
            this.onChooseItem({
              type: 'placeholder',
              value: 'Selected Option',
              cells: ['Option', 'Selected Option'],
              nextTable: ''
            });
          }, 0);
        }),
        onChooseItem: jest.fn()
      };
    })
  };
});

describe('RollTablePlugin', () => {
  let plugin: RollTablePlugin;
  let mockApp: any;
  let mockWorkspace: any;
  let mockTableService: any;
  let mockMarkdownView: any;
  
  beforeEach(() => {
    // Reset mocks
    jest.resetAllMocks();
    jest.useFakeTimers();
    
    // Mock Obsidian app
    mockWorkspace = {
      getActiveViewOfType: jest.fn()
    };
    
    mockApp = {
      workspace: mockWorkspace
    } as unknown as App;
    
    // Create test plugin instance
    plugin = new RollTablePlugin(mockApp, {
      id: 'obsidian-roll-table',
      name: 'Roll Table'
    } as any);
    
    // Mock the table service
    mockTableService = {
      getAllMarkdownTables: jest.fn()
    };
    (plugin as any).tableService = mockTableService;
    
    // Mock MarkdownView
    mockMarkdownView = {
      app: mockApp,
      editor: {
        getCursor: jest.fn().mockReturnValue({ line: 0, ch: 0 }),
        replaceRange: jest.fn(),
        setCursor: jest.fn()
      }
    } as unknown as MarkdownView;
    
    // Default mock for getAllMarkdownTables
    mockTableService.getAllMarkdownTables.mockResolvedValue(new Map([
      ['TestTable', {
        name: 'TestTable',
        type: 'rolled',
        roll: '1d6',
        isValid: true,
        rows: [
          {
            type: 'rolled',
            roll: '1-3',
            cells: ['1-3', 'First result'],
            value: 'First result',
            nextTable: ''
          },
          {
            type: 'rolled',
            roll: '4-6',
            cells: ['4-6', 'Second result'],
            value: 'Second result',
            nextTable: ''
          }
        ]
      } as IRolledMarkdownTable]
    ]));
    
    // Mock getOutcome
    jest.spyOn(utils, 'getOutcome').mockImplementation((table: IRolledMarkdownTable) => {
      return {
        tableName: table.name,
        tableRoll: table.roll,
        diceRoll: '3',
        row: table.rows[0]
      };
    });
    
    // Mock generateOutcomeString
    jest.spyOn(utils, 'generateOutcomeString').mockImplementation((outcome) => {
      return `${outcome.tableName}\n${outcome.tableRoll}: ${outcome.diceRoll}\n${outcome.row.value}\n\n`;
    });
    
    // Mock insertOutcomeText
    jest.spyOn(utils, 'insertOutcomeText').mockImplementation(() => {});
  });
  
  afterEach(() => {
    jest.useRealTimers();
  });
  
  describe('onload', () => {
    it('should initialize the table service and register commands', async () => {
      const addCommandSpy = jest.spyOn(plugin, 'addCommand');
      
      await plugin.onload();
      
      expect(addCommandSpy).toHaveBeenCalledWith(expect.objectContaining({
        id: 'roll-table',
        name: 'Roll Table'
      }));
    });
  });
  
  describe('handleRollTableCommand', () => {
    it('should open table selection modal with available tables', async () => {
      // Set up the active view
      mockWorkspace.getActiveViewOfType.mockReturnValue(mockMarkdownView);
      
      // Need to call onload first to initialize
      await plugin.onload();
      
      // Call the command callback directly
      const command = (plugin as any).commands.find((cmd: any) => cmd.id === 'roll-table');
      await command.checkCallback(false);
      
      // Check that getAllMarkdownTables was called
      expect(mockTableService.getAllMarkdownTables).toHaveBeenCalled();
      
      // Fast-forward timers to process the TableSuggestModal callbacks
      jest.runAllTimers();
      
      // Verify that getOutcome was called with the test table
      expect(utils.getOutcome).toHaveBeenCalledWith(expect.objectContaining({
        name: 'TestTable'
      }));
      
      // Verify that insertOutcomeText was called with markdown view
      expect(utils.insertOutcomeText).toHaveBeenCalledWith(
        mockMarkdownView,
        expect.any(String)
      );
    });
    
    it('should handle errors gracefully', async () => {
      // Set up the active view
      mockWorkspace.getActiveViewOfType.mockReturnValue(mockMarkdownView);
      
      // Mock an error being thrown
      mockTableService.getAllMarkdownTables.mockRejectedValue(new Error('Test error'));
      
      // Spy on console.error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Need to call onload first to initialize
      await plugin.onload();
      
      // Call the command callback directly
      const command = (plugin as any).commands.find((cmd: any) => cmd.id === 'roll-table');
      await command.checkCallback(false);
      
      // Check error handling
      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy.mock.calls[0][0]).toBe('Failed to process roll table command:');
      
      // Reset spies
      consoleSpy.mockRestore();
    });
  });
  
  describe('processTableChain', () => {
    it('should handle table chains correctly', async () => {
      // Set up linked tables
      const tables = new Map<string, IMarkdownTable>([
        ['FirstTable', {
          name: 'FirstTable',
          type: 'rolled',
          roll: '1d6',
          isValid: true,
          rows: [{
            type: 'rolled',
            roll: '1-6',
            cells: ['1-6', 'First result'],
            value: 'First result',
            nextTable: 'SecondTable'
          }]
        } as IRolledMarkdownTable],
        ['SecondTable', {
          name: 'SecondTable',
          type: 'rolled',
          roll: '1d4',
          isValid: true,
          rows: [{
            type: 'rolled',
            roll: '1-4',
            cells: ['1-4', 'Second result'],
            value: 'Second result',
            nextTable: ''
          }]
        } as IRolledMarkdownTable]
      ]);
      
      // Update the mocked outcome to include nextTable
      (utils.getOutcome as jest.Mock).mockImplementation((table: IRolledMarkdownTable) => {
        if (table.name === 'FirstTable') {
          return {
            tableName: table.name,
            tableRoll: table.roll,
            diceRoll: '3',
            row: {
              type: 'rolled',
              roll: '1-6',
              cells: ['1-6', 'First result'],
              value: 'First result',
              nextTable: 'SecondTable'
            }
          };
        } else {
          return {
            tableName: table.name,
            tableRoll: table.roll,
            diceRoll: '2',
            row: {
              type: 'rolled',
              roll: '1-4',
              cells: ['1-4', 'Second result'],
              value: 'Second result',
              nextTable: ''
            }
          };
        }
      });
      
      // Need to call onload first to initialize the plugin
      await plugin.onload();
      
      // Call processTableChain directly
      const outcomes = await (plugin as any).processTableChain(tables, 'FirstTable', mockMarkdownView);
      
      // Check both tables were processed
      expect(outcomes.size).toBe(2);
      expect(outcomes.has('FirstTable')).toBe(true);
      expect(outcomes.has('SecondTable')).toBe(true);
      
      // Check getOutcome was called twice for the two tables
      expect(utils.getOutcome).toHaveBeenCalledTimes(2);
    });
    
    it('should handle cyclical references', async () => {
      // Set up tables with a cyclical reference
      const tables = new Map<string, IMarkdownTable>([
        ['LoopTable1', {
          name: 'LoopTable1',
          type: 'rolled',
          roll: '1d6',
          isValid: true,
          rows: [{
            type: 'rolled',
            roll: '1-6',
            cells: ['1-6', 'First result'],
            value: 'First result',
            nextTable: 'LoopTable2'
          }]
        } as IRolledMarkdownTable],
        ['LoopTable2', {
          name: 'LoopTable2',
          type: 'rolled',
          roll: '1d4',
          isValid: true,
          rows: [{
            type: 'rolled',
            roll: '1-4',
            cells: ['1-4', 'Second result'],
            value: 'Second result',
            nextTable: 'LoopTable1'
          }]
        } as IRolledMarkdownTable]
      ]);
      
      // Mock outcomes to create a loop
      let callCount = 0;
      (utils.getOutcome as jest.Mock).mockImplementation((table: IRolledMarkdownTable) => {
        if (table.name === 'LoopTable1') {
          return {
            tableName: table.name,
            tableRoll: table.roll,
            diceRoll: '3',
            row: {
              type: 'rolled',
              roll: '1-6',
              cells: ['1-6', 'First result'],
              value: 'First result',
              nextTable: 'LoopTable2'
            }
          };
        } else {
          return {
            tableName: table.name,
            tableRoll: table.roll,
            diceRoll: '2',
            row: {
              type: 'rolled',
              roll: '1-4',
              cells: ['1-4', 'Second result'],
              value: 'Second result',
              nextTable: 'LoopTable1'
            }
          };
        }
      });
      
      // Need to call onload first to initialize
      await plugin.onload();
      
      // Call processTableChain directly
      const outcomes = await (plugin as any).processTableChain(tables, 'LoopTable1', mockMarkdownView);
      
      // Should break out of the loop after detecting the cyclical reference
      expect(outcomes.size).toBe(2);
      expect(outcomes.has('LoopTable1')). toBe(true);
      expect(outcomes.has('LoopTable2')).toBe(true);
    });
  });
});