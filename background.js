// Offscreen document 管理
let offscreenDocumentPath = 'offscreen.html';

// 创建或获取 offscreen document
async function setupOffscreenDocument() {
  // 检查是否已存在
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [chrome.runtime.getURL(offscreenDocumentPath)]
  });
  
  if (existingContexts.length > 0) {
    return;
  }
  
  // 创建 offscreen document
  await chrome.offscreen.createDocument({
    url: offscreenDocumentPath,
    reasons: ['USER_MEDIA'],
    justification: '处理音频流以实现声道选择功能'
  });
}

// 初始化标签页的音频
async function initTabAudio(tabId) {
  await setupOffscreenDocument();
  
  // 获取 stream ID
  const streamId = await chrome.tabCapture.getMediaStreamId({
    targetTabId: tabId
  });
  
  // 发送给 offscreen document 处理
  return await chrome.runtime.sendMessage({
    action: 'initAudio',
    tabId: tabId,
    streamId: streamId
  });
}

// 设置声道
async function setChannel(tabId, channel) {
  await setupOffscreenDocument();
  
  // 先尝试设置，如果失败可能是音频未初始化
  let result = await chrome.runtime.sendMessage({
    action: 'setChannel',
    tabId: tabId,
    channel: channel
  });
  
  // 如果失败，先初始化再设置
  if (!result.success && result.error === '音频未初始化') {
    const initResult = await initTabAudio(tabId);
    if (!initResult.success) {
      return initResult;
    }
    
    // 再次尝试设置
    result = await chrome.runtime.sendMessage({
      action: 'setChannel',
      tabId: tabId,
      channel: channel
    });
  }
  
  if (result.success) {
    await chrome.storage.local.set({ [`channel_${tabId}`]: channel });
  }
  
  return result;
}

// 清理标签页
async function cleanupTab(tabId) {
  await setupOffscreenDocument();
  await chrome.runtime.sendMessage({
    action: 'cleanup',
    tabId: tabId
  });
  await chrome.storage.local.remove(`channel_${tabId}`);
}

// 监听标签页关闭
chrome.tabs.onRemoved.addListener((tabId) => {
  cleanupTab(tabId);
});

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'setChannel') {
    setChannel(request.tabId, request.channel).then(sendResponse);
    return true;
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
});
