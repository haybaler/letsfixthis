#!/usr/bin/env node

import { Command } from 'commander';
import { DevConsoleServer } from './server/websocket-server';
import { LogCapture } from './capture/log-capture';
import { OutputFormatter } from './output/formatter';
import { ConsoleLog } from './types';
import { generateSuggestions } from './suggestions';
import { AIProviderManager } from './ai/ai-provider';
import { VercelAIProvider } from './ai/vercel-ai-provider';
import { CerebrusProvider } from './ai/cerebrus-provider';
import { OpenAIDevProvider } from './ai/openai-dev-provider';
import { version } from '../package.json';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const program = new Command();

// Initialize AI providers
const aiManager = new AIProviderManager();
aiManager.registerProvider(new VercelAIProvider());
aiManager.registerProvider(new CerebrusProvider());
aiManager.registerProvider(new OpenAIDevProvider());

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
        if (options.port === '8090' && configData.port) {
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
    console.log(`📡 LetsfixThis server running on ${displayHost}:${configPort}`);
    console.log('📋 Send logs via CLI (add-log/import-logs), HTTP POST /api/logs, or WebSocket');
    
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
  .command('watch')
  .description('Watch the repository and analyze changes')
  .option('--server <url>', 'Server URL', 'http://localhost:8090')
  .action(async (options) => {
    const fetch = (await import('node-fetch')).default as any;
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
    const fetch = (await import('node-fetch')).default as any;
    const resp = await fetch(`${options.server}/api/code/knowledge`);
    console.log(JSON.stringify(await resp.json(), null, 2));
  });

program
  .command('graph')
  .description('Show dependency graph')
  .option('--server <url>', 'Server URL', 'http://localhost:8090')
  .action(async (options) => {
    const fetch = (await import('node-fetch')).default as any;
    const resp = await fetch(`${options.server}/api/code/graph`);
    console.log(JSON.stringify(await resp.json(), null, 2));
  });

program
  .command('review')
  .description('Run Cerebrus code review on a diff/plan')
  .option('--server <url>', 'Server URL', 'http://localhost:8090')
  .option('--diff <file>', 'Unified diff file')
  .option('--plan <file>', 'Plan/description file')
  .option('--files <list>', 'Comma-separated files to summarize')
  .action(async (options) => {
    const fetch = (await import('node-fetch')).default as any;
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
  .option('--ai-provider <provider>', 'AI provider (vercel-ai|cerebrus|openai-dev|auto)', 'auto')
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
      if (provider && provider.isAvailable()) {
        formattedOutput = await provider.formatForAgent(logs, options.agent);
      } else {
        console.error(`❌ AI provider '${options.aiProvider}' not available`);
        console.log('Available providers:', aiManager.getAvailableProviders().join(', '));
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
  .option('--provider <provider>', 'AI provider (vercel-ai|cerebrus|openai-dev|all)', 'all')
  .option('-f, --format <format>', 'Output format (json|text|detailed)', 'json')
  .action(async (options) => {
    const capture = new LogCapture(options.logFile || process.env.DEV_CONSOLE_LOG_FILE);
    const logs = await capture.getCurrentLogs();
    
    console.log(`🔍 Analyzing ${logs.length} console logs...`);
    
    if (options.provider === 'all') {
      const analyses = await aiManager.analyzeWithAll(logs);
      
      if (analyses.size === 0) {
        console.log('❌ No AI providers available. Please configure API keys.');
        console.log('Available providers:', aiManager.getAvailableProviders().join(', '));
        return;
      }
      
      if (options.format === 'detailed') {
        console.log('\n📊 AI Analysis Results:\n');
        for (const [provider, analysis] of analyses) {
          console.log(`🤖 ${provider.toUpperCase()}:`);
          console.log(`   Summary: ${analysis.summary}`);
          console.log(`   Priority: ${analysis.priority.toUpperCase()}`);
          console.log(`   Confidence: ${(analysis.confidence * 100).toFixed(1)}%`);
          console.log(`   Suggestions: ${analysis.suggestions.length}`);
          if (analysis.codeFixes && analysis.codeFixes.length > 0) {
            console.log(`   Code Fixes: ${analysis.codeFixes.length}`);
          }
          console.log('');
        }
      } else {
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          total_logs: logs.length,
          analyses: Object.fromEntries(analyses)
        }, null, 2));
      }
    } else {
      const provider = aiManager.getProvider(options.provider);
      if (!provider || !provider.isAvailable()) {
        console.error(`❌ AI provider '${options.provider}' not available`);
        console.log('Available providers:', aiManager.getAvailableProviders().join(', '));
        return;
      }
      
      const analysis = await provider.analyze(logs);
      
      if (options.format === 'detailed') {
        console.log(`\n🤖 ${options.provider.toUpperCase()} Analysis:\n`);
        console.log(`Summary: ${analysis.summary}`);
        console.log(`Priority: ${analysis.priority.toUpperCase()}`);
        console.log(`Confidence: ${(analysis.confidence * 100).toFixed(1)}%`);
        console.log('\nSuggestions:');
        analysis.suggestions.forEach((suggestion, index) => {
          console.log(`  ${index + 1}. ${suggestion}`);
        });
        if (analysis.codeFixes && analysis.codeFixes.length > 0) {
          console.log('\nCode Fixes:');
          analysis.codeFixes.forEach((fix, index) => {
            console.log(`  ${index + 1}. ${fix}`);
          });
        }
        if (analysis.explanations && analysis.explanations.length > 0) {
          console.log('\nExplanations:');
          analysis.explanations.forEach((explanation, index) => {
            console.log(`  ${index + 1}. ${explanation}`);
          });
        }
      } else {
        console.log(JSON.stringify(analysis, null, 2));
      }
    }
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
  .option('-p, --provider <provider>', 'AI provider (vercel-ai|cerebrus|openai-dev|all)', 'all')
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

program.parse();
