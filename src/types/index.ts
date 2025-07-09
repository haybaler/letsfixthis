export interface ConsoleLog {
  id: string;
  timestamp: number;
  level: 'log' | 'warn' | 'error' | 'info' | 'debug';
  message: string;
  args: any[];
  stack?: string;
  url?: string;
  lineNumber?: number;
  columnNumber?: number;
  type?: 'console' | 'network' | 'exception';
  source?: string;
}

export interface ServerOptions {
  port: number;
  host?: string;
  format: string;
  outputFile?: string;
  watchMode: boolean;
}

export interface AgentInfo {
  timestamp: string;
  agent: string;
  console_data: {
    errors: ConsoleLog[];
    warnings: ConsoleLog[];
    logs: ConsoleLog[];
    network_errors: ConsoleLog[];
    stack_traces: (string | undefined)[];
  };
  suggestions: string[];
}
