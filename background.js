// SidePlay Background - Content Script Manager

console.log('[SidePlay BG] Service worker started');

// Inject content script into tab
async function injectContentScript(tabId) {
  console.log('[SidePlay BG] Injecting content script into tab', tabId);
  
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    });
    console.log('[SidePlay BG] Content script injected');
    return { success: true };
  } catch (error) {
    console.error('[SidePlay BG] Failed to inject:', error);
    return { success: false, error: error.message };
  }
}

// Send message to content script
async function sendToContent(tabId, message) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, message);
    return response;
  } catch (error) {
    // Content script not loaded, try to inject
    if (error.message.includes('Receiving end does not exist')) {
      console.log('[SidePlay BG] Content script not loaded, injecting...');
      const injectResult = await injectContentScript(tabId);
      if (!injectResult.success) {
        return { success: false, error: '无法注入脚本: ' + injectResult.error };
      }
      
      // Wait a bit for script to initialize
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Try again
      try {
        const response = await chrome.tabs.sendMessage(tabId, message);
        return response;
      } catch (error2) {
        return { success: false, error: error2.message };
      }
    }
    return { success: false, error: error.message };
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
        // Store setting
        chrome.storage.local.set({ [`channel_${request.tabId}`]: request.channel });
      }
      sendResponse(response || { success: false, error: 'No response from content script' });
    });
    return true;
  }
  
  if (request.action === 'getChannel') {
    // First try content script
    sendToContent(request.tabId, { action: 'getChannel' })
      .then(response => {
        if (response && response.channel) {
          sendResponse(response);
        } else {
          // Fall back to storage
          chrome.storage.local.get(`channel_${request.tabId}`).then(result => {
            sendResponse({ channel: result[`channel_${request.tabId}`] || 'both' });
          });
        }
      })
      .catch(() => {
        chrome.storage.local.get(`channel_${request.tabId}`).then(result => {
          sendResponse({ channel: result[`channel_${request.tabId}`] || 'both' });
        });
      });
    return true;
  }
  
  if (request.action === 'scanAudio') {
    sendToContent(request.tabId, { action: 'scanAudioElements' })
      .then(response => sendResponse(response || { success: false }));
    return true;
  }
  
  if (request.action === 'ping') {
    sendResponse({ success: true, pong: true });
  }
});

// Clean up when tab closes
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.local.remove(`channel_${tabId}`);
});

console.log('[SidePlay BG] Setup complete');
