<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Dev Console CLI Bridge - Copilot Instructions

This is a CLI tool that captures browser developer console output and makes it available for AI coding agents like Cursor, Claude Code, GitHub Copilot, and Windsurfer.

## Project Structure
- `src/cli.ts` - Main CLI interface with commands
- `src/server/websocket-server.ts` - WebSocket and HTTP server for receiving browser data
- `src/capture/log-capture.ts` - Log storage and management
- `src/output/formatter.ts` - Output formatting for different AI agents
- `src/types/index.ts` - TypeScript type definitions
- `extension/` - Browser extension for capturing console logs

## Key Features
- Real-time console log capture via browser extension
- Multiple output formats (JSON, text, structured)
- WebSocket and HTTP API endpoints
- Agent-specific formatting for different AI tools
- Browser extension with visual connection indicator

## Development Guidelines
- Use TypeScript for type safety
- Follow the existing code patterns for error handling
- Ensure all console log types are captured (log, warn, error, info, debug)
- Maintain backward compatibility with existing CLI commands
- Test with multiple browser environments

## AI Agent Integration
The tool supports specific formatting for:
- Cursor: Focus on errors and actionable suggestions
- Claude Code: Detailed markdown format with analysis
- GitHub Copilot: Structured context for code completion
- Windsurfer: Browser state format for web development

When adding new features, consider how they impact AI agent workflows and provide clear, structured output that helps agents understand the current development context.
