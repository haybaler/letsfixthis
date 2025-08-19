#!/usr/bin/env node

/**
 * Simple AI Agent Helper for LetsfixThis
 * 
 * This script allows AI agents to work directly with the codebase
 * without needing the browser extension or complex setup.
 * 
 * Usage:
 *   node ai-agent-simple.js add-log --level error --message "Something went wrong"
 *   node ai-agent-simple.js analyze
 *   node ai-agent-simple.js stats
 *   node ai-agent-simple.js export logs.json
 *   node ai-agent-simple.js import logs.json
 */

const fs = require('fs');
const path = require('path');

// Simple log storage (in memory for this example)
let logs = [];

// Load existing logs if available
const logFile = path.join(process.cwd(), 'console-logs.json');
if (fs.existsSync(logFile)) {
  try {
    logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
  } catch (e) {
    console.log('Starting with empty logs');
  }
}

// Save logs to file
function saveLogs() {
  fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
}

// Add a log entry
function addLog(level, message, file, line, stack) {
  const log = {
    id: Date.now().toString(),
    timestamp: Date.now(),
    level: level.toLowerCase(),
    message: message,
    args: [],
    url: file,
    lineNumber: line ? parseInt(line) : undefined,
    stack: stack,
    type: 'console'
  };
  
  logs.push(log);
  saveLogs();
  console.log(`✅ Added: ${level.toUpperCase()}: ${message}`);
}

// Get log statistics
function getStats() {
  const stats = {
    total: logs.length,
    errors: logs.filter(log => log.level === 'error').length,
    warnings: logs.filter(log => log.level === 'warn').length,
    info: logs.filter(log => log.level === 'info').length,
    debug: logs.filter(log => log.level === 'debug').length,
    has_stack_traces: logs.some(log => log.stack),
    time_range: {
      first: logs.length > 0 ? new Date(logs[0].timestamp).toISOString() : null,
      last: logs.length > 0 ? new Date(logs[logs.length - 1].timestamp).toISOString() : null
    }
  };
  
  return stats;
}

// Export logs to file
function exportLogs(outputFile, format = 'json') {
  if (format === 'json') {
    fs.writeFileSync(outputFile, JSON.stringify(logs, null, 2));
  } else {
    const textContent = logs.map(log => {
      const timestamp = new Date(log.timestamp).toISOString();
      return `[${timestamp}] ${log.level.toUpperCase()}: ${log.message}`;
    }).join('\n');
    fs.writeFileSync(outputFile, textContent);
  }
  console.log(`✅ Exported ${logs.length} logs to ${outputFile}`);
}

// Import logs from file
function importLogs(inputFile, format = 'json') {
  if (!fs.existsSync(inputFile)) {
    console.error(`❌ File not found: ${inputFile}`);
    return;
  }
  
  const content = fs.readFileSync(inputFile, 'utf8');
  let importedLogs = [];
  
  if (format === 'json') {
    try {
      const data = JSON.parse(content);
      importedLogs = Array.isArray(data) ? data : data.logs || [];
    } catch (e) {
      console.error('❌ Invalid JSON file');
      return;
    }
  } else {
    const lines = content.split('\n').filter(line => line.trim());
    importedLogs = lines.map((line, index) => {
      const match = line.match(/^\[(.*?)\] (\w+): (.+)$/);
      if (match) {
        return {
          id: (Date.now() + index).toString(),
          timestamp: new Date(match[1]).getTime(),
          level: match[2].toLowerCase(),
          message: match[3],
          args: [],
          type: 'console'
        };
      }
      return null;
    }).filter(Boolean);
  }
  
  logs = logs.concat(importedLogs);
  saveLogs();
  console.log(`✅ Imported ${importedLogs.length} logs from ${inputFile}`);
}

// Clear all logs
function clearLogs() {
  logs = [];
  saveLogs();
  console.log('🗑️ All logs cleared');
}

// Show all logs
function showLogs() {
  if (logs.length === 0) {
    console.log('📭 No logs found');
    return;
  }
  
  console.log(`📋 Found ${logs.length} logs:\n`);
  logs.forEach((log, index) => {
    const timestamp = new Date(log.timestamp).toISOString();
    console.log(`${index + 1}. [${timestamp}] ${log.level.toUpperCase()}: ${log.message}`);
    if (log.url) {
      console.log(`   Source: ${log.url}${log.lineNumber ? `:${log.lineNumber}` : ''}`);
    }
    if (log.stack) {
      console.log(`   Stack: ${log.stack.split('\n')[0]}`);
    }
    console.log('');
  });
}

