// Content script that captures console logs and sends them to the CLI
(function() {
  'use strict';

  let ws = null;
  let serverUrl = 'ws://localhost:8080';
  let isConnected = false;
  let logQueue = [];

  // Store original console methods
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
    debug: console.debug
  };

  function connectWebSocket() {
    try {
      ws = new WebSocket(serverUrl);
      
      ws.onopen = function() {
        isConnected = true;
        console.log('🔌 Connected to LetsfixThis CLI');
        
        // Send queued logs
        while (logQueue.length > 0) {
          const log = logQueue.shift();
          ws.send(JSON.stringify(log));
        }
      };
      
      ws.onclose = function() {
        isConnected = false;
        console.log('🔌 Disconnected from LetsfixThis CLI');
        
        // Try to reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000);
      };
      
      ws.onerror = function(error) {
        console.error('WebSocket error:', error);
        isConnected = false;
      };
    } catch (error) {
      console.error('Failed to connect to LetsfixThis CLI:', error);
      // Try to reconnect after 5 seconds
      setTimeout(connectWebSocket, 5000);
    }
  }

  function sendLog(level, args, error = null) {
    const logEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      level: level,
      message: args.map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2);
          } catch (e) {
            return '[Object]';
          }
        }
        return String(arg);
      }).join(' '),
      args: args.map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.parse(JSON.stringify(arg));
          } catch (e) {
            return '[Circular or Complex Object]';
          }
        }
        return arg;
      }),
      url: window.location.href,
      type: 'console',
      source: 'browser'
    };

    if (error && error.stack) {
      logEntry.stack = error.stack;
      logEntry.lineNumber = error.lineNumber;
      logEntry.columnNumber = error.columnNumber;
    }

    if (isConnected && ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(logEntry));
    } else {
      logQueue.push(logEntry);
      
      // Fallback: send via HTTP if WebSocket is not available
      fetch('http://localhost:8080/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logEntry)
      }).catch(() => {
        // Silently fail if server is not running
      });
    }
  }

  // Override console methods
  console.log = function(...args) {
    originalConsole.log.apply(console, args);
    sendLog('log', args);
  };

  console.warn = function(...args) {
    originalConsole.warn.apply(console, args);
    sendLog('warn', args);
  };

  console.error = function(...args) {
    originalConsole.error.apply(console, args);
    sendLog('error', args);
  };

  console.info = function(...args) {
    originalConsole.info.apply(console, args);
    sendLog('info', args);
  };

  console.debug = function(...args) {
    originalConsole.debug.apply(console, args);
    sendLog('debug', args);
  };

  // Capture unhandled errors
  window.addEventListener('error', function(event) {
    sendLog('error', [event.message], {
      stack: event.error ? event.error.stack : '',
      lineNumber: event.lineno,
      columnNumber: event.colno
    });
  });

  // Capture unhandled promise rejections
  window.addEventListener('unhandledrejection', function(event) {
    sendLog('error', [`Unhandled Promise Rejection: ${event.reason}`], {
      stack: event.reason && event.reason.stack ? event.reason.stack : ''
    });
  });

  // Capture network errors (basic implementation)
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    return originalFetch.apply(this, args)
      .then(response => {
        if (!response.ok) {
          sendLog('error', [`Network Error: ${response.status} ${response.statusText} - ${args[0]}`]);
        }
        return response;
      })
      .catch(error => {
        sendLog('error', [`Fetch Error: ${error.message} - ${args[0]}`], error);
        throw error;
      });
  };

  // Initialize WebSocket connection
  connectWebSocket();

  // Add visual indicator
  const indicator = document.createElement('div');
  indicator.id = 'letsfixthis-indicator';
  indicator.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: #007acc;
    color: white;
    padding: 5px 10px;
    border-radius: 3px;
    font-family: monospace;
    font-size: 12px;
    z-index: 10000;
    pointer-events: none;
    opacity: 0.8;
  `;
  indicator.textContent = '🔌 LetsfixThis';
  
  // Add indicator when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      document.body.appendChild(indicator);
    });
  } else {
    document.body.appendChild(indicator);
  }

  // Update indicator based on connection status
  function updateIndicator() {
    if (indicator) {
      indicator.textContent = isConnected ? '🔌 LetsfixThis ✓' : '🔌 LetsfixThis ✗';
      indicator.style.background = isConnected ? '#28a745' : '#dc3545';
    }
  }

  // Update indicator every second
  setInterval(updateIndicator, 1000);

})();
