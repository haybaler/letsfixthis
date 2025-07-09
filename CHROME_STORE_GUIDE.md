# Chrome Web Store Publishing Guide

## Overview
This guide explains how to publish the LetsfixThis browser extension to the Chrome Web Store so users can install it directly from the store.

## Prerequisites

1. **Chrome Web Store Developer Account**
   - Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   - Pay the one-time $5 developer registration fee
   - Verify your identity

2. **Extension Package**
   - The extension is already prepared in the `extension/` folder
   - Run `npm run extension:zip` to create a distribution package

## Publishing Steps

### 1. Create Extension Package
```bash
npm run extension:zip
```
This creates `letsfixthis-extension.zip` ready for upload.

### 2. Upload to Chrome Web Store

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Click "Add new item"
3. Upload the `letsfixthis-extension.zip` file
4. Fill in the store listing information:

#### Store Listing Information:
- **Name**: LetsfixThis - Console Bridge
- **Summary**: Captures browser console output for AI coding agents
- **Description**: 
```
LetsfixThis Console Bridge captures browser developer console output and makes it available for AI coding agents like Cursor, Claude Code, GitHub Copilot, and Windsurfer.

Features:
• Real-time console log capture
• Error and warning detection
• Network error monitoring
• WebSocket connection to CLI tool
• Configurable server settings
• Connection status indicator
• Export functionality

Perfect for developers using AI coding assistants who need context about browser console output during debugging and development.

Setup:
1. Install the extension
2. Install the CLI tool: npm install -g letsfixthis
3. Start the server: letsfixthis start
4. Configure extension to connect to your server
```

- **Category**: Developer Tools
- **Language**: English

#### Privacy Information:
- **Privacy Policy**: Create a simple privacy policy (see below)
- **Permissions Justification**:
  - `activeTab`: To capture console output from the current tab
  - `scripting`: To inject content script for console monitoring
  - `storage`: To store server configuration settings

#### Screenshots:
You'll need to provide screenshots of:
1. Extension popup showing connection status
2. Console logs being captured
3. Extension settings/configuration

### 3. Privacy Policy
Create a simple privacy policy at your website or GitHub pages:

```markdown
# Privacy Policy for LetsfixThis Console Bridge

## Data Collection
This extension collects browser console logs (errors, warnings, info messages) only when actively connected to a local development server.

## Data Usage
- Console logs are sent to your local development server (localhost)
- No data is sent to external servers or third parties
- No personal information is collected or stored

## Data Storage
- Server connection settings are stored locally in the browser
- No cloud storage or external databases are used

## Contact
For questions about this privacy policy, contact: [your-email@example.com]
```

### 4. Review and Publish

1. Review all information
2. Submit for review
3. Review typically takes 1-3 business days
4. Once approved, the extension will be available in the Chrome Web Store

## Extension ID
After publishing, you'll get a unique extension ID like:
`chrome-extension://abcdefghijklmnopqrstuvwxyz123456/`

## Updating the Extension

To update the extension:
1. Update the version in `extension/manifest.json`
2. Run `npm run extension:zip`
3. Upload the new zip file to the Chrome Web Store dashboard
4. Submit for review

## Distribution
Once published, users can install the extension with:
- Direct link: `https://chrome.google.com/webstore/detail/[extension-id]`
- Search: "LetsfixThis Console Bridge" in Chrome Web Store

## Notes
- The extension requires the CLI tool to be running locally
- Users will need to configure the server URL in the extension popup
- Default server URL is `http://localhost:8080`
