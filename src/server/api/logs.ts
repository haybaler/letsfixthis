import { Application, Request, Response, NextFunction } from 'express';
import { LogCapture } from '../../capture/log-capture';
import { ConsoleLog } from '../../types';

interface Options { logCapture: LogCapture; options?: { watchMode?: boolean; outputFile?: string } }

export function setupLogsAPI(app: Application, { logCapture }: Options, authenticate: (req: Request, res: Response, next: NextFunction) => void) {
  app.get('/api/logs', authenticate, async (_req: Request, res: Response) => {
    const logs = await logCapture.getCurrentLogs();
    res.json(logs);
  });

  app.post('/api/logs', authenticate, async (req: Request, res: Response) => {
    try {
      const log: ConsoleLog = req.body;
      await logCapture.addLog(log);
      res.json({ success: true });
    } catch {
      res.status(400).json({ error: 'Invalid log payload' });
    }
  });

  app.post('/api/logs/batch', authenticate, async (req: Request, res: Response) => {
    try {
      const logs: ConsoleLog[] = (req.body && req.body.logs) || [];
      let count = 0;
      for (const l of logs) { await logCapture.addLog(l); count++; }
      res.json({ success: true, count });
    } catch {
      res.status(400).json({ error: 'Invalid batch logs payload' });
    }
  });

  app.delete('/api/logs', authenticate, async (_req: Request, res: Response) => {
    await logCapture.clearLogs();
    res.json({ success: true });
  });
}