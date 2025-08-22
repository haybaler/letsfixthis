import { Application, Request, Response, NextFunction } from 'express';

type Fn<T=any> = () => T;
interface Options {
  getAnalytics?: Fn<any>;
  getHealthScore?: Fn<any>;
  getPerformanceMetrics?: Fn<any>;
  createCollaborationSession?: (name: string) => any;
  getCollaborationSessions?: Fn<any[]>;
  getSessionInfo?: (id: string) => any;
  getSystemStats?: Fn<any>;
  getCacheStats?: Fn<any>;
}

export function setupAdvancedAPI(app: Application, opts: Options, authenticate: (req: Request, res: Response, next: NextFunction) => void) {
  const notImplemented = (res: Response) => res.status(501).json({ error: 'Not Implemented' });

  app.get('/api/advanced/analytics', authenticate, (_req, res) => {
    if (opts.getAnalytics) {
      res.json(opts.getAnalytics());
      return;
    }
    notImplemented(res);
    return;
  });

  app.get('/api/advanced/health', authenticate, (_req, res) => {
    if (opts.getHealthScore) {
      res.json({ score: opts.getHealthScore() });
      return;
    }
    notImplemented(res);
    return;
  });

  app.get('/api/advanced/perf', authenticate, (_req, res) => {
    if (opts.getPerformanceMetrics) {
      res.json(opts.getPerformanceMetrics());
      return;
    }
    notImplemented(res);
    return;
  });

  app.post('/api/collaboration/session', authenticate, (req, res) => {
    const name = (req.body && req.body.name) || 'Session';
    if (opts.createCollaborationSession) {
      res.json(opts.createCollaborationSession(name));
      return;
    }
    notImplemented(res);
    return;
  });

  app.get('/api/collaboration/sessions', authenticate, (_req, res) => {
    if (opts.getCollaborationSessions) {
      res.json(opts.getCollaborationSessions());
      return;
    }
    notImplemented(res);
    return;
  });

  app.get('/api/collaboration/session/:id', authenticate, (req, res) => {
    const id = req.params.id;
    if (opts.getSessionInfo) {
      res.json(opts.getSessionInfo(id));
      return;
    }
    notImplemented(res);
    return;
  });

  app.get('/api/system', authenticate, (_req, res) => {
    if (opts.getSystemStats) {
      res.json(opts.getSystemStats());
      return;
    }
    notImplemented(res);
    return;
  });

  app.get('/api/cache', authenticate, (_req, res) => {
    if (opts.getCacheStats) {
      res.json(opts.getCacheStats());
      return;
    }
    notImplemented(res);
    return;
  });
}