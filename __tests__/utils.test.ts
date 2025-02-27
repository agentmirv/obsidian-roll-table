import { isValidDiceRoll } from '../src/utils';
import { Parser } from '@dice-roller/rpg-dice-roller';

// Mock the Parser class from @dice-roller/rpg-dice-roller
jest.mock('@dice-roller/rpg-dice-roller', () => {
  return {
    Parser: {
      parse: jest.fn((expression) => {
        // Simple mock implementation that validates some basic dice expressions
        if (expression.match(/^d\d+$/) || expression.match(/^\d+d\d+$/)) {
          return true; // Valid expressions like "d6", "d20", "2d6"
        } else if (expression === '') {
          throw new Error('Empty expression');
        } else if (expression === 'invalid') {
          throw new Error('Invalid dice notation');
        }
        return true; // Default to true for other expressions in this simple test
      })
    },
    DiceRoller: jest.fn()
  };
});

describe('isValidDiceRoll', () => {
  beforeEach(() => {
    // Clear mock history before each test
    jest.clearAllMocks();
  });

  test('should return true for valid dice expressions', () => {
    // Test valid dice expressions
    expect(isValidDiceRoll('d20')).toBe(true);
    expect(isValidDiceRoll('2d6')).toBe(true);
    expect(Parser.parse).toHaveBeenCalledTimes(2);
  });

  test('should return false for invalid dice expressions', () => {
    // Test invalid dice expressions
    expect(isValidDiceRoll('')).toBe(false);
    expect(isValidDiceRoll('invalid')).toBe(false);
    expect(Parser.parse).toHaveBeenCalledTimes(2);
  });
});