// Popup script
document.addEventListener('DOMContentLoaded', function() {
  const statusEl = document.getElementById('status');
  const logsCountEl = document.getElementById('logsCount');
  const testLogBtn = document.getElementById('testLog');
  const clearLogsBtn = document.getElementById('clearLogs');
  const exportLogsBtn = document.getElementById('exportLogs');
  const serverUrlInput = document.getElementById('serverUrl');
  const tokenInput = document.getElementById('authToken');
  const saveBtn = document.getElementById('saveSettings');

  let baseUrl = 'http://localhost:8080';
  let authToken = '';

  function loadSettings(cb) {
    chrome.storage.sync.get(['serverUrl', 'authToken'], (result) => {
      const url = result.serverUrl || 'ws://localhost:8080';
      baseUrl = url.replace(/^ws/, 'http');
      authToken = result.authToken || '';
      if (serverUrlInput) serverUrlInput.value = url;
      if (tokenInput) tokenInput.value = authToken;
      if (cb) cb();
    });
  }

  // Check server connection status
  async function checkServerStatus() {
    try {
      const url = `${baseUrl}/api/logs`;
      const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
      const response = await fetch(url, { headers });
      if (response.ok) {
        const data = await response.json();
        statusEl.className = 'status connected';
        statusEl.textContent = '✅ Connected to CLI Server';
        logsCountEl.textContent = `${data.length || 0} logs captured`;
        return true;
      } else {
        throw new Error('Server not responding');
      }
    } catch (error) {
      statusEl.className = 'status disconnected';
      statusEl.textContent = '❌ CLI Server not running';
      logsCountEl.textContent = 'Start server with: npx letsfixthis start';
      return false;
    }
  }

  // Test log functionality
  testLogBtn.addEventListener('click', function() {
    console.log('🧪 Test log from Dev Console CLI Bridge');
    console.warn('🧪 Test warning from extension');
    console.error('🧪 Test error from extension');
    
    setTimeout(() => {
      checkServerStatus();
    }, 500);
  });

  // Clear logs
  clearLogsBtn.addEventListener('click', async function() {
    try {
      const url = `${baseUrl}/api/logs`;
      const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
      const response = await fetch(url, {
        method: 'DELETE',
        headers
      });
      if (response.ok) {
        console.log('✅ Logs cleared');
        checkServerStatus();
      } else {
        console.error('❌ Failed to clear logs');
      }
    } catch (error) {
      console.error('❌ Error clearing logs:', error);
    }
  });

  // Export logs
  exportLogsBtn.addEventListener('click', async function() {
    try {
      const url = `${baseUrl}/api/logs`;
      const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
      const response = await fetch(url, { headers });
      if (response.ok) {
        const logs = await response.json();
        const dataStr = JSON.stringify(logs, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `console-logs-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
        console.log('📄 Logs exported');
      } else {
        throw new Error('Failed to fetch logs');
      }
    } catch (error) {
      console.error('❌ Error exporting logs:', error);
    }
  });

  saveBtn.addEventListener('click', function() {
    const serverUrl = serverUrlInput.value;
    const token = tokenInput.value;
    chrome.storage.sync.set({ serverUrl, authToken: token }, () => {
      loadSettings(checkServerStatus);
    });
  });

  // Initial status check
  loadSettings(checkServerStatus);
  
  // Periodic status check
  setInterval(checkServerStatus, 5000);
});
