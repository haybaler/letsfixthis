import * as WebSocket from 'ws';
import * as https from 'https';
import * as http from 'http';
import * as fs from 'fs';
import express from 'express';
import cors from 'cors';
import { ConsoleLog, ServerOptions } from '../types';
import { LogCapture } from '../capture/log-capture';
import { OutputFormatter } from '../output/formatter';
import { ServiceDiscovery } from './discovery';
import { generateSuggestions } from '../suggestions';

export class DevConsoleServer {
  private wss: WebSocket.Server | null = null;
  private server: https.Server | http.Server | null = null;
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
        const agentInfo = this.generateAgentInfo(logs, req.params.agent);
        res.json(agentInfo);
      } catch (error) {
        res.status(500).json({ error: 'Failed to generate agent info' });
      }
    });
    
    // Discovery endpoint
    this.app.get('/api/discovery', (req, res) => {
      res.json({
        service: 'letsfixthis',
        version: '1.0.0',
        port: this.options.port,
        host: this.options.host || '0.0.0.0'
      });
    });
    
    // Serve the browser extension files
    this.app.use('/extension', express.static('extension'));
    
    // Serve demo.html
    this.app.use(express.static('.'));
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const host = this.options.host || '0.0.0.0';
        
        // Check for SSL certificate and key
        if (fs.existsSync('key.pem') && fs.existsSync('cert.pem')) {
          const options = {
            key: fs.readFileSync('key.pem'),
            cert: fs.readFileSync('cert.pem')
          };
          this.server = https.createServer(options, this.app);
        } else {
          this.server = http.createServer(this.app);
        }

        this.server.listen(this.options.port, host, async () => {
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
          const url = new URL(info.req.url || '', `http://${info.req.headers.host}`);
          const token = url.searchParams.get('token');
          if (token !== this.options.authToken) {
            done(false, 401, 'Unauthorized');
            return;
          }
        }
        done(true);
      }
    });

    this.wss.on('connection', (ws, req) => {
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
