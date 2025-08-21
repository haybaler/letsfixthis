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
import { AIProviderManager } from '../ai';
import { CodebaseAnalyzer } from './codebase-analyzer';
import { KnowledgeStore } from './knowledge-store';
import { setupLogsAPI } from './api/logs';
import { setupAnalysisAPI } from './api/analysis';
import { setupCodebaseAPI } from './api/codebase';
import { setupAdvancedAPI } from './api/advanced';

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
    
    // Initialize AI provider manager (providers are loaded lazily)
    this.aiManager = new AIProviderManager();
    
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

    // Setup modular API endpoints
    setupLogsAPI(this.app, {
      logCapture: this.logCapture,
      options: {
        watchMode: this.options.watchMode,
        outputFile: this.options.outputFile
      }
    }, authenticate);

    setupAnalysisAPI(this.app, {
      aiManager: this.aiManager,
      logCapture: this.logCapture
    }, authenticate);

    setupCodebaseAPI(this.app, {
      codeAnalyzer: this.codeAnalyzer,
      knowledge: this.knowledge,
      aiManager: this.aiManager
    }, authenticate);

    // Advanced API (placeholder – detailed handlers registered elsewhere)
    setupAdvancedAPI(this.app, {}, authenticate);

    // Discovery endpoint
    this.app.get('/api/discovery', (req: express.Request, res: express.Response) => {
      res.json({
        service: 'letsfixthis',
        version: pkgVersion,
        port: this.options.port,
        host: this.options.host || '0.0.0.0',
        ai_providers: this.aiManager.getAvailableProviders()
      });
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
      verifyClient: (info: any, done: any) => {
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

    this.wss.on('connection', (ws: any, req: any) => {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const path = url.pathname;
      
      // Handle collaboration WebSocket connections
      if (path.startsWith('/api/collaboration/ws/')) {
        this.handleCollaborationWebSocket(ws);
        return;
      }
      
      console.log('🔌 WebSocket client connected');
      
      ws.on('message', (data: any) => {
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

  private handleCollaborationWebSocket(ws: any): void {
    // Collaboration features are not implemented in this build.
    ws.close(1008, 'Not Implemented');
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
