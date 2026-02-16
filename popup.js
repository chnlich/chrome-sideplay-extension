// SidePlay Popup - Simple control interface

console.log('[SidePlay Popup] Script loaded');

let currentTabId = null;

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[SidePlay Popup] DOM loaded');
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTabId = tab.id;
    console.log('[SidePlay Popup] Current tab:', currentTabId);
    
    // Update UI
    document.getElementById('tabInfo').textContent = tab.title || tab.url;
    
    // Get stored channel
    const result = await chrome.storage.local.get(`channel_${currentTabId}`);
    const channel = result[`channel_${currentTabId}`] || 'both';
    console.log('[SidePlay Popup] Channel:', channel);
    
    updateUI(channel);
    
    // Bind click events
    document.querySelectorAll('.option').forEach(option => {
      option.addEventListener('click', () => {
        setChannel(option.dataset.channel);
      });
    });
    
  } catch (error) {
    console.error('[SidePlay Popup] Init error:', error);
    showStatus('初始化失败: ' + error.message, true);
  }
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
  setTimeout(() => status.style.display = 'none', 3000);
}

async function setChannel(channel) {
  console.log('[SidePlay Popup] Setting channel:', channel);
  document.getElementById('status').textContent = '应用设置中...';
  document.getElementById('status').style.display = 'block';
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'setChannel',
      tabId: currentTabId,
      channel: channel
    });
    
    if (response && response.success) {
      updateUI(channel);
      showStatus(`已切换到: ${getChannelName(channel)}`);
    } else {
      showStatus('错误: ' + (response?.error || '无法应用设置，请刷新页面'), true);
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
