# 🤖 AI Agent Guide: Working with LetsfixThis

## 🎯 **Problem Solved**

The browser extension adds complexity that makes it difficult for AI agents to work with the codebase directly. This guide provides **simple, direct methods** for AI agents to interact with LetsfixThis without needing the extension.

## 🚀 **Quick Start for AI Agents**

### **Option 1: Simple Node.js Script (Recommended)**

Use the standalone script that works without any setup:

```bash
# Add a console log entry
node ai-agent-simple.js add-log --level=error --message="Cannot read property of undefined"

# Analyze logs
node ai-agent-simple.js analyze

# Get statistics
node ai-agent-simple.js stats

# Export logs
node ai-agent-simple.js export my-logs.json

# Import logs
node ai-agent-simple.js import my-logs.json
```

### **Option 2: Direct CLI Commands**

Use the enhanced CLI with direct capture mode:

```bash
# Start direct capture mode (no extension needed)
letsfixthis capture-direct

# Add logs manually
letsfixthis add-log --level error --message "Something went wrong"

# Import logs from file
letsfixthis import-logs console-output.json

# Interactive mode
letsfixthis interactive

# Analyze with AI
letsfixthis analyze-direct --provider vercel-ai
```

### **Option 3: Programmatic API**

Use the AIAgentHelper class in your code:

```javascript
import { AIAgentHelper } from './src/ai-agent-helper';

const helper = new AIAgentHelper();

// Add logs
await helper.addLog({
  level: 'error',
  message: 'Cannot read property of undefined',
  url: 'app.js',
  lineNumber: 42
});

// Analyze with AI
const analysis = await helper.analyzeLogs('vercel-ai');
console.log(analysis);
```

## 📋 **Common AI Agent Workflows**

### **1. Debugging Session**

```bash
# Start by adding the error you're debugging
node ai-agent-simple.js add-log --level=error --message="TypeError: Cannot read property 'foo' of undefined" --file=app.js --line=15

# Add related warnings
node ai-agent-simple.js add-log --level=warn --message="Deprecated API usage" --file=utils.js --line=8

# Analyze the situation
node ai-agent-simple.js analyze
```

### **2. Code Review**

```bash
# Import logs from a file
node ai-agent-simple.js import console-output.json

# Get statistics
node ai-agent-simple.js stats

# Analyze with AI
letsfixthis analyze-direct --provider cerebrus --format detailed
```

### **3. Continuous Monitoring**

```bash
# Start direct capture server
letsfixthis capture-direct --auto-analyze --watch

# In another process, add logs via HTTP API
curl -X POST http://localhost:8090/api/logs \
  -H "Content-Type: application/json" \
  -d '{"level":"error","message":"Network request failed"}'
```

## 🔧 **Integration Methods**

### **Method 1: Direct File Operations**

AI agents can work directly with log files:

```bash
# Create logs manually
echo '[2025-08-19T10:30:00.000Z] ERROR: Cannot read property of undefined' > console-logs.txt
echo '[2025-08-19T10:30:01.000Z] WARN: Deprecated API usage' >> console-logs.txt

# Import and analyze
node ai-agent-simple.js import console-logs.txt --format=text
node ai-agent-simple.js analyze
```

### **Method 2: HTTP API**

Use the REST API for programmatic access:

```bash
# Add a log
curl -X POST http://localhost:8090/api/logs \
  -H "Content-Type: application/json" \
  -d '{
    "level": "error",
    "message": "Network request failed",
    "url": "api.js",
    "lineNumber": 25
  }'

# Get analysis
curl "http://localhost:8090/api/analyze?provider=vercel-ai"
```

### **Method 3: WebSocket (Real-time)**

For real-time log streaming:

```javascript
const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:8090');

ws.on('open', () => {
  // Send a log entry
  ws.send(JSON.stringify({
    level: 'error',
    message: 'Something went wrong',
    url: 'app.js',
    lineNumber: 42
  }));
});
```

## 📊 **AI Analysis Features**

### **Available AI Providers**

1. **Vercel AI SDK** - Multi-model support (GPT-4, Claude)
2. **Cerebrus** - Specialized debugging AI
3. **OpenAI Dev Tools** - Developer-focused analysis

### **Analysis Output**

