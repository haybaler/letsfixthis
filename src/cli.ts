#!/usr/bin/env node

import { Command } from 'commander';
import { DevConsoleServer } from './server/websocket-server';
import { LogCapture } from './capture/log-capture';
import { OutputFormatter } from './output/formatter';
import { ConsoleLog } from './types';
import { version } from '../package.json';
import * as fs from 'fs';
import * as path from 'path';

const program = new Command();

program
  .name('letsfixthis')
  .description('Capture browser dev console output for AI coding agents')
  .version(version);

program
  .command('start')
  .description('Start the dev console capture server')
  .option('-p, --port <port>', 'WebSocket server port', '8080')
  .option('-h, --host <host>', 'Host to bind to (use 0.0.0.0 for all interfaces)', '0.0.0.0')
  .option('-f, --format <format>', 'Output format (json|text|structured)', 'json')
  .option('-o, --output <file>', 'Output file path')
  .option('-l, --log-file <file>', 'Path to log file')
  .option('--cors-origin <origin>', 'Allowed CORS origin')
  .option('--token <token>', 'Authentication token for API and WS')
  .option('-w, --watch', 'Watch mode - continuously capture')
  .action(async (options) => {
    console.log('🚀 Starting LetsfixThis...');
    
    // Check for .letsfixthis config file
    let configPort = parseInt(options.port);
    let configHost = options.host;
    
    const configPath = path.join(process.cwd(), '.letsfixthis');
    if (fs.existsSync(configPath)) {
      try {
        const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        // Use config file values if not overridden by CLI args
        if (options.port === '8080' && configData.port) {
          configPort = configData.port;
          console.log(`📋 Using port ${configPort} from .letsfixthis config`);
        }
        if (options.host === '0.0.0.0' && configData.host) {
          configHost = configData.host;
          console.log(`📋 Using host ${configHost} from .letsfixthis config`);
        }
      } catch (error) {
        console.warn('⚠️ Error reading .letsfixthis config file:', error);
      }
    }
    
    const server = new DevConsoleServer({
      port: configPort,
      host: configHost,
      format: options.format,
      outputFile: options.output,
      watchMode: options.watch,
      logFile: options.logFile || process.env.DEV_CONSOLE_LOG_FILE,
      corsOrigin: options.corsOrigin || process.env.DEV_CONSOLE_ORIGIN,
      authToken: options.token || process.env.DEV_CONSOLE_TOKEN
    });
    
    await server.start();
    const displayHost = configHost === '0.0.0.0' ? 'all interfaces' : configHost;
    console.log(`📡 Server running on ${displayHost}:${configPort}`);
    console.log('📋 Install browser extension and refresh your dev environment');
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down server...');
      await server.stop();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      await server.stop();
      process.exit(0);
    });
  });

program
  .command('capture')
  .description('Capture current console state')
  .option('-f, --format <format>', 'Output format (json|text|structured)', 'json')
  .option('-o, --output <file>', 'Output file path')
  .option('-l, --log-file <file>', 'Path to log file')
  .action(async (options) => {
    const capture = new LogCapture(options.logFile || process.env.DEV_CONSOLE_LOG_FILE);
    const formatter = new OutputFormatter(options.format);
    
    try {
      const logs = await capture.getCurrentLogs();
      const formatted = formatter.format(logs);
      
      if (options.output) {
        await formatter.saveToFile(formatted, options.output);
        console.log(`💾 Logs saved to ${options.output}`);
      } else {
        console.log(formatted);
      }
    } catch (error) {
      console.error('❌ Error capturing logs:', error);
      process.exit(1);
    }
  });

program
  .command('agent-info')
  .description('Get formatted info for AI agents')
  .option('-a, --agent <agent>', 'Target agent (cursor|claude|copilot|windsurfer)', 'cursor')
  .option('-l, --log-file <file>', 'Path to log file')
  .action(async (options) => {
    const capture = new LogCapture(options.logFile || process.env.DEV_CONSOLE_LOG_FILE);
    const logs = await capture.getCurrentLogs();
    
    const agentInfo = {
      timestamp: new Date().toISOString(),
      agent: options.agent,
      console_data: {
        errors: logs.filter((log: ConsoleLog) => log.level === 'error'),
        warnings: logs.filter((log: ConsoleLog) => log.level === 'warn'),
        logs: logs.filter((log: ConsoleLog) => log.level === 'log'),
        network_errors: logs.filter((log: ConsoleLog) => log.type === 'network'),
        stack_traces: logs.filter((log: ConsoleLog) => log.stack).map((log: ConsoleLog) => log.stack)
      },
      suggestions: generateSuggestions(logs)
    };
    
    console.log(JSON.stringify(agentInfo, null, 2));
  });

program
  .command('clear')
  .description('Clear stored console logs')
  .option('-l, --log-file <file>', 'Path to log file')
  .action(async (options) => {
    const capture = new LogCapture(options.logFile || process.env.DEV_CONSOLE_LOG_FILE);
    await capture.clearLogs();
    console.log('🗑️  Logs cleared');
  });

function generateSuggestions(logs: ConsoleLog[]): string[] {
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

program.parse();
