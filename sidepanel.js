// ========================================
// SIDEPANEL - DISPLAY ONLY (No AI Logic)
// ========================================

// State
let settings = {
  apiChoice: 'summarization',
  customPrompt: 'Summarize this article in 2-3 sentences',
  displayMode: 'tooltip',
  gazeEnabled: false,
  gazeDwellMs: 600,
  voiceEnabled: false
};

let currentContent = {
  title: '',
  fullContent: '',
  summary: ''
};

// DOM elements
const elements = {};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Sidepanel] DOMContentLoaded fired');
  
  try {
    // Get DOM elements
    elements.welcome = document.getElementById('welcome');
    elements.loadingExtract = document.getElementById('loading-extract');
    elements.loadingSummarize = document.getElementById('loading-summarize');
    elements.contentArea = document.getElementById('content-area');
    elements.error = document.getElementById('error');
    elements.title = document.getElementById('title');
    elements.aiSummary = document.getElementById('ai-summary');
    elements.articleContent = document.getElementById('article-content');
    elements.toggleBtn = document.getElementById('toggle-full-content');
    elements.fullContentSection = document.getElementById('full-content-section');
    
    // Settings
    elements.radioSummarization = document.getElementById('radio-summarization');
    elements.radioPrompt = document.getElementById('radio-prompt');
    elements.customPrompt = document.getElementById('custom-prompt');
    elements.promptContainer = document.getElementById('prompt-container');
    elements.displayMode = document.getElementById('display-mode');

    // Gaze controls
    elements.gazeEnabled = document.getElementById('gaze-enabled');
    elements.gazeStatusDot = document.getElementById('gaze-status-dot');
    elements.gazeStatusText = document.getElementById('gaze-status-text');
    elements.calibrateBtn = document.getElementById('calibrate-btn');
    elements.dwellTime = document.getElementById('dwell-time');
    elements.dwellValue = document.getElementById('dwell-value');

    // Mouth click controls
    elements.mouthClickEnabled = document.getElementById('mouth-click-enabled');
    elements.mouthStatusDot = document.getElementById('mouth-status-dot');
    elements.mouthStatusText = document.getElementById('mouth-status-text');
    elements.calibrateMouthBtn = document.getElementById('calibrate-mouth-btn');

    // Voice controls
    elements.voiceEnabled = document.getElementById('voice-enabled');
    elements.voiceLogSection = document.getElementById('voice-log-section');
    elements.voiceLog = document.getElementById('voice-log');
    
    console.log('[Sidepanel] DOM elements retrieved:', {
      displayMode: elements.displayMode,
      radioSummarization: elements.radioSummarization,
      customPrompt: elements.customPrompt
    });
    
    // Load settings
    await loadSettings();
    console.log('[Sidepanel] Settings loaded');
    
    // Setup listeners
    setupEventListeners();
    console.log('[Sidepanel] Event listeners set up');
    
    // Show welcome
    showWelcome();
    console.log('[Sidepanel] Welcome shown');
    
    // Get API status from background
    try {
      const status = await chrome.runtime.sendMessage({ type: 'GET_API_STATUS' });
      console.log('[Sidepanel] API status:', status);
    } catch (e) {
      console.error('[Sidepanel] Failed to get API status:', e);
    }
    
    console.log('[Sidepanel] Initialization complete');
  } catch (error) {
    console.error('[Sidepanel] Initialization error:', error);
  }
});

