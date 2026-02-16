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
    const response = await chrome.runtime.sendMessage({
      action: 'setChannel',
      tabId: currentTabId,
      channel: channel
    });
    
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
