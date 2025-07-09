#!/bin/bash

# Dev Console CLI Bridge - Quick Start Script

echo "🚀 Dev Console CLI Bridge - Quick Start"
echo "======================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not available. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm are available"
echo ""

# Build the project if dist doesn't exist
if [ ! -d "dist" ]; then
    echo "🔨 Building project..."
    npm run build
    if [ $? -ne 0 ]; then
        echo "❌ Build failed. Please check the error messages above."
        exit 1
    fi
    echo "✅ Build completed"
    echo ""
fi

# Set default values
PORT=${PORT:-8080}
HOST=${HOST:-0.0.0.0}

# Start the server
echo "🚀 Starting Dev Console CLI Bridge server..."
echo ""
echo "📋 Instructions:"
echo "1. Install the browser extension from the 'extension/' folder"
echo "2. Configure the extension to connect to your server URL"
echo "3. Open the demo page: file://$(pwd)/demo.html"
echo "4. Open another terminal and run: node dist/cli.js capture"
echo "5. Or try: node dist/cli.js agent-info --agent cursor"
echo ""

if [ "$HOST" = "0.0.0.0" ]; then
    echo "Server starting on:"
    echo "  - http://localhost:$PORT"
    echo "  - http://$(hostname -I | awk '{print $1}'):$PORT (network access)"
else
    echo "Server starting on http://$HOST:$PORT"
fi

echo "Press Ctrl+C to stop the server"
echo ""

node dist/cli.js start --port $PORT --host $HOST
