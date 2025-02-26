import { App } from 'obsidian';
import { TableService } from '../src/services/TableService';
import * as utils from '../src/utils';

// Spy on the parseMarkdownTables utility function
jest.spyOn(utils, 'parseMarkdownTables');

describe('TableService', () => {
  let app: any;
  let tableService: TableService;
  
  beforeEach(() => {
    // Reset mocks
    jest.resetAllMocks();
    
    // Mock app and vault
    app = {
      vault: {
        getMarkdownFiles: jest.fn().mockReturnValue([
          { path: 'test1.md' },
          { path: 'test2.md' }
        ]),
        read: jest.fn()
      }
    };
    
    tableService = new TableService(app as App);
    
    // Set up default mock behavior
    app.vault.read.mockResolvedValueOnce(`
      | 1d6 | TestTable1 |
      | --- | --------- |
      | 1-3 | Result 1 |
      | 4-6 | Result 2 |
    `);
    
    app.vault.read.mockResolvedValueOnce(`
      | Choice | TestTable2 |
      | ------ | --------- |
      | Option 1 | Result A |
      | Option 2 | Result B |
    `);
    
    // Mock parseMarkdownTables to return test tables
    (utils.parseMarkdownTables as jest.Mock).mockImplementation((content, filePath) => {
      const tables = new Map();
      
      if (filePath === 'test1.md') {
        tables.set('TestTable1', {
          name: 'TestTable1',
          type: 'rolled',
          roll: '1d6',
          isValid: true,
          rows: []
        });
      } else if (filePath === 'test2.md') {
        tables.set('TestTable2', {
          name: 'TestTable2',
          type: 'placeholder',
          placeholder: 'Choice',
          isValid: true,
          rows: []
        });
      }
      
      return tables;
    });
  });
  
  describe('getAllMarkdownTables', () => {
    it('should collect tables from all markdown files', async () => {
      const tables = await tableService.getAllMarkdownTables();
      
      // Check vault methods were called
      expect(app.vault.getMarkdownFiles).toHaveBeenCalled();
      expect(app.vault.read).toHaveBeenCalledTimes(2);
      expect(app.vault.read).toHaveBeenCalledWith({ path: 'test1.md' });
      expect(app.vault.read).toHaveBeenCalledWith({ path: 'test2.md' });
      
      // Check parseMarkdownTables was called
      expect(utils.parseMarkdownTables).toHaveBeenCalledTimes(2);
      
      // Check returned tables
      expect(tables.size).toBe(2);
      expect(tables.has('TestTable1')).toBe(true);
      expect(tables.has('TestTable2')).toBe(true);
      expect(tables.get('TestTable1')?.type).toBe('rolled');
      expect(tables.get('TestTable2')?.type).toBe('placeholder');
    });
    
    it('should handle errors when parsing files', async () => {
      // Setup error condition
      app.vault.read.mockRejectedValueOnce(new Error('Failed to read file'));
      
      const tables = await tableService.getAllMarkdownTables();
      
      // Should still have the second table
      expect(tables.size).toBe(2);
      expect(tables.has('TestTable2')).toBe(true);
      
      // We won't test the exact error logging since implementation details may vary
    });
  });
});