// Load settings
async function loadSettings() {
  const stored = await chrome.storage.local.get(['apiChoice', 'customPrompt', 'displayMode', 'gazeEnabled', 'gazeDwellMs', 'mouthClickEnabled', 'mouthCalV1']);

  if (stored.apiChoice) settings.apiChoice = stored.apiChoice;
  if (stored.customPrompt) settings.customPrompt = stored.customPrompt;
  if (stored.displayMode) settings.displayMode = stored.displayMode;
  if (typeof stored.gazeEnabled === 'boolean') settings.gazeEnabled = stored.gazeEnabled;
  if (typeof stored.gazeDwellMs === 'number') settings.gazeDwellMs = stored.gazeDwellMs;
  if (typeof stored.voiceEnabled === 'boolean') settings.voiceEnabled = stored.voiceEnabled;

  // Update UI
  if (elements.radioSummarization && elements.radioPrompt) {
    if (settings.apiChoice === 'summarization') {
      elements.radioSummarization.checked = true;
    } else {
      elements.radioPrompt.checked = true;
    }
  }

  if (elements.customPrompt) {
    elements.customPrompt.value = settings.customPrompt;
  }

  if (elements.displayMode) {
    elements.displayMode.value = settings.displayMode;
  }

  if (elements.gazeEnabled) {
    elements.gazeEnabled.checked = settings.gazeEnabled;
  }

  if (elements.dwellTime) {
    elements.dwellTime.value = settings.gazeDwellMs;
  }

  if (elements.dwellValue) {
    elements.dwellValue.textContent = settings.gazeDwellMs;
  }

  // Update calibrate button disabled state
  if (elements.calibrateBtn) {
    elements.calibrateBtn.disabled = !settings.gazeEnabled;
  }

  // Update initial status based on gazeEnabled
  if (!settings.gazeEnabled) {
    updateGazeStatus('ready', 'Enable to start');
  }

  // Load mouth click settings
  const mouthEnabled = stored.mouthClickEnabled || false;
  if (elements.mouthClickEnabled) {
    elements.mouthClickEnabled.checked = mouthEnabled;
  }

  // Update calibrate mouth button disabled state
  if (elements.calibrateMouthBtn) {
    elements.calibrateMouthBtn.disabled = !mouthEnabled;
  }

  // Update mouth calibration status
  updateMouthStatus(!!stored.mouthCalV1);

  // Load voice settings
  if (elements.voiceEnabled) {
    elements.voiceEnabled.checked = settings.voiceEnabled;
    if (settings.voiceEnabled) {
      elements.voiceLogSection.classList.remove('hidden');
      startVoiceRecognition();
    } else {
      elements.voiceLogSection.classList.add('hidden');
    }
  }

  togglePromptContainer();
}

// Save settings
async function saveSettings() {
  await chrome.storage.local.set({
    apiChoice: settings.apiChoice,
    customPrompt: settings.customPrompt,
    displayMode: settings.displayMode,
    gazeEnabled: settings.gazeEnabled,
    gazeDwellMs: settings.gazeDwellMs,
    voiceEnabled: settings.voiceEnabled
  });
}

