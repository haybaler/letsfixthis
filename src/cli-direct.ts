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
import * as readline from 'readline';

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
  .description('AI-powered CLI tool to capture and analyze console output')
  .version(version);

// Direct console capture mode - no extension needed
program
  .command('capture-direct')
  .description('Direct console capture mode - no browser extension required')
  .option('-p, --port <port>', 'Server port', '8090')
  .option('-h, --host <host>', 'Host to bind to', '0.0.0.0')
  .option('-f, --format <format>', 'Output format (json|text|structured)', 'json')
  .option('-o, --output <file>', 'Output file path')
  .option('-l, --log-file <file>', 'Path to log file')
  .option('--ai-provider <provider>', 'AI provider (vercel-ai|cerebrus|openai-dev|auto)', 'auto')
  .option('--auto-analyze', 'Automatically analyze logs with AI')
  .option('--watch', 'Watch mode - continuously capture and analyze')
  .action(async (options) => {
    console.log('🚀 Starting LetsfixThis Direct Capture Mode...');
    console.log('📋 No browser extension required - works directly with CLI');
    
    const server = new DevConsoleServer({
      port: parseInt(options.port),
      host: options.host,
      format: options.format,
      outputFile: options.output,
      watchMode: options.watch,
      logFile: options.logFile || process.env.DEV_CONSOLE_LOG_FILE,
      corsOrigin: process.env.DEV_CONSOLE_ORIGIN,
      authToken: process.env.DEV_CONSOLE_TOKEN
    });
    
    await server.start();
    console.log(`📡 Server running on ${options.host}:${options.port}`);
    console.log('');
    console.log('🎯 Direct Capture Methods:');
    console.log('1. Manual log entry: Use "letsfixthis add-log" command');
    console.log('2. File import: Use "letsfixthis import-logs <file>"');
    console.log('3. HTTP API: Send POST requests to /api/logs');
    console.log('4. WebSocket: Connect to ws://localhost:' + options.port);
    console.log('');
    
    if (options.autoAnalyze) {
      console.log('🤖 Auto-analysis enabled - logs will be analyzed automatically');
    }
    
    if (options.watch) {
      console.log('👀 Watch mode enabled - continuously monitoring for new logs');
    }
    
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

// Add log manually
program
  .command('add-log')
  .description('Add a console log entry manually')
  .option('-l, --level <level>', 'Log level (log|warn|error|info|debug)', 'log')
  .option('-m, --message <message>', 'Log message')
  .option('-f, --file <file>', 'Source file path')
  .option('-n, --line <line>', 'Line number')
  .option('-c, --column <column>', 'Column number')
  .option('-s, --stack <stack>', 'Stack trace')
  .option('--type <type>', 'Log type (console|network|exception)', 'console')
  .action(async (options) => {
    const capture = new LogCapture();
    
    if (!options.message) {
      console.error('❌ Message is required. Use --message or -m');
      process.exit(1);
    }
    
    const log: ConsoleLog = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      level: options.level as any,
      message: options.message,
      args: [],
      url: options.file,
      lineNumber: options.line ? parseInt(options.line) : undefined,
      columnNumber: options.column ? parseInt(options.column) : undefined,
      stack: options.stack,
      type: options.type as any,
      source: options.file
    };
    
    await capture.addLog(log);
    console.log('✅ Log added successfully');
    console.log(`📝 ${log.level.toUpperCase()}: ${log.message}`);
  });

// Import logs from file
program
  .command('import-logs')
  .description('Import console logs from a file')
  .argument('<file>', 'File path to import logs from')
  .option('-f, --format <format>', 'File format (json|text|csv)', 'json')
  .option('--clear', 'Clear existing logs before import')
  .action(async (filePath, options) => {
    const capture = new LogCapture();
    
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      process.exit(1);
    }
    
    if (options.clear) {
      await capture.clearLogs();
      console.log('🗑️ Cleared existing logs');
    }
    
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      let logs: ConsoleLog[] = [];
      
      if (options.format === 'json') {
        const data = JSON.parse(fileContent);
        logs = Array.isArray(data) ? data : data.logs || [];
      } else if (options.format === 'text') {
        // Parse text format (simple line-by-line)
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
        await capture.addLog(log);
      }
      
      console.log(`✅ Imported ${logs.length} logs from ${filePath}`);
    } catch (error) {
      console.error('❌ Error importing logs:', error);
      process.exit(1);
    }
  });

// Interactive log entry mode
program
  .command('interactive')
  .description('Interactive mode for entering console logs')
  .option('-l, --log-file <file>', 'Path to log file')
  .action(async (options) => {
    const capture = new LogCapture(options.logFile);
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    console.log('🎯 Interactive Log Entry Mode');
    console.log('Enter console logs in format: <level> <message>');
    console.log('Examples:');
    console.log('  error Cannot read property of undefined');
    console.log('  warn Deprecated API usage');
    console.log('  log Application started');
    console.log('Type "quit" to exit');
    console.log('');
    
    const askForLog = () => {
      rl.question('📝 Enter log: ', async (input) => {
        if (input.toLowerCase() === 'quit') {
          rl.close();
          return;
        }
        
        const parts = input.trim().split(' ');
        if (parts.length < 2) {
          console.log('❌ Format: <level> <message>');
          askForLog();
          return;
        }
        
        const level = parts[0].toLowerCase();
        const message = parts.slice(1).join(' ');
        
        if (!['log', 'warn', 'error', 'info', 'debug'].includes(level)) {
          console.log('❌ Invalid level. Use: log, warn, error, info, debug');
          askForLog();
          return;
        }
        
        const log: ConsoleLog = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          level: level as any,
          message,
          args: [],
          type: 'console'
        };
        
        await capture.addLog(log);
        console.log(`✅ Added: ${level.toUpperCase()}: ${message}`);
        askForLog();
      });
    };
    
    askForLog();
  });

