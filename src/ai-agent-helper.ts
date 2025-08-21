#!/usr/bin/env node

import { LogCapture } from './capture/log-capture';
import { AIProviderManager } from './ai';
import { ConsoleLog } from './types';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize AI manager (providers are loaded lazily)
const aiManager = new AIProviderManager();

export class AIAgentHelper {
  private capture: LogCapture;

  constructor(logFile?: string) {
    this.capture = new LogCapture(logFile);
  }

  /**
   * Add a console log entry programmatically
   */
  async addLog(log: Partial<ConsoleLog>): Promise<void> {
    const fullLog: ConsoleLog = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      level: 'log',
      message: '',
      args: [],
      type: 'console',
      ...log
    };

    await this.capture.addLog(fullLog);
  }

  /**
   * Add multiple logs at once
   */
  async addLogs(logs: Partial<ConsoleLog>[]): Promise<void> {
    for (const log of logs) {
      await this.addLog(log);
    }
  }

  /**
   * Get all current logs
   */
  async getLogs(): Promise<ConsoleLog[]> {
    return await this.capture.getCurrentLogs();
  }

  /**
   * Clear all logs
   */
  async clearLogs(): Promise<void> {
    await this.capture.clearLogs();
  }

  /**
   * Analyze logs with AI
   */
  async analyzeLogs(provider: string = 'auto', format: 'json' | 'detailed' = 'json'): Promise<any> {
    const logs = await this.getLogs();
    
    if (logs.length === 0) {
      return { message: 'No logs found to analyze' };
    }

    if (provider === 'auto') {
      const analysis = await aiManager.getBestAnalysis(logs);
      return analysis || { message: 'No AI providers available' };
    } else {
      const aiProvider = aiManager.getProvider(provider);
      const resolvedProvider = await aiProvider;
      if (!resolvedProvider || !(await resolvedProvider.isAvailable())) {
        return { error: `AI provider '${provider}' not available` };
      }
      return await resolvedProvider.analyze(logs);
    }
  }

  /**
   * Get logs formatted for specific AI agents
   */
  async getAgentInfo(agent: string, aiProvider: string = 'auto'): Promise<any> {
    const logs = await this.getLogs();
    
    if (aiProvider === 'auto') {
      const analysis = await aiManager.getBestAnalysis(logs);
      return {
        timestamp: new Date().toISOString(),
        agent,
        ai_analysis: analysis,
        console_data: {
          errors: logs.filter(log => log.level === 'error'),
          warnings: logs.filter(log => log.level === 'warn'),
          logs: logs.filter(log => log.level === 'log'),
          network_errors: logs.filter(log => log.type === 'network'),
          stack_traces: logs.filter(log => log.stack).map(log => log.stack)
        }
      };
    } else {
      const provider = aiManager.getProvider(aiProvider);
      const resolvedProvider = await provider;
      if (!resolvedProvider || !(await resolvedProvider.isAvailable())) {
        return { error: `AI provider '${aiProvider}' not available` };
      }
      const formatted = await resolvedProvider.formatForAgent(logs, agent);
      return JSON.parse(formatted);
    }
  }

  /**
   * Import logs from a file
   */
  async importFromFile(filePath: string, format: 'json' | 'text' = 'json'): Promise<number> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');
    let logs: ConsoleLog[] = [];

    if (format === 'json') {
      const data = JSON.parse(fileContent);
      logs = Array.isArray(data) ? data : data.logs || [];
    } else if (format === 'text') {
      const lines = fileContent.split('\n').filter(line => line.trim());
      logs = lines.map((line, index) => {
        const match = line.match(/^\[(.*?)\] (\w+): (.+)$/);
        if (match) {
          return {
            id: (Date.now() + index).toString(),
            timestamp: new Date(match[1]).getTime(),
            level: match[2].toLowerCase() as any,
            message: match[3],
            args: [],
            type: 'console' as any
          };
        }
        return null;
      }).filter(Boolean) as ConsoleLog[];
    }

    for (const log of logs) {
      await this.capture.addLog(log);
    }

    return logs.length;
  }

  /**
   * Export logs to a file
   */
  async exportToFile(filePath: string, format: 'json' | 'text' = 'json'): Promise<void> {
    const logs = await this.getLogs();
    
    let content: string;
    
    if (format === 'json') {
      content = JSON.stringify(logs, null, 2);
    } else {
      content = logs.map(log => {
        const timestamp = new Date(log.timestamp).toISOString();
        return `[${timestamp}] ${log.level.toUpperCase()}: ${log.message}`;
      }).join('\n');
    }

    fs.writeFileSync(filePath, content, 'utf8');
  }

  /**
   * Get available AI providers
   */
  async getAvailableProviders(): Promise<string[]> {
    return await aiManager.getAvailableProviders();
  }

  /**
   * Get log statistics
   */
  async getStats(): Promise<any> {
    const logs = await this.getLogs();
    
    return {
      total: logs.length,
      errors: logs.filter(log => log.level === 'error').length,
      warnings: logs.filter(log => log.level === 'warn').length,
      info: logs.filter(log => log.level === 'info').length,
      debug: logs.filter(log => log.level === 'debug').length,
      network: logs.filter(log => log.type === 'network').length,
      has_stack_traces: logs.some(log => log.stack),
      time_range: {
        first: logs.length > 0 ? new Date(logs[0].timestamp).toISOString() : null,
        last: logs.length > 0 ? new Date(logs[logs.length - 1].timestamp).toISOString() : null
      }
    };
  }
}

