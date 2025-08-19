import * as WebSocket from 'ws';
import * as http from 'http';
import express from 'express';
import cors from 'cors';
import { version as pkgVersion } from '../../package.json';
import { ConsoleLog, ServerOptions } from '../types';
import { LogCapture } from '../capture/log-capture';
import { OutputFormatter } from '../output/formatter';
import { ServiceDiscovery } from './discovery';
import { generateSuggestions } from '../suggestions';
import { AIProviderManager } from '../ai/ai-provider';
import { VercelAIProvider } from '../ai/vercel-ai-provider';
import { CerebrusProvider } from '../ai/cerebrus-provider';
import { OpenAIDevProvider } from '../ai/openai-dev-provider';
import { CodebaseAnalyzer } from './codebase-analyzer';
import { KnowledgeStore } from './knowledge-store';
import { GithubScanner } from './github-scanner';

export class DevConsoleServer {
  private wss: WebSocket.Server | null = null;
  private server: http.Server | null = null;
  private app: express.Application;
  private logCapture: LogCapture;
  private formatter: OutputFormatter;
  private options: ServerOptions;
  private aiManager: AIProviderManager;
  private codeAnalyzer: CodebaseAnalyzer;
  private knowledge: KnowledgeStore;

  constructor(options: ServerOptions) {
    this.options = options;
    this.app = express();
    this.logCapture = new LogCapture(options.logFile);
    this.formatter = new OutputFormatter(options.format);
    
    // Initialize AI providers
    this.aiManager = new AIProviderManager();
    this.aiManager.registerProvider(new VercelAIProvider());
    this.aiManager.registerProvider(new CerebrusProvider());
    this.aiManager.registerProvider(new OpenAIDevProvider());
    
    this.setupExpress();
    this.codeAnalyzer = new CodebaseAnalyzer({ rootDir: process.cwd() });
    this.knowledge = new KnowledgeStore();
  }

