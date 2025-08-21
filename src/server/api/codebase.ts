import { Application, Request, Response, NextFunction } from 'express';
import { CodebaseAnalyzer } from '../codebase-analyzer';
import { KnowledgeStore } from '../knowledge-store';

interface Options { codeAnalyzer: CodebaseAnalyzer; knowledge: KnowledgeStore; aiManager?: any }

export function setupCodebaseAPI(app: Application, { codeAnalyzer, knowledge }: Options, authenticate: (req: Request, res: Response, next: NextFunction) => void) {
  let isWatching = false;

  app.post('/api/code/watch', authenticate, (_req: Request, res: Response) => {
    if (isWatching) return res.json({ started: true, message: 'Repository watching was already active' });
    try {
      codeAnalyzer.startWatching((changed) => {
        try {
          const summaries = codeAnalyzer.summarizeChanged(changed);
          knowledge.upsertMany(summaries);
        } catch (e) { console.error('Error processing changed files:', e); }
      });
      isWatching = true;
      res.json({ started: true });
    } catch (e) {
      res.status(500).json({ error: 'Failed to start code watching', details: String(e) });
    }
  });

  app.get('/api/code/knowledge', authenticate, (_req: Request, res: Response) => {
    try { res.json(knowledge.getStats()); } catch (e) { res.status(500).json({ error: 'Failed to retrieve knowledge statistics', details: String(e) }); }
  });

  app.get('/api/code/graph', authenticate, (_req: Request, res: Response) => {
    try { res.json(knowledge.getDependencyGraph()); } catch (e) { res.status(500).json({ error: 'Failed to retrieve dependency graph', details: String(e) }); }
  });
}