// CLI interface for AI agents
if (require.main === module) {
  const { Command } = require('commander');
  const program = new Command();

  program
    .name('ai-agent-helper')
    .description('Helper for AI agents to work with LetsfixThis')
    .version('1.0.0');

  program
    .command('add-log')
    .description('Add a log entry')
    .option('-l, --level <level>', 'Log level', 'log')
    .option('-m, --message <message>', 'Log message')
    .option('-f, --file <file>', 'Source file')
    .option('-n, --line <line>', 'Line number')
    .option('-s, --stack <stack>', 'Stack trace')
    .action(async (options: { level?: string; message?: string; file?: string; line?: string; stack?: string }) => {
      const helper = new AIAgentHelper();
      await helper.addLog({
        level: (options.level as 'log' | 'warn' | 'error' | 'info' | 'debug' | undefined),
        message: options.message,
        url: options.file,
        lineNumber: options.line ? parseInt(options.line) : undefined,
        stack: options.stack
      });
      console.log('✅ Log added');
    });

  program
    .command('analyze')
    .description('Analyze logs with AI')
    .option('--provider <provider>', 'AI provider', 'auto')
    .option('-f, --format <format>', 'Output format', 'json')
    .action(async (options: { provider?: string; format?: string }) => {
      const helper = new AIAgentHelper();
      const result = await helper.analyzeLogs(options.provider, options.format as any);
      console.log(JSON.stringify(result, null, 2));
    });

  program
    .command('stats')
    .description('Get log statistics')
    .action(async () => {
      const helper = new AIAgentHelper();
      const stats = await helper.getStats();
      console.log(JSON.stringify(stats, null, 2));
    });

  program
    .command('export')
    .description('Export logs to file')
    .argument('<file>', 'Output file path')
    .option('-f, --format <format>', 'Output format', 'json')
    .action(async (file: string, options: { format?: string }) => {
      const helper = new AIAgentHelper();
      await helper.exportToFile(file, options.format as any);
      console.log(`✅ Logs exported to ${file}`);
    });

  program
    .command('import')
    .description('Import logs from file')
    .argument('<file>', 'Input file path')
    .option('-f, --format <format>', 'Input format', 'json')
    .action(async (file: string, options: { format?: string }) => {
      const helper = new AIAgentHelper();
      const count = await helper.importFromFile(file, options.format as any);
      console.log(`✅ Imported ${count} logs from ${file}`);
    });

  program.parse();
}
