# Contributing to Dev Console CLI Bridge

Thank you for your interest in contributing to the Dev Console CLI Bridge! This project aims to make browser console debugging more accessible to AI coding agents.

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn
- A modern browser (Chrome, Edge, Firefox)

**Note**: This project uses `package-lock.json` for development consistency, but it's not published to npm (users generate their own lockfile during installation).

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/dev-console-cli-bridge.git
   cd dev-console-cli-bridge
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the project**
   ```bash
   npm run build
   ```

4. **Test the CLI**
   ```bash
   node dist/cli.js --help
   ```

5. **Load the browser extension**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `extension/` folder

## 🛠️ Development Workflow

### Making Changes

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Edit TypeScript files in `src/`
   - Update browser extension in `extension/`
   - Add tests if applicable

3. **Build and test**
   ```bash
   npm run build
   ./start.sh  # Test the server
   ```

4. **Test with the demo page**
   Open `demo.html` in your browser to test the extension

### Code Style

- Use TypeScript for type safety
- Follow existing code patterns
- Add JSDoc comments for public APIs
- Use meaningful variable and function names
- Keep functions small and focused

### Commit Messages

Use conventional commit format:
- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `refactor:` for code refactoring
- `test:` for adding tests

Example: `feat: add support for custom WebSocket ports`

## 🧪 Testing

### Manual Testing
1. Start the server: `./start.sh`
2. Open `demo.html` in your browser
3. Click test buttons to generate logs
4. Verify logs are captured: `node dist/cli.js capture`

### Browser Extension Testing
1. Install the extension in developer mode
2. Navigate to any website
3. Open developer console and generate logs
4. Check if logs appear in the CLI

### AI Agent Integration Testing
```bash
# Test different agent formats
node dist/cli.js agent-info --agent cursor
node dist/cli.js agent-info --agent claude
node dist/cli.js agent-info --agent copilot
node dist/cli.js agent-info --agent windsurfer
```

## 🎯 Areas for Contribution

### High Priority
- [ ] Add comprehensive unit tests
- [ ] Firefox extension support
- [ ] Performance optimizations for large log volumes
- [ ] Better error handling and user feedback

### Medium Priority
- [ ] Additional output formats
- [ ] Log filtering and search capabilities
- [ ] Integration with more AI agents
- [ ] Configuration file support

### Low Priority
- [ ] GUI application
- [ ] Log visualization
- [ ] Cloud storage integration
- [ ] Real-time collaboration features

## 📝 Documentation

When contributing, please:
- Update README.md if you add new features
- Add inline code documentation
- Update CLI help text if you add new commands
- Consider adding examples to the demo page

## 🐛 Bug Reports

When reporting bugs, please include:
- Operating system and version
- Node.js version
- Browser and version
- Steps to reproduce
- Expected vs actual behavior
- Console logs and error messages

## 💡 Feature Requests

For feature requests:
- Describe the use case
- Explain how it would benefit users
- Consider backward compatibility
- Suggest implementation approach if possible

## 🤝 Pull Request Process

1. **Fork the repository**
2. **Create your feature branch** from `main`
3. **Make your changes** following the guidelines above
4. **Test thoroughly**
5. **Update documentation** as needed
6. **Submit a pull request** with:
   - Clear description of changes
   - Why the change is needed
   - How it's been tested
   - Screenshots if UI changes

### PR Review Process
- Maintainers will review within 48 hours
- Address any requested changes
- Once approved, maintainers will merge

## 📜 Code of Conduct

- Be respectful and inclusive
- Focus on what's best for the community
- Show empathy towards other contributors
- Accept constructive criticism gracefully

## 🏆 Recognition

Contributors will be:
- Added to the README.md contributors section
- Mentioned in release notes for significant contributions
- Given commit access for sustained, quality contributions

## ❓ Questions?

- Open an issue for questions about the codebase
- Check existing issues and discussions first
- For general usage questions, see the README.md

Thank you for contributing! 🚀
