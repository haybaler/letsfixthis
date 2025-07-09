// Configuration management for the Chrome extension
const CONFIG_KEY = 'scrapershot_config';

// Default configuration
const DEFAULT_CONFIG = {
  serverUrl: 'http://localhost:8090',
  wsProtocol: 'ws',
  apiTimeout: 30000,
  autoDiscover: true
};

// Common ports to scan for auto-discovery
const DISCOVERY_PORTS = [8090, 8080, 3000, 3001, 3030, 5000, 8000];

// Get configuration from Chrome storage
async function getConfig() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(CONFIG_KEY, async (result) => {
      const config = result[CONFIG_KEY] || DEFAULT_CONFIG;
      const mergedConfig = {...DEFAULT_CONFIG, ...config};
      
      // If auto-discovery is enabled, try to find the server
      if (mergedConfig.autoDiscover) {
        const discoveredUrl = await discoverServer();
        if (discoveredUrl && discoveredUrl !== mergedConfig.serverUrl) {
          mergedConfig.serverUrl = discoveredUrl;
          // Save the discovered URL
          await saveConfig(mergedConfig);
        }
      }
      
      resolve(mergedConfig);
    });
  });
}

// Save configuration to Chrome storage
async function saveConfig(config) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({
      [CONFIG_KEY]: config
    }, resolve);
  });
}

// Get WebSocket URL based on server URL
function getWebSocketUrl(serverUrl) {
  try {
    const url = new URL(serverUrl);
    const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${url.host}`;
  } catch (e) {
    // Fallback for invalid URLs
    return serverUrl.replace(/^https?:/, 'ws:');
  }
}

// Auto-discover server by scanning common ports
async function discoverServer() {
  // First, check for a server info file (if we can access filesystem via native messaging)
  // For now, we'll scan common ports
  
  for (const port of DISCOVERY_PORTS) {
    const url = `http://localhost:${port}`;
    try {
      const response = await fetch(`${url}/api/discovery`, {
        method: 'GET',
        signal: AbortSignal.timeout(1000) // 1 second timeout
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.service === 'letsfixthis') {
          console.log(`🔍 Auto-discovered server at ${url}`);
          return url;
        }
      }
    } catch (error) {
      // Server not found on this port, continue scanning
    }
  }
  
  return null;
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getConfig, saveConfig, getWebSocketUrl, discoverServer };
}