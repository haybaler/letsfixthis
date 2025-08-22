import { Application, Request, Response, NextFunction } from 'express';
import { CodebaseAnalyzer } from '../codebase-analyzer';
import { KnowledgeStore } from '../knowledge-store';

interface Options { codeAnalyzer: CodebaseAnalyzer; knowledge: KnowledgeStore; aiManager?: any }

export function setupCodebaseAPI(app: Application, { codeAnalyzer, knowledge }: Options, authenticate: (req: Request, res: Response, next: NextFunction) => void) {
  let isWatching = false;

  app.post('/api/code/watch', authenticate, (_req: Request, res: Response) => {
    if (isWatching) {
      res.json({ started: true, message: 'Repository watching was already active' });
      return;
    }
    try {
      codeAnalyzer.startWatching((changed) => {
        try {
          const summaries = codeAnalyzer.summarizeChanged(changed);
          knowledge.upsertMany(summaries);
        } catch (e) { console.error('Error processing changed files:', e); }
      });
      isWatching = true;
      res.json({ started: true });
      return;
    } catch (e) {
      res.status(500).json({ error: 'Failed to start code watching', details: String(e) });
      return;
    }
  });

  app.get('/api/code/knowledge', authenticate, (_req: Request, res: Response) => {
    try {
      res.json(knowledge.getStats());
      return;
    } catch (e) {
      res.status(500).json({ error: 'Failed to retrieve knowledge statistics', details: String(e) });
      return;
    }
  });

  app.get('/api/code/graph', authenticate, (_req: Request, res: Response) => {
    try {
      res.json(knowledge.getDependencyGraph());
      return;
    } catch (e) {
      res.status(500).json({ error: 'Failed to retrieve dependency graph', details: String(e) });
      return;
    }
  });
}