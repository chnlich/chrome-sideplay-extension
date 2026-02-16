// Offscreen document 管理
const OFFSCREEN_DOCUMENT_PATH = 'offscreen.html';
let offscreenCreating = false;

console.log('[SidePlay BG] Service worker started');

// 检查 offscreen document 是否真的可用（通过 ping）
async function isOffscreenReady() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'ping' });
    return response && response.pong;
  } catch (error) {
    console.log('[SidePlay BG] Offscreen ping failed:', error.message);
    return false;
  }
}

// 关闭现有的 offscreen document
async function closeOffscreenDocument() {
  try {
    await chrome.offscreen.closeDocument();
    console.log('[SidePlay BG] Closed offscreen document');
    // 等待一小会儿确保完全关闭
    await new Promise(resolve => setTimeout(resolve, 200));
  } catch (error) {
    // 可能本来就没有
    console.log('[SidePlay BG] Close offscreen (may not exist):', error.message);
  }
}

// 创建或获取 offscreen document
async function setupOffscreenDocument() {
  // 检查是否已存在且可用
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH)]
  });
  
  if (existingContexts.length > 0) {
    console.log('[SidePlay BG] Offscreen document exists, checking if ready...');
    
    // 检查是否真的可用
    const isReady = await isOffscreenReady();
    if (isReady) {
      console.log('[SidePlay BG] Offscreen document is ready');
      return;
    }
    
    console.log('[SidePlay BG] Offscreen document exists but not responding, closing...');
    await closeOffscreenDocument();
  }
  
  // 避免重复创建
  if (offscreenCreating) {
    console.log('[SidePlay BG] Waiting for offscreen document creation...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    return setupOffscreenDocument();
  }
  
  offscreenCreating = true;
  console.log('[SidePlay BG] Creating offscreen document...');
  
  try {
    await chrome.offscreen.createDocument({
      url: OFFSCREEN_DOCUMENT_PATH,
      reasons: ['USER_MEDIA'],
      justification: '处理音频流以实现声道选择功能'
    });
    
    console.log('[SidePlay BG] Offscreen document created, waiting for load...');
    // 给更多时间让文档完全加载和初始化
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 验证是否真的可用
    const isReady = await isOffscreenReady();
    if (!isReady) {
      throw new Error('Offscreen document created but not responding to ping');
    }
    
    console.log('[SidePlay BG] Offscreen document ready');
    
  } catch (error) {
    console.error('[SidePlay BG] Failed to create offscreen document:', error);
    throw error;
  } finally {
    offscreenCreating = false;
  }
}

// 发送消息到 offscreen document，带重试和重建
async function sendToOffscreen(message, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await setupOffscreenDocument();
      console.log('[SidePlay BG] Sending message to offscreen:', message.action);
      const response = await chrome.runtime.sendMessage(message);
      console.log('[SidePlay BG] Got response:', response);
      return response;
    } catch (error) {
      console.error(`[SidePlay BG] Send failed (attempt ${i + 1}/${retries}):`, error.message);
      
      if (i < retries - 1) {
        console.log('[SidePlay BG] Will retry after closing and recreating offscreen...');
        await closeOffscreenDocument();
        await new Promise(resolve => setTimeout(resolve, 500));
      } else {
        throw error;
      }
    }
  }
}

// 初始化标签页的音频
async function initTabAudio(tabId, streamId) {
  return await sendToOffscreen({
    action: 'initAudio',
    tabId: tabId,
    streamId: streamId
  });
}

// 设置声道
async function setChannel(tabId, channel, streamId = null) {
  console.log('[SidePlay BG] setChannel called:', { tabId, channel, hasStreamId: !!streamId });
  
  try {
    // 先尝试设置，如果失败可能是音频未初始化
    let result;
    try {
      result = await sendToOffscreen({
        action: 'setChannel',
        tabId: tabId,
        channel: channel
      });
    } catch (error) {
      console.log('[SidePlay BG] First attempt failed:', error.message);
      result = { success: false, error: '音频未初始化' };
    }
    
    // 如果失败且提供了 streamId，先初始化再设置
    if (!result.success && result.error === '音频未初始化' && streamId) {
      console.log('[SidePlay BG] Audio not initialized, initializing with streamId...');
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
  console.log('[SidePlay BG] Tab closed:', tabId);
  cleanupTab(tabId);
});

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[SidePlay BG] Received message:', request.action, 'from', sender.id ? 'extension' : 'other');
  
  if (request.action === 'setChannel') {
    setChannel(request.tabId, request.channel, request.streamId)
      .then(result => {
        console.log('[SidePlay BG] setChannel result:', result);
        sendResponse(result);
      })
      .catch(error => {
        console.error('[SidePlay BG] setChannel error:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // 异步响应
  }
  
  if (request.action === 'getChannel') {
    chrome.storage.local.get(`channel_${request.tabId}`).then(result => {
      const channel = result[`channel_${request.tabId}`] || 'both';
      console.log('[SidePlay BG] getChannel for tab', request.tabId, ':', channel);
      sendResponse({ channel });
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
    initTabAudio(request.tabId, request.streamId)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

console.log('[SidePlay BG] Service worker setup complete');
