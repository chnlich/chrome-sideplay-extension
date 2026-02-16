let currentTabId = null;
let currentChannel = 'both';

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  // 获取当前标签页
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTabId = tab.id;
  
  // 更新标签页信息
  const tabInfo = document.getElementById('tabInfo');
  tabInfo.textContent = tab.title || tab.url;
  
  // 获取当前声道设置
  const response = await chrome.runtime.sendMessage({
    action: 'getChannel',
    tabId: currentTabId
  });
  currentChannel = response.channel || 'both';
  
  // 更新 UI
  updateUI(currentChannel);
  
  // 绑定点击事件
  document.querySelectorAll('.option').forEach(option => {
    option.addEventListener('click', () => {
      const channel = option.dataset.channel;
      setChannel(channel);
    });
  });
});

function updateUI(channel) {
  document.querySelectorAll('.option').forEach(option => {
    option.classList.remove('active');
  });
  document.getElementById(`opt${channel.charAt(0).toUpperCase() + channel.slice(1)}`).classList.add('active');
}

function showStatus(message, isError = false) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = `status ${isError ? 'error' : 'success'}`;
  status.style.display = 'block';
  
  setTimeout(() => {
    status.style.display = 'none';
  }, 3000);
}

async function setChannel(channel) {
  const status = document.getElementById('status');
  status.textContent = '应用设置中...';
  status.className = 'status';
  status.style.display = 'block';
  
  try {
    // 先尝试直接设置（可能已初始化过）
    let response = await chrome.runtime.sendMessage({
      action: 'setChannel',
      tabId: currentTabId,
      channel: channel
    });
    
    // 如果失败需要初始化，则获取 streamId 并重试
    if (!response.success && response.error === '音频未初始化') {
      status.textContent = '正在获取音频权限...';
      
      // 在用户手势上下文中获取 streamId
      const streamId = await chrome.tabCapture.getMediaStreamId({
        targetTabId: currentTabId
      });
      
      // 使用 streamId 重新调用
      response = await chrome.runtime.sendMessage({
        action: 'setChannel',
        tabId: currentTabId,
        channel: channel,
        streamId: streamId
      });
    }
    
    if (response.success) {
      currentChannel = channel;
      updateUI(channel);
      showStatus(`已切换到: ${getChannelName(channel)}`);
    } else {
      showStatus('错误: ' + (response.error || '无法应用设置'), true);
    }
  } catch (error) {
    showStatus('错误: ' + error.message, true);
  }
}

function getChannelName(channel) {
  switch (channel) {
    case 'left': return '仅左声道';
    case 'right': return '仅右声道';
    default: return '双声道';
  }
}