// Setup event listeners
function setupEventListeners() {
  // API choice
  document.querySelectorAll('input[name="api-choice"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      settings.apiChoice = e.target.value;
      togglePromptContainer();
      saveSettings();
    });
  });
  
  // Custom prompt
  if (elements.customPrompt) {
    elements.customPrompt.addEventListener('input', (e) => {
      settings.customPrompt = e.target.value;
      saveSettings();
    });
  }
  
  // Display mode
  if (elements.displayMode) {
    elements.displayMode.addEventListener('change', (e) => {
      settings.displayMode = e.target.value;
      saveSettings();
      
      // Notify content script
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'DISPLAY_MODE_CHANGED',
            displayMode: settings.displayMode
          }).catch(() => {
            // Ignore errors if content script not ready
          });
        }
      });
    });
  }
  
  // Toggle full content
  if (elements.toggleBtn) {
    elements.toggleBtn.addEventListener('click', () => {
      if (elements.fullContentSection.classList.contains('hidden')) {
        elements.fullContentSection.classList.remove('hidden');
        elements.toggleBtn.textContent = 'Hide Full Content';
      } else {
        elements.fullContentSection.classList.add('hidden');
        elements.toggleBtn.textContent = 'View Full Content';
      }
    });
  }

  // Gaze enabled toggle
  if (elements.gazeEnabled) {
    elements.gazeEnabled.addEventListener('change', async (e) => {
      settings.gazeEnabled = e.target.checked;
      saveSettings();

      // Notify content script of the change
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'GAZE_ENABLED_CHANGED',
            gazeEnabled: settings.gazeEnabled
          }).catch(() => {
            // Ignore if content script not loaded yet
          });
        }
      });

      // Update calibrate button disabled state
      if (elements.calibrateBtn) {
        elements.calibrateBtn.disabled = !settings.gazeEnabled;
      }

      // Update status text immediately to prevent race conditions
      if (!settings.gazeEnabled) {
        updateGazeStatus('ready', 'Disabled');
      } else {
        updateGazeStatus('loading', 'Initializing...');

        // When enabling, check if content scripts are loaded
        // If not, refresh the page to inject them
        chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
          if (tabs[0]) {
            try {
              // Try to ping the content script
              await chrome.tabs.sendMessage(tabs[0].id, { type: 'PING' });
              console.log('[Sidepanel] Content script already loaded');
            } catch (error) {
              // Content script not loaded, refresh the page
              console.log('[Sidepanel] Content script not loaded, refreshing page...');
              updateGazeStatus('loading', 'Refreshing page...');
              setTimeout(() => {
                chrome.tabs.reload(tabs[0].id);
              }, 300);
            }
          }
        });
      }

      console.log('[Sidepanel] Gaze tracking toggled:', settings.gazeEnabled);
    });
  }

  // Calibrate button
  if (elements.calibrateBtn) {
    elements.calibrateBtn.addEventListener('click', () => {
      console.log('[Sidepanel] Calibrate button clicked');

      // Blur the button to prevent SPACE from re-clicking it
      elements.calibrateBtn.blur();

      // Send message to active tab to trigger calibration
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'TRIGGER_CALIBRATION'
          }).catch((error) => {
            console.error('[Sidepanel] Failed to trigger calibration:', error);
          });
        }
      });
    });
  }

  // Mouth click enabled toggle
  if (elements.mouthClickEnabled) {
    elements.mouthClickEnabled.addEventListener('change', async (e) => {
      const enabled = e.target.checked;
      chrome.storage.local.set({ mouthClickEnabled: enabled });
      console.log('[Sidepanel] Mouth click toggled:', enabled);

      // Update calibrate button disabled state
      if (elements.calibrateMouthBtn) {
        elements.calibrateMouthBtn.disabled = !enabled;
      }
    });
  }

  // Calibrate mouth button
  if (elements.calibrateMouthBtn) {
    elements.calibrateMouthBtn.addEventListener('click', () => {
      console.log('[Sidepanel] Calibrate mouth button clicked');

      // Blur the button to prevent SPACE from re-clicking it
      elements.calibrateMouthBtn.blur();

      // Send message to active tab to trigger mouth calibration
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'TRIGGER_MOUTH_CALIBRATION'
          }).catch((error) => {
            console.error('[Sidepanel] Failed to trigger mouth calibration:', error);
          });
        }
      });
    });
  }

  // Dwell time slider
  if (elements.dwellTime) {
    elements.dwellTime.addEventListener('input', (e) => {
      const value = parseInt(e.target.value, 10);
      settings.gazeDwellMs = value;
      if (elements.dwellValue) {
        elements.dwellValue.textContent = value;
      }
      saveSettings();
      console.log('[Sidepanel] Dwell time updated:', value);
    });
  }

  // Voice enabled toggle
  if (elements.voiceEnabled) {
    elements.voiceEnabled.addEventListener('change', async (e) => {
      const isEnabling = e.target.checked;
      
      if (isEnabling) {
        try {
          // Force Chrome to ask for Microphone permission on this extension URL
          console.log('[Sidepanel] Requesting mic permission...');
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(track => track.stop());
          console.log('[Sidepanel] Mic permission granted!');
        } catch (err) {
          console.error('[Sidepanel] Mic permission denied/failed:', err);
          e.target.checked = false;
          settings.voiceEnabled = false;
          saveSettings();
          // Open options page to get permission
          chrome.runtime.openOptionsPage();
          return;
        }
      }

      settings.voiceEnabled = e.target.checked;
      saveSettings();

      if (settings.voiceEnabled) {
        elements.voiceLogSection.classList.remove('hidden');
        startVoiceRecognition();
      } else {
        elements.voiceLogSection.classList.add('hidden');
        stopVoiceRecognition();
      }

      // Notify content script (optional, they don't do much anymore for voice)
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'VOICE_ENABLED_CHANGED',
            voiceEnabled: settings.voiceEnabled
          }).catch(() => {});
        }
      });
    });
  }
}

