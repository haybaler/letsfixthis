import { ConsoleLog } from '../types';
import * as fs from 'fs/promises';
import * as path from 'path';

export class LogCapture {
  private logs: ConsoleLog[] = [];
  private logFile: string;

  constructor() {
    this.logFile = path.join(process.cwd(), '.dev-console-logs.json');
    this.loadExistingLogs();
  }

  private async loadExistingLogs(): Promise<void> {
    try {
      const data = await fs.readFile(this.logFile, 'utf-8');
      this.logs = JSON.parse(data);
    } catch (error) {
      // File doesn't exist or is invalid, start with empty logs
      this.logs = [];
    }
  }

  async addLog(log: ConsoleLog): Promise<void> {
    // Add unique ID if not present
    if (!log.id) {
      log.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    this.logs.push(log);
    
    // Keep only last 1000 logs to prevent memory issues
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000);
    }

    await this.persistLogs();
  }

  async getCurrentLogs(): Promise<ConsoleLog[]> {
    await this.loadExistingLogs();
    return [...this.logs];
  }

  async getLogsByLevel(level: ConsoleLog['level']): Promise<ConsoleLog[]> {
    return this.logs.filter(log => log.level === level);
  }

  async getLogsByTimeRange(start: number, end: number): Promise<ConsoleLog[]> {
    return this.logs.filter(log => log.timestamp >= start && log.timestamp <= end);
  }

  async clearLogs(): Promise<void> {
    this.logs = [];
    await this.persistLogs();
  }

  async getStats(): Promise<{
    total: number;
    errors: number;
    warnings: number;
    logs: number;
    networkErrors: number;
  }> {
    return {
      total: this.logs.length,
      errors: this.logs.filter(log => log.level === 'error').length,
      warnings: this.logs.filter(log => log.level === 'warn').length,
      logs: this.logs.filter(log => log.level === 'log').length,
      networkErrors: this.logs.filter(log => log.type === 'network').length
    };
  }

  private async persistLogs(): Promise<void> {
    try {
      await fs.writeFile(this.logFile, JSON.stringify(this.logs, null, 2));
    } catch (error) {
      console.error('Failed to persist logs:', error);
    }
  }

  // Method for testing or manual log injection
  async simulateConsoleLog(message: string, level: ConsoleLog['level'] = 'log'): Promise<void> {
    const log: ConsoleLog = {
      id: `sim-${Date.now()}`,
      timestamp: Date.now(),
      level,
      message,
      args: [message],
      type: 'console',
      source: 'simulator'
    };

    await this.addLog(log);
  }
}
