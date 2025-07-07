// Background script for the extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Dev Console CLI Bridge extension installed');
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'LOG_CAPTURE') {
    // Handle log capture requests
    console.log('Log captured:', request.data);
    sendResponse({ success: true });
  }
});

// Keep track of active tabs
let activeTabs = new Set();

chrome.tabs.onActivated.addListener((activeInfo) => {
  activeTabs.add(activeInfo.tabId);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  activeTabs.delete(tabId);
});