// Toggle prompt container
function togglePromptContainer() {
  if (elements.promptContainer) {
    if (settings.apiChoice === 'prompt') {
      elements.promptContainer.classList.remove('hidden');
    } else {
      elements.promptContainer.classList.add('hidden');
    }
  }
}

// Listen for messages from background or content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'voice_log') {
    appendVoiceLog(message.text, message.type, message.command);
    return;
  }

  if (message.type === 'STREAMING_UPDATE') {
    if (settings.displayMode === 'panel' || settings.displayMode === 'both') {
      updateSummaryDisplay(message.content);
    }
  }

  if (message.type === 'PROCESSING_STATUS') {
    if (message.status === 'started') {
      showProcessing(message.title);
    }
  }

  if (message.type === 'DISPLAY_CACHED_SUMMARY') {
    if (settings.displayMode === 'panel' || settings.displayMode === 'both') {
      displayCachedSummary(message.title, message.summary);
    }
  }

  if (message.type === 'GAZE_STATUS') {
    updateGazeStatus(message.phase, message.note);
  }
});

// Update gaze status indicator
function updateGazeStatus(phase, note) {
  if (!elements.gazeStatusDot || !elements.gazeStatusText) {
    return;
  }

  // Remove all status classes
  elements.gazeStatusDot.className = 'status-dot';

  // Check if disabled based on note
  if (note && note.toLowerCase().includes('disabled')) {
    elements.gazeStatusText.textContent = 'Disabled';
    return;
  }

  // Map phase to status
  const statusMap = {
    'loading': { class: 'loading', text: 'Loading models...' },
    'ready': { class: 'ready', text: note || 'Ready to calibrate' },
    'live': { class: 'live', text: note || 'Active & tracking' },
    'calibrating': { class: 'loading', text: 'Calibrating...' }
  };

  const status = statusMap[phase] || { class: '', text: note || 'Unknown' };

  if (status.class) {
    elements.gazeStatusDot.classList.add(status.class);
  }
  elements.gazeStatusText.textContent = status.text;
}

function updateMouthStatus(calibrated) {
  if (!elements.mouthStatusDot || !elements.mouthStatusText) {
    return;
  }

  // Remove all status classes
  elements.mouthStatusDot.className = 'status-dot';

  if (calibrated) {
    elements.mouthStatusDot.classList.add('ready');
    elements.mouthStatusText.textContent = 'Calibrated ✓';
  } else {
    elements.mouthStatusText.textContent = 'Not calibrated';
  }
}

// Show states
function hideAll() {
  // Hide content states, but NOT settings elements
  const elementsToHide = [
    elements.welcome,
    elements.loadingExtract,
    elements.loadingSummarize,
    elements.contentArea,
    elements.error
  ];
  
  elementsToHide.forEach(el => {
    if (el && el.classList) {
      el.classList.add('hidden');
    }
  });
}

function showWelcome() {
  hideAll();
  if (elements.welcome) {
    elements.welcome.classList.remove('hidden');
  }
}

