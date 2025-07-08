const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const content = fs.readFileSync('src/capture/log-capture.ts', 'utf-8');

test('supports custom log file path', () => {
  assert.ok(content.includes('constructor(logFilePath'), 'constructor parameter missing');
  assert.ok(content.includes('DEV_CONSOLE_LOG_FILE'), 'env var usage missing');
});

test('provides simulateConsoleLog helper', () => {
  assert.ok(content.includes('simulateConsoleLog'), 'simulateConsoleLog not found');
});
