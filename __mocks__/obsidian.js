// Mock for obsidian.js
module.exports = {
  MarkdownView: class {
    constructor() {}
    editor = {
      getCursor: jest.fn().mockReturnValue({ line: 0, ch: 0 }),
      replaceRange: jest.fn(),
      setCursor: jest.fn()
    }
  },
  Plugin: class {
    constructor() {}
    registerEvent() {}
    addCommand() {}
    addSettingTab() {}
  },
  addIcon: jest.fn(),
  Notice: jest.fn()
};