function showProcessing(title) {
  if (settings.displayMode === 'tooltip') return; // Don't show in panel if tooltip-only
  
  hideAll();
  if (elements.loadingExtract) {
    elements.loadingExtract.classList.remove('hidden');
  }
  
  // After brief moment, show summarizing state
  setTimeout(() => {
    if (elements.loadingExtract) {
      elements.loadingExtract.classList.add('hidden');
    }
    if (elements.loadingSummarize) {
      elements.loadingSummarize.classList.remove('hidden');
    }
  }, 500);
}

function updateSummaryDisplay(formattedContent) {
  if (settings.displayMode === 'tooltip') return;
  
  // Show content area if hidden
  if (elements.contentArea && elements.contentArea.classList.contains('hidden')) {
    hideAll();
    elements.contentArea.classList.remove('hidden');
  }
  
  // Update summary
  if (elements.aiSummary) {
    elements.aiSummary.innerHTML = formattedContent;
  }
}

function displayCachedSummary(title, formattedSummary) {
  hideAll();
  
  if (elements.contentArea) {
    elements.contentArea.classList.remove('hidden');
  }
  
  if (elements.title) {
    elements.title.textContent = title;
  }
  
  if (elements.aiSummary) {
    elements.aiSummary.innerHTML = formattedSummary;
  }
}

// Listen for mouth calibration completion
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.mouthCalV1) {
    console.log('[Sidepanel] Mouth calibration updated');
    updateMouthStatus(!!changes.mouthCalV1.newValue);
  }
});

console.log('[Sidepanel] Script loaded');

// ============ VOICE RECOGNITION (SIDEPANEL MANAGED) ============
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let voiceRunning = false;
let lastInterimMatch = ''; 
const INSTANT_COMMANDS = ['scroll down', 'scroll up', 'go back', 'go forward', 'click', 'reload', 'refresh', 'top', 'bottom'];
let voiceContext = "default";
let voiceSynthesis = window.speechSynthesis;
let voicePausedForTTS = false;

function appendVoiceLog(text, type, command) {
  if (!elements.voiceLog) return;
  
  const entry = document.createElement('div');
  entry.className = 'voice-log-entry';
  
  let badgeClass = 'badge-ignored';
  let badgeText = 'Ignored';
  
  if (type === 'executed') {
    badgeClass = 'badge-executed';
    badgeText = command || 'Executed';
  } else if (type === 'heard') {
    badgeClass = 'badge-heard';
    badgeText = command ? `Parsed: ${command}` : 'Heard';
  } else if (type === 'skipped') {
    badgeClass = 'badge-ignored';
    badgeText = 'Skipped';
  }
  
  const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' });
  
  entry.innerHTML = `
    <span class="voice-log-badge ${badgeClass}">${badgeText}</span>
    <span class="voice-log-text" title="${text}">${text}</span>
    <span class="voice-log-time">${time}</span>
  `;
  
  elements.voiceLog.appendChild(entry);
  elements.voiceLog.scrollTop = elements.voiceLog.scrollHeight;
  
  while (elements.voiceLog.children.length > 50) {
    elements.voiceLog.removeChild(elements.voiceLog.firstChild);
  }
}