```json
{
  "summary": "Found 5 console entries with 2 errors requiring attention",
  "suggestions": [
    "Focus on resolving JavaScript runtime errors first",
    "Check for undefined variables and missing imports"
  ],
  "priority": "high",
  "codeFixes": [
    "Add null checks before accessing object properties",
    "Check variable scope and import statements"
  ],
  "explanations": [
    "2 JavaScript errors detected that may cause runtime issues"
  ],
  "confidence": 0.85
}
```

## 🎯 **AI Agent Use Cases**

### **1. Code Review Assistant**

```bash
# Import logs from a pull request
node ai-agent-simple.js import pr-console-logs.json

# Analyze with AI
letsfixthis analyze-direct --provider cerebrus --format detailed

# Export analysis for review
letsfixthis analyze-direct --save analysis-report.json
```

### **2. Debugging Helper**

```bash
# Add the error you're debugging
node ai-agent-simple.js add-log --level=error --message="TypeError: Cannot read property 'foo' of undefined" --file=src/components/UserProfile.jsx --line=23

# Get AI suggestions
node ai-agent-simple.js analyze
```

### **3. Testing Integration**

```bash
# Import test console output
node ai-agent-simple.js import test-output.json

# Analyze test failures
letsfixthis analyze-direct --provider openai-dev --format detailed
```

### **4. Performance Monitoring**

```bash
# Add performance warnings
node ai-agent-simple.js add-log --level=warn --message="Large bundle size detected" --file=webpack.config.js
node ai-agent-simple.js add-log --level=warn --message="Memory usage high" --file=server.js

# Get optimization suggestions
letsfixthis analyze-direct --provider vercel-ai
```

## 🔧 **Configuration**

### **Environment Setup**

```bash
# Copy environment template
cp env.example .env

# Add AI provider API keys (optional)
echo "OPENAI_API_KEY=your_key_here" >> .env
echo "ANTHROPIC_API_KEY=your_key_here" >> .env
```

### **Log File Location**

By default, logs are stored in:
- `console-logs.json` (simple script)
- `./console-logs.json` (CLI mode)
- Custom location via `--log-file` option

## 📚 **Examples**

### **Example 1: Debugging a React Error**

```bash
# Add the error
node ai-agent-simple.js add-log --level=error --message="Warning: Can't perform a React state update on an unmounted component" --file=src/components/Counter.jsx --line=15

# Get AI analysis
node ai-agent-simple.js analyze
```

### **Example 2: API Integration Issues**

```bash
# Add network errors
node ai-agent-simple.js add-log --level=error --message="Failed to fetch: 404 Not Found" --file=src/api/users.js --line=8
node ai-agent-simple.js add-log --level=error --message="Network request failed" --file=src/api/posts.js --line=12

# Analyze with debugging focus
letsfixthis analyze-direct --provider cerebrus --format detailed
```

### **Example 3: Performance Analysis**

```bash
# Import performance logs
node ai-agent-simple.js import performance-logs.json

# Get optimization suggestions
letsfixthis analyze-direct --provider openai-dev --save performance-analysis.json
```

## 🎉 **Benefits for AI Agents**

### **✅ No Extension Complexity**
- Works directly with CLI and files
- No browser setup required
- No extension installation needed

### **✅ Simple Integration**
- Direct file operations
- HTTP API access
- WebSocket real-time streaming

### **✅ AI-Powered Analysis**
- Multiple AI providers
- Structured output
- Actionable suggestions

### **✅ Flexible Workflows**
- Manual log entry
- File import/export
- Real-time streaming
- Batch processing

## 🚀 **Getting Started**

1. **Choose your method**:
   - Simple script: `node ai-agent-simple.js`
   - CLI commands: `letsfixthis capture-direct`
   - Programmatic: `AIAgentHelper` class

2. **Add your logs**:
   - Manual entry
   - File import
   - HTTP API
   - WebSocket

3. **Analyze with AI**:
   - Basic analysis: `node ai-agent-simple.js analyze`
   - AI-powered: `letsfixthis analyze-direct --provider vercel-ai`

4. **Get results**:
   - Console output
   - JSON files
   - Structured analysis

---

**🎯 Result**: AI agents can now work directly with the codebase using simple, direct methods without the complexity of browser extensions!
