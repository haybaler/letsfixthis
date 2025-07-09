# Installation Fix Guide

## The Issue
The `npm link` command failed with an invalid tag name error. This is likely due to a character encoding issue or npm cache problem.

## Quick Fix Solutions

### Option 1: Install the working version directly from npm (Recommended)
```bash
# First, uninstall any existing version
npm uninstall -g letsfixthis

# Install the published version
npm install -g letsfixthis@2.0.0
```

### Option 2: Manual installation from source
```bash
# In the cloned directory
cd letsfixthis

# Clean and rebuild
npm run build

# Install globally using npm pack
npm pack
npm install -g ./letsfixthis-2.0.0.tgz
```

### Option 3: Use npx (no installation needed)
```bash
# Run directly without global installation
npx letsfixthis@2.0.0 --help
npx letsfixthis@2.0.0 start
```

### Option 4: Clean npm cache and retry
```bash
# Clean npm cache
npm cache clean --force

# Try npm link again
npm link
```

## Verification
After installation, verify it works:
```bash
letsfixthis --help
letsfixthis start
```

## Common Issues and Solutions

### 1. Permission Issues (macOS/Linux)
```bash
sudo npm install -g letsfixthis@2.0.0
```

### 2. Node Version Issues
Make sure you have Node.js 18.0.0 or higher:
```bash
node --version
```

### 3. Cache Issues
```bash
npm cache clean --force
npm install -g letsfixthis@2.0.0
```

## Browser Extension Installation
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `extension/` folder from the cloned repo
4. The extension will appear in your browser

## Testing the Installation
```bash
# Start the server
letsfixthis start

# In another terminal, test the API
curl http://localhost:8080/api/logs

# Test the capture command
letsfixthis capture
```

The tool should now be working properly!
