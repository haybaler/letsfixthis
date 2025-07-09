// Content script that captures console logs and sends them to the CLI
(async function() {
  'use strict';

  let ws = null;
  let config = null;
  let serverUrl = 'ws://localhost:8090';
  let authToken = '';
  let isConnected = false;
  let logQueue = [];

  // Load configuration with auto-discovery support
  async function loadConfig() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['scrapershot_config', 'serverUrl', 'authToken'], (result) => {
        // Try new config system first
        if (result.scrapershot_config) {
          config = result.scrapershot_config;
          // Convert HTTP URL to WebSocket URL
          if (config.serverUrl) {
            try {
              const url = new URL(config.serverUrl);
              const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
              serverUrl = `${wsProtocol}//${url.host}`;
            } catch (e) {
              serverUrl = config.serverUrl.replace(/^https?:/, 'ws:');
            }
          }
        } else if (result.serverUrl) {
          // Fallback to old config
          serverUrl = result.serverUrl;
        }
        
        if (result.authToken) authToken = result.authToken;
        resolve();
      });
    });
  }

  // Store original console methods
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
    debug: console.debug
  };

  async function connectWebSocket() {
    try {
      const wsUrl = authToken ? `${serverUrl}?token=${encodeURIComponent(authToken)}` : serverUrl;
      ws = new WebSocket(wsUrl);
      
      ws.onopen = function() {
        isConnected = true;
        originalConsole.log('🔌 Connected to LetsfixThis CLI');
        
        // Send queued logs
        while (logQueue.length > 0) {
          const log = logQueue.shift();
          ws.send(JSON.stringify(log));
        }
      };
      
      ws.onclose = function() {
        isConnected = false;
        originalConsole.log('🔌 Disconnected from LetsfixThis CLI');
        
        // Try to reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000);
      };
      
      ws.onerror = function() {
        // Don't log WebSocket errors to avoid circular logging
        isConnected = false;
      };
    } catch (error) {
      // Don't log connection errors to avoid circular logging
      // Try to reconnect after 5 seconds
      setTimeout(connectWebSocket, 5000);
    }
  }

  function sendLog(level, args, error = null) {
    const logEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
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
      const httpBase = serverUrl.replace(/^ws/, 'http');
      const url = `${httpBase}/api/logs`;
      const headers = {
        'Content-Type': 'application/json',
      };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      fetch(url, {
        method: 'POST',
        headers,
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

  // Initialize configuration and WebSocket connection
  await loadConfig();
  connectWebSocket();

  // Listen for configuration changes
  chrome.storage.onChanged.addListener(async (_, namespace) => {
    if (namespace === 'sync') {
      await loadConfig();
      // Reconnect with new server URL
      if (ws) {
        ws.close();
      }
      connectWebSocket();
    }
  });

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