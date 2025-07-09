// Settings page functionality
document.addEventListener('DOMContentLoaded', async function() {
  const form = document.getElementById('settingsForm');
  const serverUrlInput = document.getElementById('serverUrl');
  const autoDiscoverCheckbox = document.getElementById('autoDiscover');
  const testButton = document.getElementById('testConnection');
  const resetButton = document.getElementById('resetDefaults');
  const statusDiv = document.getElementById('status');
  
  // Load current settings
  const config = await getConfig();
  serverUrlInput.value = config.serverUrl;
  autoDiscoverCheckbox.checked = config.autoDiscover !== false;
  
  // Save settings
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const serverUrl = serverUrlInput.value.trim();
    
    // Validate URL
    try {
      new URL(serverUrl);
    } catch (e) {
      showStatus('Invalid URL format', 'error');
      return;
    }
    
    // Save configuration
    await saveConfig({
      serverUrl: serverUrl,
      wsProtocol: serverUrl.startsWith('https:') ? 'wss' : 'ws',
      apiTimeout: 30000,
      autoDiscover: autoDiscoverCheckbox.checked
    });
    
    showStatus('Settings saved successfully!', 'success');
  });
  
  // Test connection
  testButton.addEventListener('click', async () => {
    // If auto-discover is enabled, try discovery first
    if (autoDiscoverCheckbox.checked) {
      testButton.disabled = true;
      testButton.textContent = 'Discovering...';
      
      const discoveredUrl = await discoverServer();
      if (discoveredUrl) {
        serverUrlInput.value = discoveredUrl;
        showStatus(`🔍 Auto-discovered server at ${discoveredUrl}`, 'success');
        testButton.disabled = false;
        testButton.textContent = 'Test Connection';
        return;
      }
    }
    
    const serverUrl = serverUrlInput.value.trim();
    
    if (!serverUrl) {
      showStatus('Please enter a server URL', 'error');
      return;
    }
    
    testButton.disabled = true;
    testButton.textContent = 'Testing...';
    
    try {
      const response = await fetch(`${serverUrl}/api/logs`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        const data = await response.json();
        showStatus(`✅ Connected! ${data.length || 0} logs found.`, 'success');
      } else {
        showStatus(`❌ Server responded with: ${response.status} ${response.statusText}`, 'error');
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        showStatus('❌ Connection timeout - server not responding', 'error');
      } else if (error.message.includes('Failed to fetch')) {
        showStatus('❌ Cannot connect - is the server running?', 'error');
      } else {
        showStatus(`❌ Connection failed: ${error.message}`, 'error');
      }
    } finally {
      testButton.disabled = false;
      testButton.textContent = 'Test Connection';
    }
  });
  
  // Reset to defaults
  resetButton.addEventListener('click', async () => {
    serverUrlInput.value = 'http://localhost:8080';
    autoDiscoverCheckbox.checked = true;
    await saveConfig({
      serverUrl: 'http://localhost:8080',
      wsProtocol: 'ws',
      apiTimeout: 30000,
      autoDiscover: true
    });
    showStatus('Settings reset to defaults', 'success');
  });
  
  // Show status message
  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 5000);
  }
});