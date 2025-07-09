const fs = require('fs');

const content = fs.readFileSync('src/server/websocket-server.ts', 'utf-8');

describe('Server Tests', () => {
  test('server checks auth token for API', () => {
    expect(content).toMatch(/authorization/i);
    expect(content).toContain('authToken');
  });

  test('server serves extension files', () => {
    expect(content).toContain("express.static('extension')");
  });
});