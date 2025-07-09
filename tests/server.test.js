const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const content = fs.readFileSync('src/server/websocket-server.ts', 'utf-8');

test('server checks auth token for API', () => {
  assert.ok(/authorization/i.test(content), 'Authorization header not used');
  assert.ok(content.includes('authToken'), 'authToken option missing');
});

test('server serves extension files', () => {
  assert.ok(content.includes("express.static('extension')"), 'extension static serving missing');
});
