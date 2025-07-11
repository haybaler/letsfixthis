// Background script for the extension with cross-browser support
const ext = typeof chrome !== 'undefined' ? chrome : (typeof browser !== 'undefined' ? browser : null);

if (ext && ext.runtime && ext.runtime.onInstalled) {
  ext.runtime.onInstalled.addListener(() => {
    console.log('Dev Console CLI Bridge extension installed');
  });
}

// Listen for messages from content scripts
if (ext && ext.runtime && ext.runtime.onMessage) {
  ext.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'LOG_CAPTURE') {
      // Handle log capture requests
      console.log('Log captured:', request.data);
      sendResponse({ success: true });
    }
  });
}

// Keep track of active tabs
let activeTabs = new Set();

if (ext && ext.tabs) {
  ext.tabs.onActivated.addListener((activeInfo) => {
    activeTabs.add(activeInfo.tabId);
  });

  ext.tabs.onRemoved.addListener((tabId) => {
    activeTabs.delete(tabId);
  });
}
