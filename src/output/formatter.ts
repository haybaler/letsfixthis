import { ConsoleLog } from '../types';
import * as fs from 'fs/promises';

export class OutputFormatter {
  private formatType: string;

  constructor(format: string = 'json') {
    this.formatType = format;
  }

  format(logs: ConsoleLog[]): string {
    switch (this.formatType.toLowerCase()) {
      case 'json':
        return this.formatJson(logs);
      case 'text':
        return this.formatText(logs);
      case 'structured':
        return this.formatStructured(logs);
      default:
        return this.formatJson(logs);
    }
  }

  formatSingle(log: ConsoleLog): string {
    switch (this.formatType.toLowerCase()) {
      case 'json':
        return JSON.stringify(log, null, 2);
      case 'text':
        return this.formatTextSingle(log);
      case 'structured':
        return this.formatStructuredSingle(log);
      default:
        return JSON.stringify(log, null, 2);
    }
  }

  private formatJson(logs: ConsoleLog[]): string {
    return JSON.stringify({
      metadata: {
        total_logs: logs.length,
        timestamp: new Date().toISOString(),
        format: 'json'
      },
      logs
    }, null, 2);
  }

  private formatText(logs: ConsoleLog[]): string {
    const lines: string[] = [];
    lines.push(`=== Dev Console Logs (${logs.length} entries) ===`);
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');

    logs.forEach(log => {
      lines.push(this.formatTextSingle(log));
      lines.push('---');
    });

    return lines.join('\\n');
  }

  private formatTextSingle(log: ConsoleLog): string {
    const timestamp = new Date(log.timestamp).toISOString();
    const level = log.level.toUpperCase().padEnd(5);
    let output = `[${timestamp}] ${level}: ${log.message}`;
    
    if (log.url) {
      output += `\\n  Source: ${log.url}:${log.lineNumber || '?'}:${log.columnNumber || '?'}`;
    }
    
    if (log.stack) {
      output += `\\n  Stack: ${log.stack.split('\\n')[0]}`;
    }
    
    return output;
  }

  private formatStructured(logs: ConsoleLog[]): string {
    const structured = {
      summary: {
        total: logs.length,
        errors: logs.filter(l => l.level === 'error').length,
        warnings: logs.filter(l => l.level === 'warn').length,
        info: logs.filter(l => l.level === 'log' || l.level === 'info').length,
        network_issues: logs.filter(l => l.type === 'network').length,
        timestamp: new Date().toISOString()
      },
      critical_issues: logs
        .filter(l => l.level === 'error')
        .map(l => ({
          message: l.message,
          source: l.url || 'unknown',
          stack: l.stack?.split('\\n')[0] || null
        })),
      warnings: logs
        .filter(l => l.level === 'warn')
        .map(l => ({
          message: l.message,
          source: l.url || 'unknown'
        })),
      recent_activity: logs
        .slice(-10)
        .map(l => ({
          level: l.level,
          message: l.message.substring(0, 100),
          timestamp: new Date(l.timestamp).toISOString()
        }))
    };

    return JSON.stringify(structured, null, 2);
  }

  private formatStructuredSingle(log: ConsoleLog): string {
    const structured = {
      level: log.level,
      message: log.message,
      timestamp: new Date(log.timestamp).toISOString(),
      source: log.url || 'unknown',
      has_stack: !!log.stack,
      type: log.type || 'console'
    };

    return JSON.stringify(structured, null, 2);
  }

  async saveToFile(content: string, filePath: string): Promise<void> {
    try {
      await fs.writeFile(filePath, content, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to save to file: ${error}`);
    }
  }

  async appendToFile(content: string, filePath: string): Promise<void> {
    try {
      await fs.appendFile(filePath, content + '\\n', 'utf-8');
    } catch (error) {
      console.error(`Failed to append to file: ${error}`);
    }
  }

  // Format specifically for different AI agents
  formatForAgent(logs: ConsoleLog[], agent: string): string {
    const agentSpecific = {
      cursor: () => this.formatForCursor(logs),
      claude: () => this.formatForClaude(logs),
      copilot: () => this.formatForCopilot(logs),
      windsurfer: () => this.formatForWindsurfer(logs)
    };

    const formatter = agentSpecific[agent as keyof typeof agentSpecific];
    return formatter ? formatter() : this.formatStructured(logs);
  }

  private formatForCursor(logs: ConsoleLog[]): string {
    return JSON.stringify({
      context: 'browser_console_logs',
      errors: logs.filter(l => l.level === 'error'),
      warnings: logs.filter(l => l.level === 'warn'),
      suggestions: [
        'Focus on console errors first',
        'Check for undefined variables and missing imports',
        'Review network errors for API issues'
      ]
    }, null, 2);
  }

  private formatForClaude(logs: ConsoleLog[]): string {
    const errorLogs = logs.filter(l => l.level === 'error');
    const warningLogs = logs.filter(l => l.level === 'warn');
    
    return `## Browser Console Analysis

### Summary
- Total logs: ${logs.length}
- Errors: ${errorLogs.length}
- Warnings: ${warningLogs.length}

### Critical Issues
${errorLogs.map(log => `- ${log.message}${log.stack ? '\\n  Stack: ' + log.stack.split('\\n')[0] : ''}`).join('\\n')}

### Warnings
${warningLogs.map(log => `- ${log.message}`).join('\\n')}

### Raw Data
${JSON.stringify(logs, null, 2)}`;
  }

  private formatForCopilot(logs: ConsoleLog[]): string {
    return JSON.stringify({
      developer_context: {
        console_errors: logs.filter(l => l.level === 'error'),
        console_warnings: logs.filter(l => l.level === 'warn'),
        recent_logs: logs.slice(-5),
        timestamp: new Date().toISOString()
      }
    }, null, 2);
  }

  private formatForWindsurfer(logs: ConsoleLog[]): string {
    return JSON.stringify({
      browser_state: {
        console_logs: logs,
        error_count: logs.filter(l => l.level === 'error').length,
        warning_count: logs.filter(l => l.level === 'warn').length,
        last_updated: new Date().toISOString(),
        needs_attention: logs.some(l => l.level === 'error')
      }
    }, null, 2);
  }
}
