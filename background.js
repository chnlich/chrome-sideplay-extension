// Offscreen document 管理
let offscreenDocumentPath = 'offscreen.html';
let offscreenCreating = false;

// 创建或获取 offscreen document
async function setupOffscreenDocument() {
  // 检查是否已存在
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [chrome.runtime.getURL(offscreenDocumentPath)]
  });
  
  if (existingContexts.length > 0) {
    console.log('[SidePlay BG] Offscreen document already exists');
    return;
  }
  
  // 避免重复创建
  if (offscreenCreating) {
    console.log('[SidePlay BG] Waiting for offscreen document creation...');
    await new Promise(resolve => setTimeout(resolve, 500));
    return setupOffscreenDocument();
  }
  
  offscreenCreating = true;
  console.log('[SidePlay BG] Creating offscreen document...');
  
  try {
    await chrome.offscreen.createDocument({
      url: offscreenDocumentPath,
      reasons: ['USER_MEDIA'],
      justification: '处理音频流以实现声道选择功能'
    });
    console.log('[SidePlay BG] Offscreen document created');
    // 等待文档完全加载
    await new Promise(resolve => setTimeout(resolve, 500));
  } catch (error) {
    console.error('[SidePlay BG] Failed to create offscreen document:', error);
    throw error;
  } finally {
    offscreenCreating = false;
  }
}

// 发送消息到 offscreen document，带重试
async function sendToOffscreen(message, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await setupOffscreenDocument();
      console.log('[SidePlay BG] Sending message to offscreen:', message.action);
      const response = await chrome.runtime.sendMessage(message);
      console.log('[SidePlay BG] Got response:', response);
      return response;
    } catch (error) {
      console.error(`[SidePlay BG] Send failed (attempt ${i + 1}/${retries}):`, error);
      if (i < retries - 1) {
        console.log('[SidePlay BG] Retrying...');
        await new Promise(resolve => setTimeout(resolve, 500));
      } else {
        throw error;
      }
    }
  }
}

// 初始化标签页的音频 (从 popup 传来的 streamId)
async function initTabAudio(tabId, streamId) {
  return await sendToOffscreen({
    action: 'initAudio',
    tabId: tabId,
    streamId: streamId
  });
}

// 设置声道
async function setChannel(tabId, channel, streamId = null) {
  try {
    // 先尝试设置，如果失败可能是音频未初始化
    let result = await sendToOffscreen({
      action: 'setChannel',
      tabId: tabId,
      channel: channel
    });
    
    // 如果失败且提供了 streamId，先初始化再设置
    if (!result.success && result.error === '音频未初始化' && streamId) {
      console.log('[SidePlay BG] Audio not initialized, initializing...');
      const initResult = await initTabAudio(tabId, streamId);
      if (!initResult.success) {
        return initResult;
      }
      
      // 再次尝试设置
      result = await sendToOffscreen({
        action: 'setChannel',
        tabId: tabId,
        channel: channel
      });
    }
    
    if (result.success) {
      await chrome.storage.local.set({ [`channel_${tabId}`]: channel });
    }
    
    return result;
  } catch (error) {
    console.error('[SidePlay BG] setChannel error:', error);
    return { success: false, error: error.message };
  }
}

// 清理标签页
async function cleanupTab(tabId) {
  try {
    await sendToOffscreen({
      action: 'cleanup',
      tabId: tabId
    });
  } catch (error) {
    console.error('[SidePlay BG] cleanupTab error:', error);
  }
  await chrome.storage.local.remove(`channel_${tabId}`);
}

// 监听标签页关闭
chrome.tabs.onRemoved.addListener((tabId) => {
  cleanupTab(tabId);
});

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[SidePlay BG] Received message from popup:', request.action);
  
  if (request.action === 'setChannel') {
    setChannel(request.tabId, request.channel, request.streamId).then(sendResponse);
    return true; // 异步响应
  }
  
  if (request.action === 'getChannel') {
    chrome.storage.local.get(`channel_${request.tabId}`).then(result => {
      sendResponse({ channel: result[`channel_${request.tabId}`] || 'both' });
    });
    return true;
  }
  
  if (request.action === 'cleanup') {
    cleanupTab(request.tabId).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (request.action === 'initAudio') {
    initTabAudio(request.tabId, request.streamId).then(sendResponse);
    return true;
  }
});

console.log('[SidePlay BG] Service worker loaded');