function startVoiceRecognition() {
  if (!SpeechRecognition) {
    console.warn("[Voice] SpeechRecognition API not available in sidepanel");
    return;
  }
  if (voiceRunning) return;

  if (recognition) {
    try { recognition.stop(); } catch(e) {}
    recognition = null;
  }

  recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.continuous = true;
  recognition.interimResults = true;
  
  recognition.onstart = () => {
    voiceRunning = true;
    console.log("[Voice] ✅ Voice recognition ACTIVE in sidepanel");
  };

  recognition.onresult = (event) => {
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      const transcript = event.results[i][0].transcript.trim().toLowerCase();
      
      if (event.results[i].isFinal) {
        const wasInterimMatched = lastInterimMatch && transcript.includes(lastInterimMatch);
        lastInterimMatch = '';
        
        if (!wasInterimMatched) {
          const executedCmd = handleVoiceCommand(transcript);
          appendVoiceLog(transcript, executedCmd ? 'executed' : 'heard', executedCmd);
        } else {
          appendVoiceLog(transcript, 'skipped', lastInterimMatch);
        }
      } else {
        const matched = INSTANT_COMMANDS.find(cmd => transcript.includes(cmd));
        if (matched && lastInterimMatch !== matched) {
          lastInterimMatch = matched;
          handleVoiceCommand(matched);
          appendVoiceLog(transcript, 'executed', matched);
        }
      }
    }
  };
  
  recognition.onend = () => {
    voiceRunning = false;
    if (voicePausedForTTS) return;
    if (settings.voiceEnabled) {
      setTimeout(() => {
        if (settings.voiceEnabled && !voicePausedForTTS) {
          voiceRunning = false;
          startVoiceRecognition();
        }
      }, 300);
    }
  };
  
  recognition.onerror = (e) => {
    if (e.error !== 'aborted') console.warn("[Voice] Error:", e.error);
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
      settings.voiceEnabled = false;
      if (elements.voiceEnabled) elements.voiceEnabled.checked = false;
      saveSettings();
    }
    if (e.error === 'aborted') voiceRunning = false;
  };
  
  try { recognition.start(); } catch (e) { console.error("[Voice] Failed to start:", e); }
}

function stopVoiceRecognition() {
  voiceRunning = false;
  if (recognition) {
    try { recognition.stop(); } catch(e) {}
    recognition = null;
  }
}

function executeInActiveTab(command) {
  console.log('[Sidepanel] Routing voice command through background:', command);
  chrome.runtime.sendMessage({
    type: 'RELAY_VOICE_COMMAND',
    command: command
  }).catch((e) => {
    console.error('[Sidepanel] Error routing voice command:', e);
  });
}

function handleVoiceCommand(command) {
  if (voiceContext === "awaiting_search_query") {
    voiceContext = "default";
    if (command && !command.includes("cancel") && !command.includes("stop")) {
      chrome.tabs.create({ url: `https://www.google.com/search?q=${encodeURIComponent(command)}` });
    }
    return "search: " + command;
  }

  if (command.includes("down")) {
    executeInActiveTab("scroll down");
    return "scroll down";
  }
  else if (command.includes("up")) {
    executeInActiveTab("scroll up");
    return "scroll up";
  }
  else if (command.includes("top")) {
    executeInActiveTab("go to top");
    return "go to top";
  }
  else if (command.includes("bottom")) {
    executeInActiveTab("go to bottom");
    return "go to bottom";
  }
  else if (command.includes("click")) {
    executeInActiveTab("click");
    return "click";
  }
  else if (command.includes("go back") || command.includes("back")) {
    executeInActiveTab("go back");
    return "go back";
  }
  else if (command.includes("go forward") || command.includes("forward")) {
    executeInActiveTab("go forward");
    return "go forward";
  }
  else if (command.includes("reload") || command.includes("refresh")) {
    executeInActiveTab("reload");
    return "reload";
  }
  else if (command.startsWith("search ")) {
    const query = command.replace(/^search\s+/, "").trim();
    if (query) {
      chrome.tabs.create({ url: `https://www.google.com/search?q=${encodeURIComponent(query)}` });
    }
    return "search: " + query;
  }
  else if (command.trim() === "search") {
    voicePausedForTTS = true;
    if (recognition) try { recognition.stop(); } catch(e) {}
    voiceRunning = false;
    voiceContext = "awaiting_search_query";
    
    if (voiceSynthesis) {
      const utterance = new SpeechSynthesisUtterance("What do you want to search?");
      utterance.rate = 1.1;
      utterance.onend = () => {
        voicePausedForTTS = false;
        setTimeout(() => { voiceRunning = false; startVoiceRecognition(); }, 500);
      };
      voiceSynthesis.speak(utterance);
    } else {
      voicePausedForTTS = false;
      voiceRunning = false;
      startVoiceRecognition();
    }
    return "search (waiting...)";
  }

  return null;
}