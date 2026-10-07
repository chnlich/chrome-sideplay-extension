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
    showStatus('Failed to load: ' + error.message, true);
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
  document.getElementById('status').textContent = 'Applying...';
  document.getElementById('status').style.display = 'block';
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'setChannel',
      tabId: currentTabId,
      channel: channel
    });
    
    if (response && response.success) {
      updateUI(channel);
      showStatus(`Switched to: ${getChannelName(channel)}`);
    } else {
      showStatus('Error: ' + (response?.error || "Couldn't apply the setting. Reload the page and try again."), true);
    }
  } catch (error) {
    showStatus('Error: ' + error.message, true);
  }
}

function getChannelName(channel) {
  switch (channel) {
    case 'left': return 'Left only';
    case 'right': return 'Right only';
    default: return 'Stereo';
  }
}
