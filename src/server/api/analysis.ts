import { Application, Request, Response, NextFunction } from 'express';
import { AIProviderManager } from '../../ai/ai-provider';
import { LogCapture } from '../../capture/log-capture';
import { ConsoleLog } from '../../types';
import { generateSuggestions } from '../../suggestions';

interface Options { aiManager: AIProviderManager; logCapture: LogCapture }

export function setupAnalysisAPI(app: Application, { aiManager, logCapture }: Options, authenticate: (req: Request, res: Response, next: NextFunction) => void) {
  // GET /api/analyze
  app.get('/api/analyze', authenticate, async (req: Request, res: Response) => {
    const provider = (req.query.provider as string) || 'all';
    const format = (req.query.format as string) || 'json';
    const logs = await logCapture.getCurrentLogs();

    try {
      if (provider === 'all') {
        const analyses = await aiManager.analyzeWithAll(logs);
        return res.json({ timestamp: new Date().toISOString(), total_logs: logs.length, analyses: Object.fromEntries(analyses) });
      }
      const prov = aiManager.getProvider(provider);
      if (!prov || !prov.isAvailable()) {
        return res.status(400).json({ error: `Provider '${provider}' not available`, available: aiManager.getAvailableProviders() });
      }
      const analysis = await prov.analyze(logs);
      return res.json(analysis);
    } catch (e) {
      return res.status(500).json({ error: 'Analysis failed', details: String(e) });
    }
  });

  // GET /api/agent-info/:agent
  app.get('/api/agent-info/:agent', authenticate, async (req: Request, res: Response) => {
    const agent = req.params.agent;
    const aiProvider = (req.query.ai_provider as string) || 'auto';
    const logs = await logCapture.getCurrentLogs();

    try {
      if (aiProvider === 'auto') {
        const analysis = await aiManager.getBestAnalysis(logs);
        const payload = generateAgentInfo(logs, agent, analysis || undefined);
        return res.json(payload);
      } else {
        const provider = aiManager.getProvider(aiProvider);
        if (!provider || !provider.isAvailable()) {
          return res.status(400).json({ error: `AI provider '${aiProvider}' not available`, available: aiManager.getAvailableProviders() });
        }
        const formatted = await provider.formatForAgent(logs, agent);
        return res.json(JSON.parse(formatted));
      }
    } catch (e) {
      return res.status(500).json({ error: 'Failed to generate agent info', details: String(e) });
    }
  });
}

// Helper function to generate agent-specific information
function generateAgentInfo(logs: ConsoleLog[], agent: string, analysis?: any): any {
  const baseInfo = {
    timestamp: new Date().toISOString(),
    agent,
    console_data: {
      errors: logs.filter(log => log.level === 'error'),
      warnings: logs.filter(log => log.level === 'warn'),
      logs: logs.filter(log => log.level === 'log'),
      network_errors: logs.filter(log => log.type === 'network'),
      stack_traces: logs.filter(log => log.stack).map(log => log.stack)
    },
    suggestions: generateSuggestions(logs)
  };
  return analysis ? { ...baseInfo, ai_analysis: analysis } : baseInfo;
}
