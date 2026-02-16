// SidePlay Popup - Controls content script

console.log('[SidePlay Popup] Script loaded');

let currentTabId = null;
let currentChannel = 'both';

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[SidePlay Popup] DOM loaded');
  
  try {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTabId = tab.id;
    console.log('[SidePlay Popup] Current tab:', currentTabId);
    
    // Update UI
    const tabInfo = document.getElementById('tabInfo');
    tabInfo.textContent = tab.title || tab.url;
    
    // Get channel from storage (content script may not be ready yet)
    const result = await chrome.storage.local.get(`channel_${currentTabId}`);
    currentChannel = result[`channel_${currentTabId}`] || 'both';
    console.log('[SidePlay Popup] Channel from storage:', currentChannel);
    
    updateUI(currentChannel);
    
    // Bind click events
    document.querySelectorAll('.option').forEach(option => {
      option.addEventListener('click', () => {
        const channel = option.dataset.channel;
        console.log('[SidePlay Popup] Channel clicked:', channel);
        setChannel(channel);
      });
    });
    
    // Trigger scan for audio elements
    console.log('[SidePlay Popup] Triggering audio scan...');
    const response = await chrome.runtime.sendMessage({
      action: 'scanAudio',
      tabId: currentTabId
    });
    console.log('[SidePlay Popup] Scan result:', response);
    
    // Apply stored channel setting
    if (currentChannel !== 'both') {
      console.log('[SidePlay Popup] Applying stored channel:', currentChannel);
      setChannel(currentChannel);
    }
    
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
  console.log('[SidePlay Popup] Status:', message);
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = `status ${isError ? 'error' : 'success'}`;
  status.style.display = 'block';
  
  setTimeout(() => {
    status.style.display = 'none';
  }, 3000);
}

async function setChannel(channel) {
  console.log('[SidePlay Popup] setChannel:', channel);
  
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
    
    console.log('[SidePlay Popup] Response:', response);
    
    if (response && response.success) {
      currentChannel = channel;
      updateUI(channel);
      showStatus(`已切换到: ${getChannelName(channel)} (${response.hookedCount || 0} 个音频元素)`);
    } else {
      showStatus('错误: ' + (response?.error || '无法应用设置'), true);
    }
  } catch (error) {
    console.error('[SidePlay Popup] Error:', error);
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