// Simple AI analysis (basic pattern matching)
function analyzeLogs() {
  if (logs.length === 0) {
    return { message: 'No logs found to analyze' };
  }
  
  const errors = logs.filter(log => log.level === 'error');
  const warnings = logs.filter(log => log.level === 'warn');
  const networkErrors = logs.filter(log => log.message.includes('network') || log.message.includes('fetch'));
  
  const suggestions = [];
  const codeFixes = [];
  
  // Analyze common patterns
  errors.forEach(error => {
    if (error.message.includes('Cannot read property')) {
      suggestions.push('Check for undefined variables before accessing properties');
      codeFixes.push('Add optional chaining (?.) or null checks');
    }
    if (error.message.includes('is not defined')) {
      suggestions.push('Check variable scope and import statements');
      codeFixes.push('Verify all variables are properly declared and imported');
    }
    if (error.message.includes('Unexpected token')) {
      suggestions.push('Check for syntax errors in your code');
      codeFixes.push('Review brackets, parentheses, and semicolons');
    }
  });
  
  networkErrors.forEach(error => {
    suggestions.push('Check network connectivity and API endpoints');
    codeFixes.push('Verify API URLs and add error handling for network requests');
  });
  
  if (warnings.length > 0) {
    suggestions.push('Review console warnings for potential performance issues');
  }
  
  return {
    summary: `Found ${logs.length} logs with ${errors.length} errors, ${warnings.length} warnings`,
    priority: errors.length > 3 ? 'high' : errors.length > 0 ? 'medium' : 'low',
    suggestions: [...new Set(suggestions)],
    codeFixes: [...new Set(codeFixes)],
    confidence: 0.7,
    statistics: getStats()
  };
}

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'add-log':
    const level = args.find(arg => arg.startsWith('--level='))?.split('=')[1] || 'log';
    const message = args.find(arg => arg.startsWith('--message='))?.split('=')[1] || 'No message provided';
    const file = args.find(arg => arg.startsWith('--file='))?.split('=')[1];
    const line = args.find(arg => arg.startsWith('--line='))?.split('=')[1];
    const stack = args.find(arg => arg.startsWith('--stack='))?.split('=')[1];
    
    addLog(level, message, file, line, stack);
    break;
    
  case 'stats':
    console.log(JSON.stringify(getStats(), null, 2));
    break;
    
  case 'show':
    showLogs();
    break;
    
  case 'analyze':
    const analysis = analyzeLogs();
    console.log(JSON.stringify(analysis, null, 2));
    break;
    
  case 'export':
    const outputFile = args[1] || 'logs-export.json';
    const exportFormat = args.find(arg => arg.startsWith('--format='))?.split('=')[1] || 'json';
    exportLogs(outputFile, exportFormat);
    break;
    
  case 'import':
    const inputFile = args[1];
    const importFormat = args.find(arg => arg.startsWith('--format='))?.split('=')[1] || 'json';
    if (inputFile) {
      importLogs(inputFile, importFormat);
    } else {
      console.error('❌ Please specify input file: node ai-agent-simple.js import <file>');
    }
    break;
    
  case 'clear':
    clearLogs();
    break;
    
  case 'help':
  default:
    console.log(`
🤖 AI Agent Helper for LetsfixThis

Usage:
  node ai-agent-simple.js <command> [options]

Commands:
  add-log --level=<level> --message=<message> [--file=<file>] [--line=<line>] [--stack=<stack>]
    Add a console log entry
    
  stats
    Show log statistics
    
  show
    Display all logs
    
  analyze
    Analyze logs and provide suggestions
    
  export <file> [--format=json|text]
    Export logs to file
    
  import <file> [--format=json|text]
    Import logs from file
    
  clear
    Clear all logs
    
  help
    Show this help message

Examples:
  node ai-agent-simple.js add-log --level=error --message="Cannot read property of undefined"
  node ai-agent-simple.js add-log --level=warn --message="Deprecated API usage" --file=app.js --line=42
  node ai-agent-simple.js analyze
  node ai-agent-simple.js export my-logs.json
  node ai-agent-simple.js import my-logs.json
    `);
    break;
}
