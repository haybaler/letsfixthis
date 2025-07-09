# Changelog

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