  private setupExpress(): void {
    const corsOptions = this.options.corsOrigin ? { origin: this.options.corsOrigin } : {};
    this.app.use(cors(corsOptions));
    this.app.use(express.json());

    // Serve static demo and assets from project root
    this.app.use(express.static('.'));

    // Authentication middleware function
    const authenticate = (req: express.Request, res: express.Response, next: express.NextFunction) => {
      if (this.options.authToken) {
        const authHeader = req.headers['authorization'] as string | undefined;
        const token = authHeader?.replace('Bearer ', '') || (req.query.token as string | undefined);
        if (token !== this.options.authToken) {
          res.status(401).json({ error: 'Unauthorized' });
          return;
        }
      }
      next();
    };

    // API endpoints
    this.app.get('/api/logs', authenticate, async (req, res) => {
      try {
        const logs = await this.logCapture.getCurrentLogs();
        res.json(logs);
      } catch (error) {
        res.status(500).json({ error: 'Failed to get logs' });
      }
    });

    this.app.post('/api/logs', authenticate, (req, res) => {
      const log: ConsoleLog = req.body;
      this.logCapture.addLog(log);
      
      if (this.options.watchMode) {
        this.handleNewLog(log);
      }
      
      res.json({ success: true });
    });

    this.app.delete('/api/logs', authenticate, async (req, res) => {
      try {
        await this.logCapture.clearLogs();
        res.json({ success: true, message: 'Logs cleared' });
      } catch (error) {
        res.status(500).json({ error: 'Failed to clear logs' });
      }
    });

    this.app.get('/api/agent-info/:agent', authenticate, async (req, res) => {
      try {
        const logs = await this.logCapture.getCurrentLogs();
        const aiProvider = req.query.ai_provider as string || 'auto';
        
        let agentInfo: any;
        
        if (aiProvider === 'auto') {
          const analysis = await this.aiManager.getBestAnalysis(logs);
          agentInfo = this.generateAgentInfo(logs, req.params.agent, analysis);
        } else {
          const provider = this.aiManager.getProvider(aiProvider);
          if (provider && provider.isAvailable()) {
            const formatted = await provider.formatForAgent(logs, req.params.agent);
            agentInfo = JSON.parse(formatted);
          } else {
            agentInfo = this.generateAgentInfo(logs, req.params.agent);
          }
        }
        
        res.json(agentInfo);
      } catch (error) {
        res.status(500).json({ error: 'Failed to generate agent info' });
      }
    });
    
    // Discovery endpoint
    this.app.get('/api/discovery', (req, res) => {
      res.json({
        service: 'letsfixthis',
        version: pkgVersion,
        port: this.options.port,
        host: this.options.host || '0.0.0.0',
        ai_providers: this.aiManager.getAvailableProviders()
      });
    });

    // AI analysis endpoint
    this.app.get('/api/analyze', authenticate, async (req, res) => {
      try {
        const logs = await this.logCapture.getCurrentLogs();
        const provider = req.query.provider as string || 'all';
        
        if (provider === 'all') {
          const analyses = await this.aiManager.analyzeWithAll(logs);
          res.json({
            timestamp: new Date().toISOString(),
            total_logs: logs.length,
            analyses: Object.fromEntries(analyses)
          });
        } else {
          const aiProvider = this.aiManager.getProvider(provider);
          if (!aiProvider || !aiProvider.isAvailable()) {
            res.status(400).json({ error: `AI provider '${provider}' not available` });
            return;
          }
          
          const analysis = await aiProvider.analyze(logs);
          res.json(analysis);
        }
      } catch (error) {
        res.status(500).json({ error: 'Failed to analyze logs' });
      }
    });

    // Codebase guardrails endpoints (v1)
    this.app.post('/api/code/analyze', authenticate, (req, res) => {
      const { files } = req.body || {};
      if (!files || !Array.isArray(files)) {
        res.status(400).json({ error: 'Missing files array' });
        return;
      }
      const summaries = this.codeAnalyzer.summarizeChanged(files);
      this.knowledge.upsertMany(summaries);
      res.json({ summaries });
    });

    this.app.post('/api/code/watch', authenticate, (req, res) => {
      this.codeAnalyzer.startWatching((changed) => {
        const summaries = this.codeAnalyzer.summarizeChanged(changed);
        this.knowledge.upsertMany(summaries);
        // In future, forward to Cerebrus/OpenAI for deep analysis
        console.log('Code changed:', summaries.map(s => s.filePath));
      });
      res.json({ watching: true });
    });

    this.app.get('/api/code/knowledge', authenticate, (_req, res) => {
      res.json({ stats: this.knowledge.getStats(), files: this.knowledge.getAll() });
    });

    this.app.get('/api/code/graph', authenticate, (_req, res) => {
      res.json({ graph: this.knowledge.getDependencyGraph() });
    });
    this.app.post('/api/guardrails/validate-plan', authenticate, (req, res) => {
      const { plan, files } = req.body || {};
      if (!plan) {
        res.status(400).json({ error: 'Missing plan' });
        return;
      }
      // Minimal heuristic validation; future: integrate deep provider
      const risks: string[] = [];
      if (/delete\s+database|drop\s+table/i.test(plan)) risks.push('Potential destructive database operation');
      if (/remove\s+auth|disable\s+auth/i.test(plan)) risks.push('Potential security/authentication risk');
      const score = Math.min(1, risks.length * 0.3);
      res.json({ ok: risks.length === 0, risk_score: score, risks, mitigations: [] });
    });

    this.app.post('/api/guardrails/validate-diff', authenticate, (req, res) => {
      const { diff, files } = req.body || {};
      if (!diff) {
        res.status(400).json({ error: 'Missing diff' });
        return;
      }
      const risks: string[] = [];
      if (/console\.log\(/.test(diff)) risks.push('Debug statements left in code');
      if (/any\b/.test(diff)) risks.push('Loosening TypeScript types with any');
      const score = Math.min(1, risks.length * 0.2);
      res.json({ ok: risks.length === 0, risk_score: score, risks, mitigations: [] });
    });

    this.app.get('/api/github/diff', authenticate, (_req, res) => {
      const diff = GithubScanner.getLocalDiff();
      res.json(diff);
    });

    // Code review endpoint (Cerebrus)
    this.app.post('/api/code/review', authenticate, async (req, res) => {
      try {
        const { diff, plan, files } = req.body || {};
        const summaries = files && Array.isArray(files) ? this.codeAnalyzer.summarizeChanged(files) : [];
        const cerebrus = this.aiManager.getProvider('cerebrus') as any;
        if (!cerebrus || !cerebrus.isAvailable || !cerebrus.isAvailable()) {
          res.status(400).json({ error: 'Cerebrus provider not available' });
          return;
        }
        const review = await cerebrus.analyzeCodeReview({ summaries, diff, plan });
        this.knowledge.addReview({ review, diffLength: (diff||'').length, files: files?.length || 0 });
        res.json(review);
      } catch (e) {
        res.status(500).json({ error: 'Review failed' });
      }
    });
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const host = this.options.host || '0.0.0.0';
        this.server = this.app.listen(this.options.port, host, async () => {
          this.setupWebSocket();
          
          // Register server for discovery
          await ServiceDiscovery.registerServer({
            port: this.options.port,
            host: host,
            pid: process.pid,
            startTime: Date.now()
          });
          
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  private setupWebSocket(): void {
    if (!this.server) return;
    
    this.wss = new WebSocket.Server({
      server: this.server,
      verifyClient: (info, done) => {
        if (this.options.authToken) {
          const authHeader = info.req.headers['authorization'] as string | undefined;
          const token = authHeader?.replace('Bearer ', '');
          if (token !== this.options.authToken) {
            done(false, 401, 'Unauthorized');
            return;
          }
        }
        done(true);
      }
    });

    this.wss.on('connection', (ws, req) => {
      console.log('🔌 WebSocket client connected');
      
      ws.on('message', (data) => {
        try {
          const log: ConsoleLog = JSON.parse(data.toString());
          this.logCapture.addLog(log);
          
          if (this.options.watchMode) {
            this.handleNewLog(log);
          }
        } catch (error) {
          console.error('❌ Error parsing log message:', error);
        }
      });
      
      ws.on('close', () => {
        console.log('🔌 WebSocket client disconnected');
      });
    });
  }

  private handleNewLog(log: ConsoleLog): void {
    const formatted = this.formatter.formatSingle(log);
    
    if (this.options.outputFile) {
      this.formatter.appendToFile(formatted, this.options.outputFile);
    } else {
      console.log(formatted);
    }
  }

  private generateAgentInfo(logs: ConsoleLog[], agent: string, analysis?: any): any {
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
      suggestions: this.generateSuggestions(logs)
    };

    if (analysis) {
      return {
        ...baseInfo,
        ai_analysis: analysis
      };
    }

    return baseInfo;
  }

  private generateSuggestions(logs: ConsoleLog[]): string[] {
    return generateSuggestions(logs);
  }

  async stop(): Promise<void> {
    // Unregister server from discovery
    await ServiceDiscovery.unregisterServer();
    
    if (this.wss) {
      this.wss.close();
    }
    if (this.server) {
      this.server.close();
    }
  }
}