// Enhanced analyze command for direct mode
program
  .command('analyze-direct')
  .description('Analyze logs directly without server')
  .option('-l, --log-file <file>', 'Path to log file')
  .option('--provider <provider>', 'AI provider (vercel-ai|cerebrus|openai-dev|all)', 'all')
  .option('-f, --format <format>', 'Output format (json|text|detailed)', 'json')
  .option('--save <file>', 'Save analysis to file')
  .action(async (options) => {
    const capture = new LogCapture(options.logFile);
    const logs = await capture.getCurrentLogs();
    
    if (logs.length === 0) {
      console.log('📭 No logs found to analyze');
      return;
    }
    
    console.log(`🔍 Analyzing ${logs.length} console logs...`);
    
    if (options.provider === 'all') {
      const analyses = await aiManager.analyzeWithAll(logs);
      
      if (analyses.size === 0) {
        console.log('❌ No AI providers available. Please configure API keys.');
        console.log('Available providers:', aiManager.getAvailableProviders().join(', '));
        return;
      }
      
      let output: string;
      
      if (options.format === 'detailed') {
        output = '\n📊 AI Analysis Results:\n\n';
        for (const [provider, analysis] of analyses) {
          output += `🤖 ${provider.toUpperCase()}:\n`;
          output += `   Summary: ${analysis.summary}\n`;
          output += `   Priority: ${analysis.priority.toUpperCase()}\n`;
          output += `   Confidence: ${(analysis.confidence * 100).toFixed(1)}%\n`;
          output += `   Suggestions: ${analysis.suggestions.length}\n`;
          if (analysis.codeFixes && analysis.codeFixes.length > 0) {
            output += `   Code Fixes: ${analysis.codeFixes.length}\n`;
          }
          output += '\n';
        }
      } else {
        output = JSON.stringify({
          timestamp: new Date().toISOString(),
          total_logs: logs.length,
          analyses: Object.fromEntries(analyses)
        }, null, 2);
      }
      
      if (options.save) {
        fs.writeFileSync(options.save, output);
        console.log(`💾 Analysis saved to ${options.save}`);
      } else {
        console.log(output);
      }
    } else {
      const provider = aiManager.getProvider(options.provider);
      if (!provider || !provider.isAvailable()) {
        console.error(`❌ AI provider '${options.provider}' not available`);
        console.log('Available providers:', aiManager.getAvailableProviders().join(', '));
        return;
      }
      
      const analysis = await provider.analyze(logs);
      
      let output: string;
      
      if (options.format === 'detailed') {
        output = `\n🤖 ${options.provider.toUpperCase()} Analysis:\n\n`;
        output += `Summary: ${analysis.summary}\n`;
        output += `Priority: ${analysis.priority.toUpperCase()}\n`;
        output += `Confidence: ${(analysis.confidence * 100).toFixed(1)}%\n`;
        output += '\nSuggestions:\n';
        analysis.suggestions.forEach((suggestion, index) => {
          output += `  ${index + 1}. ${suggestion}\n`;
        });
        if (analysis.codeFixes && analysis.codeFixes.length > 0) {
          output += '\nCode Fixes:\n';
          analysis.codeFixes.forEach((fix, index) => {
            output += `  ${index + 1}. ${fix}\n`;
          });
        }
        if (analysis.explanations && analysis.explanations.length > 0) {
          output += '\nExplanations:\n';
          analysis.explanations.forEach((explanation, index) => {
            output += `  ${index + 1}. ${explanation}\n`;
          });
        }
      } else {
        output = JSON.stringify(analysis, null, 2);
      }
      
      if (options.save) {
        fs.writeFileSync(options.save, output);
        console.log(`💾 Analysis saved to ${options.save}`);
      } else {
        console.log(output);
      }
    }
  });

// Keep existing commands for backward compatibility
program
  .command('start')
  .description('Start the dev console capture server (with extension support)')
  .option('-p, --port <port>', 'WebSocket server port', '8090')
  .option('-h, --host <host>', 'Host to bind to (use 0.0.0.0 for all interfaces)', '0.0.0.0')
  .option('-f, --format <format>', 'Output format (json|text|structured)', 'json')
  .option('-o, --output <file>', 'Output file path')
  .option('-l, --log-file <file>', 'Path to log file')
  .option('--cors-origin <origin>', 'Allowed CORS origin')
  .option('--token <token>', 'Authentication token for API and WS')
  .option('-w, --watch', 'Watch mode - continuously capture')
  .action(async (options) => {
    console.log('🚀 Starting LetsfixThis Server (Extension Mode)...');
    console.log('📋 Browser extension required for console capture');
    
    // Check for .letsfixthis config file
    let configPort = parseInt(options.port);
    let configHost = options.host;
    
    const configPath = path.join(process.cwd(), '.letsfixthis');
    if (fs.existsSync(configPath)) {
      try {
        const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
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
    console.log(`📡 Server running on ${displayHost}:${configPort}`);
    console.log('📋 Browser extension ready - refresh your page to start capturing console logs');
    
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

// Keep other existing commands
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
  .command('clear')
  .description('Clear stored console logs')
  .option('-l, --log-file <file>', 'Path to log file')
  .action(async (options) => {
    const capture = new LogCapture(options.logFile || process.env.DEV_CONSOLE_LOG_FILE);
    await capture.clearLogs();
    console.log('🗑️ Logs cleared');
  });

program.parse();
