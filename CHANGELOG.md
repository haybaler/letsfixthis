# Changelog

## [3.1.0] - 2025-08-19

### Removed
- Browser extension and all related assets

### Changed
- Simplified architecture to be extension-free: capture via CLI, HTTP API, or WebSocket
- Updated server logs to say "WebSocket client" instead of "Browser extension"
- Updated README with Quick Start, Mermaid diagrams, and new workflows
- Docker compose and start script updated to remove extension references

### Added
- AI Agent guides and helper scripts for extension-free workflows

## [3.0.0] - 2025-08-19

### 🚀 Major Release: AI-Powered Debugging Assistant

This is a major release that transforms LetsfixThis from a simple console capture tool into an intelligent debugging assistant powered by cutting-edge AI technologies.

#### ✨ New Features

**🧠 AI Provider Integration**
- **Vercel AI SDK**: Unified interface for multiple AI models (OpenAI GPT-4, Claude)
- **Cerebrus**: Specialized debugging AI with deep code analysis (ready for API)
- **OpenAI Dev Tools**: Latest developer-focused features with function calling
- **Multi-Provider Analysis**: Compare insights from different AI models
- **Auto-Provider Selection**: Automatically selects the best available AI provider

**🎯 Enhanced CLI Commands**
- `letsfixthis analyze` - AI-powered console log analysis
- `letsfixthis agent-info --ai-provider <provider>` - AI-enhanced agent formatting
- Support for `vercel-ai`, `cerebrus`, `openai-dev`, and `auto` providers
- Detailed and JSON output formats

**📊 AI Analysis Features**
- **Priority Ranking**: Issues ranked as low/medium/high/critical
- **Confidence Scoring**: AI analysis quality assessment
- **Code Fix Suggestions**: Specific, actionable code improvements
- **Development Workflow**: Best practices and testing recommendations
- **Real-time Streaming**: Live AI analysis capabilities

**🔧 New API Endpoints**
- `GET /api/analyze?provider=<provider>` - AI analysis endpoint
- Enhanced `/api/agent-info/:agent?ai_provider=<provider>` - AI-enhanced agent info
- Updated `/api/discovery` - Now includes available AI providers

#### 🏗️ Technical Improvements

**Architecture**
- Modular AI provider system with easy extensibility
- Robust error handling and graceful fallbacks
- Type-safe TypeScript implementation
- Environment-based configuration

**Performance**
- Optimized AI analysis pipeline
- Efficient log processing and caching
- Reduced repository size by ~19MB through cleanup
- Faster build and deployment times

**Developer Experience**
- Comprehensive AI integration documentation
- Interactive demo page (`demo-ai.html`)
- Environment configuration template
- Updated CLI help and examples

#### 📦 Package Updates

**Dependencies**
- Added `ai@^3.0.0` - Vercel AI SDK
- Added `openai@^4.0.0` - OpenAI API client
- Added `@anthropic-ai/sdk@^0.18.0` - Anthropic API client
- Added `zod@^3.22.0` - Schema validation
- Added `dotenv@^16.3.0` - Environment management

**Configuration**
- Environment variables for AI provider API keys
- Optional custom API endpoints
- Backward-compatible configuration

#### 🧹 Repository Cleanup

**Removed Files**
- Unrelated aicommit tool files (~19MB saved)
- Outdated documentation (8 files)
- Old demo file (replaced by AI demo)
- Regeneratable extension package

**Updated Files**
- `package.json` - Updated to version 3.0.0 with AI dependencies
- `README.md` - Comprehensive AI integration documentation
- `demo-ai.html` - New interactive AI demo page
- `env.example` - AI provider configuration template

#### 🎯 Use Cases

**Development Debugging**
```bash
# AI-powered analysis
letsfixthis analyze --provider cerebrus --format detailed

# Agent-specific AI formatting
letsfixthis agent-info --agent cursor --ai-provider vercel-ai
```

**Continuous Monitoring**
```bash
# Start server with AI capabilities
letsfixthis start

# Real-time AI analysis via API
curl "http://localhost:8090/api/analyze?provider=all"
```

#### 🔮 Future Ready

- **Extensible Architecture**: Easy to add new AI providers
- **API Compatibility**: Ready for Cerebrus API when available
- **Scalable Design**: Supports team collaboration features
- **Ecosystem Integration**: Foundation for VS Code plugins, CI/CD integration

---

## [2.0.0] - 2025-07-09

### Added
- **Chrome Web Store Support**: Extension package ready for Chrome Web Store distribution
- **Enhanced Server**: Improved WebSocket and HTTP server with better error handling
- **Static File Serving**: Server now serves demo.html and extension files directly
- **AI Agent Integration**: Structured output for different AI coding agents (Cursor, Claude, Copilot, Windsurfer)
- **Authentication**: Optional token-based authentication for API and WebSocket connections
- **Enhanced CLI**: Better command structure with clear help text
- **Extension Packaging**: NPM script to create Chrome Web Store ready zip file

### Improved
- **TypeScript Support**: Full TypeScript implementation with proper type definitions
- **Error Handling**: Better error handling throughout the application
- **Documentation**: Comprehensive README with usage examples and setup instructions
- **Testing**: Improved test coverage and reliability
- **Code Structure**: Clean separation of concerns with modular architecture

### Fixed
- **CORS Issues**: Proper CORS configuration for browser extension integration
- **Static File Serving**: Fixed demo.html and extension file serving
- **Express Middleware**: Fixed authentication middleware implementation
- **TypeScript Compilation**: Resolved all TypeScript errors and warnings

### Technical Details
- Updated to Express 5.x
- Improved WebSocket handling
- Better log capture and storage
- Enhanced browser extension communication
- Proper static file serving configuration

## [1.0.0] - 2025-01-01

### Added
- Initial release
- Basic CLI functionality
- Browser extension
- WebSocket server
- Console log capture
- JSON output format
