// Mock implementation for Obsidian API
class EventEmitter {
  on() { return this; }
  off() { return this; }
  trigger() { return this; }
}

class App {
  workspace = {
    getActiveViewOfType: jest.fn()
  };
  vault = {
    getMarkdownFiles: jest.fn().mockReturnValue([]),
    read: jest.fn().mockResolvedValue('')
  };
}

class MarkdownView {
  editor = {
    getCursor: jest.fn().mockReturnValue({ line: 0, ch: 0 }),
    replaceRange: jest.fn(),
    setCursor: jest.fn()
  };
}

class Plugin extends EventEmitter {
  app = new App();
  manifest = { id: 'test-plugin', name: 'Test Plugin' };
  addCommand = jest.fn();
}

class Notice {
  constructor(message) {
    this.message = message;
  }
}

module.exports = {
  App,
  MarkdownView,
  Plugin,
  Notice
};