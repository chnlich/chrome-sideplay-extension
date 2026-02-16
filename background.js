// SidePlay Background - Content Script Communication
// Content script is auto-injected via manifest, no scripting permission needed

console.log('[SidePlay BG] Service worker started');

// Send message to content script
async function sendToContent(tabId, message) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, message);
    return response;
  } catch (error) {
    console.log('[SidePlay BG] Content script not ready:', error.message);
    return { success: false, error: 'Content script not ready, please refresh page' };
  }
}

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[SidePlay BG] Received message:', request.action);
  
  if (request.action === 'setChannel') {
    sendToContent(request.tabId, {
      action: 'setChannel',
      channel: request.channel
    }).then(response => {
      if (response && response.success) {
        chrome.storage.local.set({ [`channel_${request.tabId}`]: request.channel });
      }
      sendResponse(response || { success: false, error: 'No response' });
    });
    return true;
  }
  
  if (request.action === 'getChannel') {
    chrome.storage.local.get(`channel_${request.tabId}`).then(result => {
      sendResponse({ channel: result[`channel_${request.tabId}`] || 'both' });
    });
    return true;
  }
  
  if (request.action === 'ping') {
    sendResponse({ success: true });
  }
});

// Clean up when tab closes
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.local.remove(`channel_${tabId}`);
});

console.log('[SidePlay BG] Setup complete');
