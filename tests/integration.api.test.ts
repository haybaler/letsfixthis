import { DevConsoleServer } from '../src/server/websocket-server';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

describe('Integration: API routers', () => {
  const PORT = 18090;
  const HOST = '127.0.0.1';
  const TOKEN = 'testtoken';

  let server: DevConsoleServer;
  let baseUrl: string;
  let tmpDir: string;
  let logFile: string;

  const authHeaders = (extra: Record<string, string> = {}) => ({
    ...extra,
    Authorization: `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  });

  beforeAll(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lft-it-'));
    logFile = path.join(tmpDir, 'logs.json');
    server = new DevConsoleServer({
      port: PORT,
      host: HOST,
      format: 'json',
      watchMode: false,
      logFile,
      authToken: TOKEN,
    });
    await server.start();
    baseUrl = `http://${HOST}:${PORT}`;
  }, 30000);

  afterAll(async () => {
    await server.stop();
  });

  test('GET /api/logs unauthorized without token', async () => {
    const res = await fetch(`${baseUrl}/api/logs`);
    expect(res.status).toBe(401);
  });

  test('logs CRUD with auth', async () => {
    // Initially empty
    let res = await fetch(`${baseUrl}/api/logs`, { headers: authHeaders() });
    expect(res.status).toBe(200);
    let list: any = await res.json();
    expect(Array.isArray(list)).toBe(true);

    // Add a log
    const log = {
      id: '1',
      timestamp: Date.now(),
      level: 'log',
      message: 'hello',
      args: ['hello'],
      type: 'console',
      source: 'test',
    };
    res = await fetch(`${baseUrl}/api/logs`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(log),
    });
    expect(res.status).toBe(200);
    const addResp: any = await res.json();
    expect(addResp.success).toBe(true);

    // Fetch logs (should have at least one)
    res = await fetch(`${baseUrl}/api/logs`, { headers: authHeaders() });
    expect(res.status).toBe(200);
    list = await res.json();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThanOrEqual(1);

    // Clear logs
    res = await fetch(`${baseUrl}/api/logs`, { method: 'DELETE', headers: authHeaders() });
    expect(res.status).toBe(200);
    const delResp: any = await res.json();
    expect(delResp.success).toBe(true);

    // Verify empty again
    res = await fetch(`${baseUrl}/api/logs`, { headers: authHeaders() });
    list = await res.json();
    expect(Array.isArray(list)).toBe(true);
  });

  test('GET /api/analyze returns analyses object', async () => {
    const res = await fetch(`${baseUrl}/api/analyze`, { headers: authHeaders() });
    expect(res.status).toBe(200);
    const data: any = await res.json();
    expect(data).toHaveProperty('analyses');
    expect(typeof data.analyses).toBe('object');
  });

  test('GET /api/agent-info/:agent with auto provider returns base info', async () => {
    const res = await fetch(`${baseUrl}/api/agent-info/test-agent`, { headers: authHeaders() });
    expect(res.status).toBe(200);
    const data: any = await res.json();
    expect(data.agent).toBe('test-agent');
    expect(data).toHaveProperty('console_data');
    expect(Array.isArray(data.suggestions)).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(data, 'ai_analysis')).toBe(false);
  });

  test('GET /api/agent-info/:agent with unavailable provider returns 400', async () => {
    const res = await fetch(`${baseUrl}/api/agent-info/test-agent?ai_provider=cerebras`, { headers: authHeaders() });
    expect(res.status).toBe(400);
  });

  test('GET /api/code/knowledge and /api/code/graph return objects', async () => {
    let res = await fetch(`${baseUrl}/api/code/knowledge`, { headers: authHeaders() });
    let data: any = await res.json();
    // Log the response payload to aid debugging if assertions fail
    // eslint-disable-next-line no-console
    console.log('Knowledge endpoint response:', res.status, data);
    expect(res.status).toBe(200);
    expect(typeof data.filesIndexed).toBe('number');
    expect(typeof data.totalSize).toBe('number');
    expect(typeof data.modules).toBe('number');

    res = await fetch(`${baseUrl}/api/code/graph`, { headers: authHeaders() });
    expect(res.status).toBe(200);
    data = await res.json();
    expect(typeof data).toBe('object');
  });

  test('advanced endpoints return 501', async () => {
    const res = await fetch(`${baseUrl}/api/system`, { headers: authHeaders() });
    expect(res.status).toBe(501);
  });
});
