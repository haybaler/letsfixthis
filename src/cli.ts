#!/usr/bin/env node

import { Command } from 'commander';
import { DevConsoleServer } from './server/websocket-server';
import { LogCapture } from './capture/log-capture';
import { OutputFormatter } from './output/formatter';
import { ConsoleLog } from './types';
import { version } from '../package.json';

const program = new Command();

program
  .name('letsfixthis')
  .description('Capture browser dev console output for AI coding agents')
  .version(version);

program
  .command('start')
  .description('Start the dev console capture server')
  .option('-p, --port <port>', 'WebSocket server port', '8080')
  .option('-f, --format <format>', 'Output format (json|text|structured)', 'json')
  .option('-o, --output <file>', 'Output file path')
  .option('-l, --log-file <file>', 'Path to log file')
  .option('--cors-origin <origin>', 'Allowed CORS origin')
  .option('--token <token>', 'Authentication token for API and WS')
  .option('-w, --watch', 'Watch mode - continuously capture')
  .action(async (options) => {
    console.log('🚀 Starting LetsfixThis...');

    const server = new DevConsoleServer({
      port: parseInt(options.port),
      format: options.format,
      outputFile: options.output,
      watchMode: options.watch,
      logFile: options.logFile || process.env.DEV_CONSOLE_LOG_FILE,
      corsOrigin: options.corsOrigin || process.env.DEV_CONSOLE_ORIGIN,
      authToken: options.token || process.env.DEV_CONSOLE_TOKEN
    });
    
    await server.start();
    console.log(`📡 Server running on port ${options.port}`);
    console.log('📋 Install browser extension and refresh your dev environment');
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
