# LetsfixThis

[![npm version](https://badge.fury.io/js/letsfixthis.svg)](https://badge.fury.io/js/letsfixthis)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js CI](https://github.com/haybaler/letsfixthis/workflows/CI%2FCD%20Pipeline/badge.svg)](https://github.com/haybaler/letsfixthis/actions)
[![Downloads](https://img.shields.io/npm/dm/letsfixthis.svg)](https://npmjs.org/package/letsfixthis)

A powerful CLI tool that captures browser developer console output and makes it available for AI coding agents like Cursor, Claude Code, GitHub Copilot, Windsurfer, and development platforms like V0, Bolt, Lovable, and Replit.

## 🚀 Features

- **Real-time Console Capture** - Captures all console logs, warnings, errors, and network issues
- **AI Agent Integration** - Formats output specifically for different AI coding agents
- **Browser Extension** - Easy-to-install extension for seamless integration
- **Multiple Output Formats** - JSON, text, and structured formats
- **WebSocket & HTTP APIs** - Real-time streaming and REST endpoints
- **Cross-Platform** - Works with any development environment

## 📦 Installation

### Requirements
- Node.js 18.0.0 or higher
- npm 8.0.0 or higher

### NPM (Recommended)
```bash
npm install -g letsfixthis
```

### From Source
```bash
git clone https://github.com/haybaler/letsfixthis.git
cd letsfixthis
npm install
npm run build
npm link  # For global installation
```

### Docker
```bash
docker run -p 8080:8080 haybaler/letsfixthis:latest
```

### 2. Install Browser Extension

1. Open Chrome/Edge and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `extension/` folder
4. The extension icon should appear in your browser toolbar

### 3. Configure Extension (Optional)

By default, the extension connects to `http://localhost:8080`. To use a different server:

1. Click the extension icon and then click "⚙️ Settings"
2. Enter your server URL (e.g., `http://192.168.1.100:8080` or `https://my-server.com:8080`)
3. Click "Save Settings" and test the connection

The extension supports any host - local, network, or remote servers.

## 🔧 Usage

### Start the CLI Server

```bash
# Start with default settings
letsfixthis start

# Custom port and format
letsfixthis start --port 3000 --format structured

# Watch mode with file output
letsfixthis start --watch --output logs.json
```

### Capture Console State

```bash
# Get current logs in JSON format
letsfixthis capture

# Export to file with specific format
letsfixthis capture --format text --output console-logs.txt
```

### AI Agent Integration

```bash
# Get formatted output for specific AI agents
letsfixthis agent-info --agent cursor
letsfixthis agent-info --agent claude
letsfixthis agent-info --agent copilot
letsfixthis agent-info --agent windsurfer
```

## 🤖 AI Agent Support

### Cursor
```bash
letsfixthis agent-info --agent cursor
```
Returns structured error data with actionable suggestions.

### Claude Code
```bash
letsfixthis agent-info --agent claude
```
Provides detailed markdown analysis with context.

### GitHub Copilot
```bash
letsfixthis agent-info --agent copilot
```
Formats as developer context for better code completion.

### Windsurfer
```bash
letsfixthis agent-info --agent windsurfer
```
Browser state format optimized for web development workflows.

## 🌐 Browser Extension

The browser extension automatically:
- Captures all console output (logs, warnings, errors)
- Intercepts network errors
- Handles unhandled promise rejections
- Shows connection status indicator
- Queues logs when server is offline

### Extension Features
- ✅ Real-time connection status
- 🔄 Automatic reconnection
- 📊 Log statistics in popup
- 🧪 Test log generation
- 📤 Export functionality

## 🔌 API Endpoints

### WebSocket
- `ws://[your-server]:8080` - Real-time log streaming

### HTTP REST API
- `GET http://[your-server]:8080/api/logs` - Get all captured logs
- `POST http://[your-server]:8080/api/logs` - Add a new log entry
- `GET http://[your-server]:8080/api/agent-info/:agent` - Get agent-specific formatted data

Replace `[your-server]` with your actual server address (e.g., `localhost`, `192.168.1.100`, `my-server.com`)

## 📋 Output Formats

### JSON Format
```json
{
  "metadata": {
    "total_logs": 45,
    "timestamp": "2025-01-07T...",
    "format": "json"
  },
  "logs": [...]}
}
```

### Structured Format
```json
{
  "summary": {
    "total": 45,
    "errors": 3,
    "warnings": 7,
    "network_issues": 1
  },
  "critical_issues": [...],
  "warnings": [...],
  "recent_activity": [...]
}
```

### Text Format
```
=== Dev Console Logs (45 entries) ===
Generated: 2025-01-07T...

[2025-01-07T...] ERROR: Uncaught TypeError: Cannot read property 'foo' of undefined
  Source: https://example.com/app.js:123:45
  Stack: TypeError: Cannot read property 'foo' of undefined...
---
```

## 🛠️ Development

### Build from Source
```bash
git clone https://github.com/haybaler/letsfixthis.git
cd letsfixthis
npm install
npm run build
```

### Running on Different Hosts

To make the server accessible from other devices on your network:

```bash
# Start server on all network interfaces
letsfixthis start --host 0.0.0.0 --port 8080

# Find your local IP address
# On macOS/Linux: ifconfig or ip addr
# On Windows: ipconfig

# Configure the extension to connect to:
# http://YOUR_LOCAL_IP:8080
```

For production deployments, use a reverse proxy (nginx, Apache) with HTTPS.

### Development Mode
```bash
npm run dev
# or
npm run watch
```

### Project Structure
```
src/
├── cli.ts                 # Main CLI interface
├── server/
│   └── websocket-server.ts # WebSocket & HTTP server
├── capture/
│   └── log-capture.ts     # Log storage & management
├── output/
│   └── formatter.ts       # Output formatting
└── types/
    └── index.ts          # TypeScript definitions

extension/
├── manifest.json         # Extension manifest
├── content-script.js     # Console capture script
├── background.js         # Background service worker
├── popup.html           # Extension popup UI
└── popup.js             # Popup functionality
```

## 🔧 Configuration

### Environment Variables
- `DEV_CONSOLE_PORT` - Default server port (default: 8080)
- `DEV_CONSOLE_FORMAT` - Default output format (default: json)

### CLI Options
- `--port, -p` - Server port
- `--format, -f` - Output format (json|text|structured)
- `--output, -o` - Output file path
- `--watch, -w` - Watch mode for continuous capture
- `--agent, -a` - Target AI agent for formatting

## 🤝 Integration Examples

### With Cursor
```bash
# Get current errors for Cursor to analyze
letsfixthis agent-info --agent cursor | cursor-import
```

### With Claude Code
```bash
# Export detailed analysis
letsfixthis agent-info --agent claude > context.md
```

### With Development Workflows
```bash
# Start server in background
letsfixthis start --watch &

# Your development process...
npm run dev

# Get logs when needed
letsfixthis capture --format structured
```

## 🎯 Use Cases

1. **Debugging Support** - Capture console errors for AI analysis
2. **Code Review** - Export logs for AI-assisted code review
3. **Development Assistance** - Real-time error context for AI agents
4. **Testing Integration** - Capture test output for AI analysis
5. **Learning & Training** - Provide context to AI for educational purposes

## 📜 License

MIT License - see LICENSE file for details

## 🚀 CI/CD Setup

This project includes automated CI/CD pipelines. For maintainers:

### NPM Publishing
Set the `NPM_TOKEN` secret in your repository settings to enable automatic npm publishing on releases.

### Docker Publishing
To enable Docker Hub publishing, set these secrets in your repository settings:
- `DOCKERHUB_USERNAME` - Your Docker Hub username
- `DOCKERHUB_TOKEN` - Your Docker Hub access token

Without these secrets, the workflow will still build Docker images locally for testing but won't push to registries.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 🆘 Support

- **Issues**: Open an issue on GitHub
- **Documentation**: Check the wiki for detailed guides
- **Community**: Join discussions in the repository

---

**Made for developers who want AI agents to understand their browser context** 🚀
