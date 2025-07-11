import * as WebSocket from 'ws';
import * as http from 'http';
import express from 'express';
import cors from 'cors';
import { ConsoleLog, ServerOptions } from '../types';
import { LogCapture } from '../capture/log-capture';
import { OutputFormatter } from '../output/formatter';

export class DevConsoleServer {
  private wss: WebSocket.Server | null = null;
  private server: http.Server | null = null;
  private app: express.Application;
  private logCapture: LogCapture;
  private formatter: OutputFormatter;
  private options: ServerOptions;

  constructor(options: ServerOptions) {
    this.options = options;
    this.app = express();
    this.logCapture = new LogCapture(options.logFile);
    this.formatter = new OutputFormatter(options.format);
    
    this.setupExpress();
  }

  private setupExpress(): void {
    const corsOptions = this.options.corsOrigin ? { origin: this.options.corsOrigin } : {};
    this.app.use(cors(corsOptions));
    this.app.use(express.json());

    // Serve the browser extension files
    this.app.use('/extension', express.static('extension'));

    // Authentication middleware for API routes
    this.app.use('/api', (req, res, next) => {
      if (this.options.authToken) {
        const authHeader = req.headers['authorization'] as string | undefined;
        const token = authHeader?.replace('Bearer ', '') || (req.query.token as string | undefined);
        if (token !== this.options.authToken) {
          res.status(401).json({ error: 'Unauthorized' });
          return;
        }
      }
      next();
    });

    // API endpoints
    this.app.get('/api/logs', async (req, res) => {
      try {
        const logs = await this.logCapture.getCurrentLogs();
        res.json(logs);
      } catch (error) {
        res.status(500).json({ error: 'Failed to get logs' });
      }
    });

    this.app.post('/api/logs', (req, res) => {
      const log: ConsoleLog = req.body;
      this.logCapture.addLog(log);
      
      if (this.options.watchMode) {
        this.handleNewLog(log);
      }
      
      res.json({ success: true });
    });

    this.app.delete('/api/logs', async (req, res) => {
      try {
        await this.logCapture.clearLogs();
        res.json({ success: true, message: 'Logs cleared' });
      } catch (error) {
        res.status(500).json({ error: 'Failed to clear logs' });
      }
    });

    this.app.get('/api/agent-info/:agent', async (req, res) => {
      try {
        const logs = await this.logCapture.getCurrentLogs();
        const agentInfo = this.generateAgentInfo(logs, req.params.agent);
        res.json(agentInfo);
      } catch (error) {
        res.status(500).json({ error: 'Failed to generate agent info' });
      }
    });
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.options.port, () => {
          this.setupWebSocket();
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  private setupWebSocket(): void {
    if (!this.server) return;
    
    this.wss = new WebSocket.Server({ server: this.server });

    this.wss.on('connection', (ws, req) => {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const token = url.searchParams.get('token');
      if (this.options.authToken && token !== this.options.authToken) {
        ws.close();
        return;
      }
      console.log('🔌 Browser extension connected');
      
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
        console.log('🔌 Browser extension disconnected');
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

  private generateAgentInfo(logs: ConsoleLog[], agent: string): any {
    return {
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
  }

  private generateSuggestions(logs: ConsoleLog[]): string[] {
    const suggestions: string[] = [];
    
    const errors = logs.filter(log => log.level === 'error');
    const warnings = logs.filter(log => log.level === 'warn');
    
    if (errors.length > 0) {
      suggestions.push('Focus on resolving the console errors first');
      suggestions.push('Check for JavaScript runtime errors and fix syntax issues');
    }
    
    if (warnings.length > 0) {
      suggestions.push('Review console warnings for potential performance issues');
    }
    
    const networkErrors = logs.filter(log => log.type === 'network');
    if (networkErrors.length > 0) {
      suggestions.push('Check network requests and API endpoints');
    }
    
    return suggestions;
  }

  async stop(): Promise<void> {
    if (this.wss) {
      this.wss.close();
    }
    if (this.server) {
      this.server.close();
    }
  }
}
