#!/usr/bin/env node

import { Command } from 'commander';
import { DevConsoleServer } from './server/websocket-server';
import { LogCapture } from './capture/log-capture';
import { OutputFormatter } from './output/formatter';
import { ConsoleLog } from './types';
import { generateSuggestions } from './suggestions';
import { AIProviderManager } from './ai';
import { version } from '../package.json';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { runStart, runCaptureDirect } from './cli/commands/start';
import { runAnalyze, runAnalyzeDirect } from './cli/commands/analyze';
import { runAddLog, runImportLogs, runInteractive, runClear, runDoctor, runInitKeys } from './cli/commands/utility';
import { runAnalytics, runCollaboration, runSystem, runMonitor } from './cli/commands/advanced';

// Load environment variables
dotenv.config();

const program = new Command();

// Initialize AI manager (providers are loaded lazily)
const aiManager = new AIProviderManager();

program
  .name('letsfixthis')
  .description('Capture browser dev console output for AI coding agents')
  .version(version);

program
  .command('start')
  .description('Start the dev console capture server')
  .option('-p, --port <port>', 'WebSocket server port', '8090')
  .option('-h, --host <host>', 'Host to bind to (use 0.0.0.0 for all interfaces)', '0.0.0.0')
  .option('-f, --format <format>', 'Output format (json|text|structured)', 'json')
  .option('-o, --output <file>', 'Output file path')
  .option('-l, --log-file <file>', 'Path to log file')
  .option('--cors-origin <origin>', 'Allowed CORS origin')
  .option('--token <token>', 'Authentication token for API and WS')
  .option('-w, --watch', 'Watch mode - continuously capture')
  .action(async (options) => runStart(options));

// Direct console capture mode - no browser extension required
program
  .command('capture-direct')
  .description('Direct console capture mode - no browser extension required')
  .option('-p, --port <port>', 'Server port', '8090')
  .option('-h, --host <host>', 'Host to bind to', '0.0.0.0')
  .option('-f, --format <format>', 'Output format (json|text|structured)', 'json')
  .option('-o, --output <file>', 'Output file path')
  .option('-l, --log-file <file>', 'Path to log file')
  .option('--ai-provider <provider>', 'AI provider (vercel-ai|cerebras|openai-dev|auto)', 'auto')
  .option('--auto-analyze', 'Automatically analyze logs with AI')
  .option('--watch', 'Watch mode - continuously capture and analyze')
  .action(async (options) => runCaptureDirect(options));

