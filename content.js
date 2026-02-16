// Content script injected into pages to control audio
(function() {
  'use strict';
  
  console.log('[SidePlay Content] Script loaded');
  
  // Prevent double injection
  if (window.sidePlayInjected) {
    console.log('[SidePlay Content] Already injected');
    return;
  }
  window.sidePlayInjected = true;
  
  // State
  let audioContext = null;
  let gainNodes = new Map(); // mediaElement -> { leftGain, rightGain, splitter, merger }
  let currentChannel = 'both';
  
  // Listen for messages from popup/background
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('[SidePlay Content] Received message:', request.action);
    
    if (request.action === 'setChannel') {
      const result = setChannel(request.channel);
      sendResponse(result);
      return false;
    }
    
    if (request.action === 'getChannel') {
      sendResponse({ channel: currentChannel });
      return false;
    }
    
    if (request.action === 'scanAudioElements') {
      scanAndHookAudioElements();
      sendResponse({ success: true, hookedCount: gainNodes.size });
      return false;
    }
    
    if (request.action === 'ping') {
      sendResponse({ success: true, pong: true });
      return false;
    }
  });
  
  // Set channel for all hooked audio elements
  function setChannel(channel) {
    console.log('[SidePlay Content] Setting channel to:', channel);
    currentChannel = channel;
    
    let leftValue, rightValue;
    switch (channel) {
      case 'left':
        leftValue = 1;
        rightValue = 0;
        break;
      case 'right':
        leftValue = 0;
        rightValue = 1;
        break;
      case 'both':
      default:
        leftValue = 1;
        rightValue = 1;
        break;
    }
    
    // Apply to all hooked elements
    gainNodes.forEach((nodes, element) => {
      try {
        nodes.leftGain.gain.value = leftValue;
        nodes.rightGain.gain.value = rightValue;
        console.log('[SidePlay Content] Applied to element:', element.src || 'unknown');
      } catch (error) {
        console.error('[SidePlay Content] Error applying gain:', error);
      }
    });
    
    return { success: true, channel, hookedCount: gainNodes.size };
  }
  
  // Hook a single media element
  function hookAudioElement(element) {
    if (gainNodes.has(element)) {
      console.log('[SidePlay Content] Element already hooked');
      return;
    }
    
    try {
      console.log('[SidePlay Content] Hooking element:', element.src || element.currentSrc || 'video/audio element');
      
      // Create audio context if needed
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        console.log('[SidePlay Content] Created audio context');
      }
      
      // Resume context if suspended
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      
      // Create media element source
      const source = audioContext.createMediaElementSource(element);
      
      // Create audio graph
      const splitter = audioContext.createChannelSplitter(2);
      const merger = audioContext.createChannelMerger(2);
      const leftGain = audioContext.createGain();
      const rightGain = audioContext.createGain();
      
      // Set initial values
      leftGain.gain.value = 1;
      rightGain.gain.value = 1;
      
      // Connect
      source.connect(splitter);
      splitter.connect(leftGain, 0);
      splitter.connect(rightGain, 1);
      leftGain.connect(merger, 0, 0);
      rightGain.connect(merger, 0, 1);
      merger.connect(audioContext.destination);
      
      // Store
      gainNodes.set(element, { leftGain, rightGain, splitter, merger, source });
      
      // Apply current channel setting
      setChannel(currentChannel);
      
      console.log('[SidePlay Content] Successfully hooked element');
      
    } catch (error) {
      console.error('[SidePlay Content] Error hooking element:', error);
    }
  }
  
  // Scan and hook all audio/video elements
  function scanAndHookAudioElements() {
    console.log('[SidePlay Content] Scanning for audio/video elements...');
    
    const elements = document.querySelectorAll('video, audio');
    console.log('[SidePlay Content] Found', elements.length, 'media elements');
    
    elements.forEach(element => {
      // Wait for element to be ready
      if (element.readyState >= 1) {
        hookAudioElement(element);
      } else {
        element.addEventListener('loadedmetadata', () => {
          hookAudioElement(element);
        }, { once: true });
      }
    });
    
    // Also hook elements added later
    observeNewElements();
  }
  
  // Watch for new elements
  let observer = null;
  function observeNewElements() {
    if (observer) return;
    
    observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.tagName === 'VIDEO' || node.tagName === 'AUDIO') {
            console.log('[SidePlay Content] New media element detected');
            hookAudioElement(node);
          }
          // Check children
          if (node.querySelectorAll) {
            node.querySelectorAll('video, audio').forEach(hookAudioElement);
          }
        });
      });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    console.log('[SidePlay Content] Observing for new elements');
  }
  
  // Initial scan
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scanAndHookAudioElements);
  } else {
    scanAndHookAudioElements();
  }
  
  console.log('[SidePlay Content] Initialization complete');
})();
