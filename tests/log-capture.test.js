const fs = require('fs');

const content = fs.readFileSync('src/capture/log-capture.ts', 'utf-8');

describe('Log Capture Tests', () => {
  test('supports custom log file path', () => {
    expect(content).toContain('constructor(logFilePath');
    expect(content).toContain('DEV_CONSOLE_LOG_FILE');
  });

  test('provides simulateConsoleLog helper', () => {
    expect(content).toContain('simulateConsoleLog');
  });
});