program
  .command('watch')
  .description('Watch the repository and analyze changes')
  .option('--server <url>', 'Server URL', 'http://localhost:8090')
  .action(async (options) => {
    try {
      const resp = await fetch(`${options.server}/api/code/watch`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      console.log(JSON.stringify(await resp.json(), null, 2));
    } catch (e) {
      console.error('Failed to start watcher:', e);
      process.exit(1);
    }
  });

program
  .command('knowledge')
  .description('Show knowledge store summary')
  .option('--server <url>', 'Server URL', 'http://localhost:8090')
  .action(async (options) => {
    const resp = await fetch(`${options.server}/api/code/knowledge`);
    console.log(JSON.stringify(await resp.json(), null, 2));
  });

program
  .command('graph')
  .description('Show dependency graph')
  .option('--server <url>', 'Server URL', 'http://localhost:8090')
  .action(async (options) => {
    const resp = await fetch(`${options.server}/api/code/graph`);
    console.log(JSON.stringify(await resp.json(), null, 2));
  });

program
  .command('review')
  .description('Run Cerebras code review on a diff/plan')
  .option('--server <url>', 'Server URL', 'http://localhost:8090')
  .option('--diff <file>', 'Unified diff file')
  .option('--plan <file>', 'Plan/description file')
  .option('--files <list>', 'Comma-separated files to summarize')
  .action(async (options) => {
    const fs = await import('fs');
    const body: any = {};
    if (options.diff) body.diff = fs.readFileSync(options.diff, 'utf8');
    if (options.plan) body.plan = fs.readFileSync(options.plan, 'utf8');
    if (options.files) body.files = String(options.files).split(',').map((s: string) => s.trim());
    const resp = await fetch(`${options.server}/api/code/review`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    console.log(JSON.stringify(await resp.json(), null, 2));
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
  .option('--ai-provider <provider>', 'AI provider (vercel-ai|cerebras|openai-dev|auto)', 'auto')
  .action(async (options) => {
    const capture = new LogCapture(options.logFile || process.env.DEV_CONSOLE_LOG_FILE);
    const logs = await capture.getCurrentLogs();
    
    let formattedOutput: string;
    
    if (options.aiProvider === 'auto') {
      // Use the best available AI provider
      const analysis = await aiManager.getBestAnalysis(logs);
      if (analysis) {
        const agentInfo = {
          timestamp: new Date().toISOString(),
          agent: options.agent,
          ai_analysis: analysis,
          console_data: {
            errors: logs.filter((log: ConsoleLog) => log.level === 'error'),
            warnings: logs.filter((log: ConsoleLog) => log.level === 'warn'),
            logs: logs.filter((log: ConsoleLog) => log.level === 'log'),
            network_errors: logs.filter((log: ConsoleLog) => log.type === 'network'),
            stack_traces: logs.filter((log: ConsoleLog) => log.stack).map((log: ConsoleLog) => log.stack)
          },
          suggestions: generateSuggestions(logs)
        };
        formattedOutput = JSON.stringify(agentInfo, null, 2);
      } else {
        // Fallback to original format
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
        formattedOutput = JSON.stringify(agentInfo, null, 2);
      }
    } else {
      // Use specific AI provider
      const provider = aiManager.getProvider(options.aiProvider);
      const resolvedProvider = await provider;
      if (resolvedProvider && await resolvedProvider.isAvailable()) {
        formattedOutput = await resolvedProvider.formatForAgent(logs, options.agent);
      } else {
        console.error(`❌ AI provider '${options.aiProvider}' not available`);
        const available = await aiManager.getAvailableProviders();
        console.log('Available providers:', available.join(', '));
        process.exit(1);
      }
    }
    
    console.log(formattedOutput);
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

program
  .command('analyze')
  .description('Analyze console logs with AI providers')
  .option('-l, --log-file <file>', 'Path to log file')
  .option('--provider <provider>', 'AI provider (vercel-ai|cerebras|openai-dev|all)', 'all')
  .option('-f, --format <format>', 'Output format (json|text|detailed)', 'json')
  .action(async (options) => runAnalyze(options));

// Health check and setup helpers
program
  .command('doctor')
  .description('Diagnose configuration and provider availability')
  .action(async () => {
    const providers = ['vercel-ai', 'cerebras', 'openai-dev'];
    const available = aiManager.getAvailableProviders();
    console.log('🩺 LetsfixThis Doctor\n');
    console.log(`Providers registered: ${providers.join(', ')}`);
    const availableProviders = await available;
    console.log(`Providers available: ${availableProviders.join(', ') || '(none)'}`);
    const keysFile = path.join(process.cwd(), '.letsfixthis.keys.json');
    console.log(`Keys file: ${fs.existsSync(keysFile) ? keysFile : '(not found in current dir)'}`);
    console.log('Environment variables (presence only):');
    const envFlags = {
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
      OPENAI_BASE_URL: !!process.env.OPENAI_BASE_URL,
      VERCEL_AI_OPENAI_API_KEY: !!process.env.VERCEL_AI_OPENAI_API_KEY,
      VERCEL_AI_OPENAI_BASE_URL: !!process.env.VERCEL_AI_OPENAI_BASE_URL,
      OPENAI_DEV_OPENAI_API_KEY: !!process.env.OPENAI_DEV_OPENAI_API_KEY,
      OPENAI_DEV_OPENAI_BASE_URL: !!process.env.OPENAI_DEV_OPENAI_BASE_URL,
      ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
      VERCEL_AI_ANTHROPIC_API_KEY: !!process.env.VERCEL_AI_ANTHROPIC_API_KEY,
      CEREBRAS_API_KEY: !!process.env.CEREBRAS_API_KEY,
      CEREBRAS_ENDPOINT: !!process.env.CEREBRAS_ENDPOINT,
    } as Record<string, boolean>;
    Object.entries(envFlags).forEach(([k, v]) => console.log(`  ${k}: ${v ? 'set' : 'not set'}`));
    console.log('\nNext steps:');
    console.log('- Run "letsfixthis init-keys" to create a keys file template');
    console.log('- Or export provider-specific environment variables (see README)');
  });

program
  .command('init-keys')
  .description('Create a .letsfixthis.keys.json template in the current directory')
  .action(() => {
    const target = path.join(process.cwd(), '.letsfixthis.keys.json');
    if (fs.existsSync(target)) {
      console.log('✔️  .letsfixthis.keys.json already exists');
      return;
    }
    const template = {
      providers: {
        'vercel-ai': {
          openai: { apiKey: 'YOUR_OPENAI_KEY', baseURL: 'https://api.openai.com/v1' },
          anthropic: { apiKey: 'YOUR_ANTHROPIC_KEY' }
        },
        'openai-dev': {
          openai: { apiKey: 'YOUR_OPENAI_KEY', baseURL: 'https://api.openai.com/v1' }
        },
        cerebras: { apiKey: 'YOUR_CEREBRAS_KEY', endpoint: 'https://api.cerebras.ai' }
      }
    } as any;
    fs.writeFileSync(target, JSON.stringify(template, null, 2));
    console.log('✅ Created .letsfixthis.keys.json');
  });

program
  .command('add-log')
  .description('Add a log entry directly via CLI')
  .option('-m, --message <message>', 'Log message')
  .option('-l, --level <level>', 'Log level (log|warn|error|info|debug)', 'log')
  .option('-f, --file <file>', 'Source file')
  .option('-n, --line <line>', 'Line number')
  .option('-s, --server <url>', 'Server URL', 'http://localhost:8090')
  .action(async (options) => {
    try {
      const logEntry = {
        message: options.message,
        level: options.level,
        timestamp: new Date().toISOString(),
        source: {
          file: options.file,
          line: options.line ? parseInt(options.line) : undefined
        }
      };
      
      const response = await fetch(`${options.server}/api/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logEntry)
      });
      
      if (response.ok) {
        console.log('✅ Log added successfully');
      } else {
        console.error('❌ Failed to add log:', await response.text());
      }
    } catch (error) {
      console.error('❌ Error adding log:', error);
    }
  });

program
  .command('import-logs')
  .description('Import logs from a file')
  .option('-f, --file <file>', 'Log file to import')
  .option('-s, --server <url>', 'Server URL', 'http://localhost:8090')
  .action(async (options) => {
    if (!options.file) {
      console.error('❌ Please specify a file with --file');
      return;
    }
    
    try {
      const logData = fs.readFileSync(options.file, 'utf8');
      const logs = JSON.parse(logData);
      
      const response = await fetch(`${options.server}/api/logs/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs })
      });
      
      if (response.ok) {
        console.log(`✅ Imported ${logs.length} logs successfully`);
      } else {
        console.error('❌ Failed to import logs:', await response.text());
      }
    } catch (error) {
      console.error('❌ Error importing logs:', error);
    }
  });

program
  .command('interactive')
  .description('Interactive mode for adding logs')
  .option('-s, --server <url>', 'Server URL', 'http://localhost:8090')
  .action(async (options) => {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    console.log('🎯 Interactive mode - type "quit" to exit');
    console.log('Format: <level>:<message> (e.g., error:Something went wrong)');
    
    const askQuestion = () => {
      rl.question('> ', async (input: string) => {
        if (input.toLowerCase() === 'quit') {
          rl.close();
          return;
        }
        
        const [level, ...messageParts] = input.split(':');
        const message = messageParts.join(':').trim();
        
        if (!message) {
          console.log('❌ Please provide a message');
          askQuestion();
          return;
        }
        
        try {
          const logEntry = {
            message,
            level: level || 'log',
            timestamp: new Date().toISOString()
          };
          
          const response = await fetch(`${options.server}/api/logs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(logEntry)
          });
          
          if (response.ok) {
            console.log('✅ Log added');
          } else {
            console.error('❌ Failed to add log');
          }
        } catch (error) {
          console.error('❌ Error:', error);
        }
        
        askQuestion();
      });
    };
    
    askQuestion();
  });

program
  .command('analyze-direct')
  .description('Analyze logs directly with AI providers')
  .option('-p, --provider <provider>', 'AI provider (vercel-ai|cerebras|openai-dev|all)', 'all')
  .option('-f, --format <format>', 'Output format (json|detailed)', 'detailed')
  .option('-s, --server <url>', 'Server URL', 'http://localhost:8090')
  .action(async (options) => {
    try {
      const response = await fetch(`${options.server}/api/analyze?provider=${options.provider}&format=${options.format}`);
      const result = await response.json();
      
      if (options.format === 'detailed') {
        console.log('\n🤖 AI Analysis Results:\n');
        if (result.analyses) {
          for (const [provider, analysis] of Object.entries(result.analyses)) {
            console.log(`🤖 ${provider.toUpperCase()}:`);
            console.log(`   Summary: ${(analysis as any).summary}`);
            console.log(`   Priority: ${(analysis as any).priority.toUpperCase()}`);
            console.log(`   Confidence: ${((analysis as any).confidence * 100).toFixed(1)}%`);
            console.log('');
          }
        } else {
          console.log(`Summary: ${result.summary}`);
          console.log(`Priority: ${result.priority.toUpperCase()}`);
          console.log(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);
        }
      } else {
        console.log(JSON.stringify(result, null, 2));
      }
    } catch (error) {
      console.error('❌ Error analyzing logs:', error);
    }
  });

program
  .command('guardrails')
  .description('Validate plans or diffs against guardrails')
  .option('--plan <file>', 'Path to a plan file (markdown/text)')
  .option('--diff <file>', 'Path to a unified diff/patch file')
  .option('--server <url>', 'Server URL', 'http://localhost:8090')
  .action(async (options) => {
    try {
      if (options.plan) {
        const plan = require('fs').readFileSync(options.plan, 'utf8');
        const resp = await fetch(`${options.server}/api/guardrails/validate-plan`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan }) });
        console.log(JSON.stringify(await resp.json(), null, 2));
        return;
      }
      if (options.diff) {
        const diff = require('fs').readFileSync(options.diff, 'utf8');
        const resp = await fetch(`${options.server}/api/guardrails/validate-diff`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ diff }) });
        console.log(JSON.stringify(await resp.json(), null, 2));
        return;
      }
      console.error('Provide --plan or --diff');
      process.exit(1);
    } catch (e) {
      console.error('Guardrails validation failed:', e);
      process.exit(1);
    }
  });

// Advanced Analytics Commands
program
  .command('analytics')
  .description('Show analytics dashboard and insights')
  .option('-f, --format <format>', 'Output format (json|text)', 'text')
  .option('-e, --export <file>', 'Export analytics to file')
  .action(async (options) => runAnalytics(options));

// Collaboration Commands
program
  .command('collaboration')
  .description('Manage real-time collaboration sessions')
  .argument('<action>', 'Action to perform (create|list|join|info)')
  .option('-n, --name <name>', 'Session name (for create)')
  .option('-s, --session-id <id>', 'Session ID (for info)')
  .action(async (action, options) => {
    const collaborationOptions = {
      action: action as 'create' | 'list' | 'join' | 'info',
      name: options.name,
      sessionId: options.sessionId
    };
    await runCollaboration(collaborationOptions);
  });

// System Commands
program
  .command('system')
  .description('System monitoring and management')
  .argument('<action>', 'Action to perform (stats|cache|health|reset)')
  .option('--clear', 'Clear cache (for cache action)')
  .option('-p, --pattern <pattern>', 'Cache pattern to clear')
  .action(async (action, options) => runSystem({ action, ...options }));

// Monitor Command
program
  .command('monitor')
  .description('Real-time system monitoring')
  .option('-i, --interval <ms>', 'Monitoring interval in milliseconds', '5000')
  .option('-d, --duration <ms>', 'Monitoring duration in milliseconds', '60000')
  .action(async (options) => runMonitor(options));

program.parse();
