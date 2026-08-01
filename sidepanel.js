// // ========================================
// // SIDEPANEL - DISPLAY ONLY (No AI Logic)
// // ========================================

// // State
// let settings = {
//   apiChoice: 'summarization',
//   customPrompt: 'Summarize this article in 2-3 sentences',
//   displayMode: 'tooltip',
//   gazeEnabled: false,
//   gazeDwellMs: 600,
//   voiceEnabled: false,
//   aiSummaryEnabled: true
// };

// let currentContent = {
//   title: '',
//   fullContent: '',
//   summary: ''
// };

// // DOM elements
// const elements = {};

// // Initialize
// document.addEventListener('DOMContentLoaded', async () => {
//   console.log('[Sidepanel] DOMContentLoaded fired');

//   try {
//     // Get DOM elements
//     elements.welcome = document.getElementById('welcome');
//     elements.loadingExtract = document.getElementById('loading-extract');
//     elements.loadingSummarize = document.getElementById('loading-summarize');
//     elements.contentArea = document.getElementById('content-area');
//     elements.error = document.getElementById('error');
//     elements.title = document.getElementById('title');
//     elements.aiSummary = document.getElementById('ai-summary');
//     elements.articleContent = document.getElementById('article-content');
//     elements.toggleBtn = document.getElementById('toggle-full-content');
//     elements.fullContentSection = document.getElementById('full-content-section');

//     // Settings
//     elements.radioSummarization = document.getElementById('radio-summarization');
//     elements.radioPrompt = document.getElementById('radio-prompt');
//     elements.customPrompt = document.getElementById('custom-prompt');
//     elements.promptContainer = document.getElementById('prompt-container');
//     elements.displayMode = document.getElementById('display-mode');

//     // Gaze controls
//     elements.gazeEnabled = document.getElementById('gaze-enabled');
//     elements.gazeStatusDot = document.getElementById('gaze-status-dot');
//     elements.gazeStatusText = document.getElementById('gaze-status-text');
//     elements.calibrateBtn = document.getElementById('calibrate-btn');
//     elements.dwellTime = document.getElementById('dwell-time');
//     elements.dwellValue = document.getElementById('dwell-value');

//     // Mouth click controls
//     elements.mouthClickEnabled = document.getElementById('mouth-click-enabled');
//     elements.mouthStatusDot = document.getElementById('mouth-status-dot');
//     elements.mouthStatusText = document.getElementById('mouth-status-text');
//     elements.calibrateMouthBtn = document.getElementById('calibrate-mouth-btn');

//     // Voice controls
//     elements.voiceEnabled = document.getElementById('voice-enabled');
//     elements.voiceLogSection = document.getElementById('voice-log-section');
//     elements.voiceLog = document.getElementById('voice-log');

//     console.log('[Sidepanel] DOM elements retrieved:', {
//       displayMode: elements.displayMode,
//       radioSummarization: elements.radioSummarization,
//       customPrompt: elements.customPrompt
//     });

//     // Load settings
//     await loadSettings();
//     console.log('[Sidepanel] Settings loaded');

//     // Setup listeners
//     setupEventListeners();
//     console.log('[Sidepanel] Event listeners set up');

//     // Show welcome
//     showWelcome();
//     console.log('[Sidepanel] Welcome shown');

//     // Get API status from background
//     try {
//       const status = await chrome.runtime.sendMessage({ type: 'GET_API_STATUS' });
//       console.log('[Sidepanel] API status:', status);
//     } catch (e) {
//       console.error('[Sidepanel] Failed to get API status:', e);
//     }

//     console.log('[Sidepanel] Initialization complete');
//   } catch (error) {
//     console.error('[Sidepanel] Initialization error:', error);
//   }
// });

// // Load settings
// async function loadSettings() {
//   const stored = await chrome.storage.local.get(['apiChoice', 'customPrompt', 'displayMode', 'gazeEnabled', 'gazeDwellMs', 'mouthClickEnabled', 'mouthCalV1', 'aiSummaryEnabled']);

//   if (stored.apiChoice) settings.apiChoice = stored.apiChoice;
//   if (stored.customPrompt) settings.customPrompt = stored.customPrompt;
//   if (stored.displayMode) settings.displayMode = stored.displayMode;
//   if (typeof stored.gazeEnabled === 'boolean') settings.gazeEnabled = stored.gazeEnabled;
//   if (typeof stored.gazeDwellMs === 'number') settings.gazeDwellMs = stored.gazeDwellMs;
//   if (typeof stored.voiceEnabled === 'boolean') settings.voiceEnabled = stored.voiceEnabled;
//   if (typeof stored.aiSummaryEnabled === 'boolean') settings.aiSummaryEnabled = stored.aiSummaryEnabled;

//   // Update UI
//   if (elements.radioSummarization && elements.radioPrompt) {
//     if (settings.apiChoice === 'summarization') {
//       elements.radioSummarization.checked = true;
//     } else {
//       elements.radioPrompt.checked = true;
//     }
//   }

//   if (elements.customPrompt) {
//     elements.customPrompt.value = settings.customPrompt;
//   }

//   if (elements.displayMode) {
//     elements.displayMode.value = settings.displayMode;
//   }

//   if (elements.gazeEnabled) {
//     elements.gazeEnabled.checked = settings.gazeEnabled;
//   }

//   if (elements.dwellTime) {
//     elements.dwellTime.value = settings.gazeDwellMs;
//   }

//   if (elements.dwellValue) {
//     elements.dwellValue.textContent = settings.gazeDwellMs;
//   }

//   // Update calibrate button disabled state
//   if (elements.calibrateBtn) {
//     elements.calibrateBtn.disabled = !settings.gazeEnabled;
//   }

//   // Update initial status based on gazeEnabled
//   if (!settings.gazeEnabled) {
//     updateGazeStatus('ready', 'Enable to start');
//   }

//   // Load mouth click settings
//   const mouthEnabled = stored.mouthClickEnabled || false;
//   if (elements.mouthClickEnabled) {
//     elements.mouthClickEnabled.checked = mouthEnabled;
//   }

//   // Update calibrate mouth button disabled state
//   if (elements.calibrateMouthBtn) {
//     elements.calibrateMouthBtn.disabled = !mouthEnabled;
//   }

//   // Update mouth calibration status
//   updateMouthStatus(!!stored.mouthCalV1);

//   // Load AI Summary settings
//   const aiSummaryToggle = document.getElementById('ai-summary-enabled');
//   if (aiSummaryToggle) {
//     aiSummaryToggle.checked = settings.aiSummaryEnabled;
//   }

//   // Load voice settings
//   if (elements.voiceEnabled) {
//     elements.voiceEnabled.checked = settings.voiceEnabled;
//     if (settings.voiceEnabled) {
//       elements.voiceLogSection.classList.remove('hidden');
//       startVoiceRecognition();
//     } else {
//       elements.voiceLogSection.classList.add('hidden');
//     }
//   }

//   togglePromptContainer();
// }

// // Save settings
// async function saveSettings() {
//   await chrome.storage.local.set({
//     apiChoice: settings.apiChoice,
//     customPrompt: settings.customPrompt,
//     displayMode: settings.displayMode,
//     gazeEnabled: settings.gazeEnabled,
//     gazeDwellMs: settings.gazeDwellMs,
//     voiceEnabled: settings.voiceEnabled,
//     aiSummaryEnabled: settings.aiSummaryEnabled
//   });
// }

// // Setup event listeners
// function setupEventListeners() {
//   // API choice
//   document.querySelectorAll('input[name="api-choice"]').forEach(radio => {
//     radio.addEventListener('change', (e) => {
//       settings.apiChoice = e.target.value;
//       togglePromptContainer();
//       saveSettings();
//     });
//   });

//   // Custom prompt
//   if (elements.customPrompt) {
//     elements.customPrompt.addEventListener('input', (e) => {
//       settings.customPrompt = e.target.value;
//       saveSettings();
//     });
//   }

//   // Display mode
//   if (elements.displayMode) {
//     elements.displayMode.addEventListener('change', (e) => {
//       settings.displayMode = e.target.value;
//       saveSettings();

//       // Notify content script
//       chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
//         if (tabs[0]) {
//           chrome.tabs.sendMessage(tabs[0].id, {
//             type: 'DISPLAY_MODE_CHANGED',
//             displayMode: settings.displayMode
//           }).catch(() => {
//             // Ignore errors if content script not ready
//           });
//         }
//       });
//     });
//   }

//   // Toggle full content
//   if (elements.toggleBtn) {
//     elements.toggleBtn.addEventListener('click', () => {
//       if (elements.fullContentSection.classList.contains('hidden')) {
//         elements.fullContentSection.classList.remove('hidden');
//         elements.toggleBtn.textContent = 'Hide Full Content';
//       } else {
//         elements.fullContentSection.classList.add('hidden');
//         elements.toggleBtn.textContent = 'View Full Content';
//       }
//     });
//   }

//   // Gaze enabled toggle
//   if (elements.gazeEnabled) {
//     elements.gazeEnabled.addEventListener('change', async (e) => {
//       settings.gazeEnabled = e.target.checked;
//       saveSettings();

//       // Notify content script of the change
//       chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
//         if (tabs[0]) {
//           chrome.tabs.sendMessage(tabs[0].id, {
//             type: 'GAZE_ENABLED_CHANGED',
//             gazeEnabled: settings.gazeEnabled
//           }).catch(() => {
//             // Ignore if content script not loaded yet
//           });
//         }
//       });

//       // Update calibrate button disabled state
//       if (elements.calibrateBtn) {
//         elements.calibrateBtn.disabled = !settings.gazeEnabled;
//       }

//       // Update status text immediately to prevent race conditions
//       if (!settings.gazeEnabled) {
//         updateGazeStatus('ready', 'Disabled');
//       } else {
//         updateGazeStatus('loading', 'Initializing...');

//         // When enabling, check if content scripts are loaded
//         // If not, refresh the page to inject them
//         chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
//           if (tabs[0]) {
//             try {
//               // Try to ping the content script
//               await chrome.tabs.sendMessage(tabs[0].id, { type: 'PING' });
//               console.log('[Sidepanel] Content script already loaded');
//             } catch (error) {
//               // Content script not loaded, refresh the page
//               console.log('[Sidepanel] Content script not loaded, refreshing page...');
//               updateGazeStatus('loading', 'Refreshing page...');
//               setTimeout(() => {
//                 chrome.tabs.reload(tabs[0].id);
//               }, 300);
//             }
//           }
//         });
//       }

//       console.log('[Sidepanel] Gaze tracking toggled:', settings.gazeEnabled);
//     });
//   }

//   // Calibrate button
//   if (elements.calibrateBtn) {
//     elements.calibrateBtn.addEventListener('click', () => {
//       console.log('[Sidepanel] Calibrate button clicked');

//       // Blur the button to prevent SPACE from re-clicking it
//       elements.calibrateBtn.blur();

//       // Send message to active tab to trigger calibration
//       chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
//         if (tabs[0]) {
//           chrome.tabs.sendMessage(tabs[0].id, {
//             type: 'TRIGGER_CALIBRATION'
//           }).catch((error) => {
//             console.error('[Sidepanel] Failed to trigger calibration:', error);
//           });
//         }
//       });
//     });
//   }

//   // Mouth click enabled toggle
//   if (elements.mouthClickEnabled) {
//     elements.mouthClickEnabled.addEventListener('change', async (e) => {
//       const enabled = e.target.checked;
//       chrome.storage.local.set({ mouthClickEnabled: enabled });
//       console.log('[Sidepanel] Mouth click toggled:', enabled);

//       // Update calibrate button disabled state
//       if (elements.calibrateMouthBtn) {
//         elements.calibrateMouthBtn.disabled = !enabled;
//       }
//     });
//   }

//   // Calibrate mouth button
//   if (elements.calibrateMouthBtn) {
//     elements.calibrateMouthBtn.addEventListener('click', () => {
//       console.log('[Sidepanel] Calibrate mouth button clicked');

//       // Blur the button to prevent SPACE from re-clicking it
//       elements.calibrateMouthBtn.blur();

//       // Send message to active tab to trigger mouth calibration
//       chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
//         if (tabs[0]) {
//           chrome.tabs.sendMessage(tabs[0].id, {
//             type: 'TRIGGER_MOUTH_CALIBRATION'
//           }).catch((error) => {
//             console.error('[Sidepanel] Failed to trigger mouth calibration:', error);
//           });
//         }
//       });
//     });
//   }

//   // Dwell time slider
//   if (elements.dwellTime) {
//     elements.dwellTime.addEventListener('input', (e) => {
//       const value = parseInt(e.target.value, 10);
//       settings.gazeDwellMs = value;
//       if (elements.dwellValue) {
//         elements.dwellValue.textContent = value;
//       }
//       saveSettings();
//       console.log('[Sidepanel] Dwell time updated:', value);
//     });
//   }

//   // Voice enabled toggle
//   if (elements.voiceEnabled) {
//     elements.voiceEnabled.addEventListener('change', async (e) => {
//       const isEnabling = e.target.checked;

//       if (isEnabling) {
//         try {
//           // Force Chrome to ask for Microphone permission on this extension URL
//           console.log('[Sidepanel] Requesting mic permission...');
//           const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
//           stream.getTracks().forEach(track => track.stop());
//           console.log('[Sidepanel] Mic permission granted!');
//         } catch (err) {
//           console.error('[Sidepanel] Mic permission denied/failed:', err);
//           e.target.checked = false;
//           settings.voiceEnabled = false;
//           saveSettings();
//           // Open options page to get permission
//           chrome.runtime.openOptionsPage();
//           return;
//         }
//       }

//       settings.voiceEnabled = e.target.checked;
//       saveSettings();

//       if (settings.voiceEnabled) {
//         elements.voiceLogSection.classList.remove('hidden');
//         startVoiceRecognition();
//       } else {
//         elements.voiceLogSection.classList.add('hidden');
//         stopVoiceRecognition();
//       }

//       // Notify content script (optional, they don't do much anymore for voice)
//       chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
//         if (tabs[0]) {
//           chrome.tabs.sendMessage(tabs[0].id, {
//             type: 'VOICE_ENABLED_CHANGED',
//             voiceEnabled: settings.voiceEnabled
//           }).catch(() => { });
//         }
//       });
//     });
//   }

//   // AI Summary enabled toggle
//   const aiSummaryToggle = document.getElementById('ai-summary-enabled');
//   if (aiSummaryToggle) {
//     aiSummaryToggle.addEventListener('change', async (e) => {
//       settings.aiSummaryEnabled = e.target.checked;
//       saveSettings();
//       console.log('[Sidepanel] AI Summarization toggled:', settings.aiSummaryEnabled);

//       // Notify content script
//       chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
//         if (tabs[0]) {
//           chrome.tabs.sendMessage(tabs[0].id, {
//             type: 'AI_SUMMARY_ENABLED_CHANGED',
//             aiSummaryEnabled: settings.aiSummaryEnabled
//           }).catch(() => {
//             // Ignore errors if content script not ready
//           });
//         }
//       });
//     });
//   }
// }

// // Toggle prompt container
// function togglePromptContainer() {
//   if (elements.promptContainer) {
//     if (settings.apiChoice === 'prompt') {
//       elements.promptContainer.classList.remove('hidden');
//     } else {
//       elements.promptContainer.classList.add('hidden');
//     }
//   }
// }

// // Listen for messages from background or content script
// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//   if (message.action === 'voice_log') {
//     appendVoiceLog(message.text, message.type, message.command);
//     return;
//   }

//   if (message.type === 'STREAMING_UPDATE') {
//     if (settings.displayMode === 'panel' || settings.displayMode === 'both') {
//       updateSummaryDisplay(message.content);
//     }
//   }

//   if (message.type === 'PROCESSING_STATUS') {
//     if (message.status === 'started') {
//       showProcessing(message.title);
//     }
//   }

//   if (message.type === 'DISPLAY_CACHED_SUMMARY') {
//     if (settings.displayMode === 'panel' || settings.displayMode === 'both') {
//       displayCachedSummary(message.title, message.summary);
//     }
//   }

//   if (message.type === 'GAZE_STATUS') {
//     updateGazeStatus(message.phase, message.note);
//   }
// });

// // Update gaze status indicator
// function updateGazeStatus(phase, note) {
//   if (!elements.gazeStatusDot || !elements.gazeStatusText) {
//     return;
//   }

//   // Remove all status classes
//   elements.gazeStatusDot.className = 'status-dot';

//   // Check if disabled based on note
//   if (note && note.toLowerCase().includes('disabled')) {
//     elements.gazeStatusText.textContent = 'Disabled';
//     return;
//   }

//   // Map phase to status
//   const statusMap = {
//     'loading': { class: 'loading', text: 'Loading models...' },
//     'ready': { class: 'ready', text: note || 'Ready to calibrate' },
//     'live': { class: 'live', text: note || 'Active & tracking' },
//     'calibrating': { class: 'loading', text: 'Calibrating...' }
//   };

//   const status = statusMap[phase] || { class: '', text: note || 'Unknown' };

//   if (status.class) {
//     elements.gazeStatusDot.classList.add(status.class);
//   }
//   elements.gazeStatusText.textContent = status.text;
// }

// function updateMouthStatus(calibrated) {
//   if (!elements.mouthStatusDot || !elements.mouthStatusText) {
//     return;
//   }

//   // Remove all status classes
//   elements.mouthStatusDot.className = 'status-dot';

//   if (calibrated) {
//     elements.mouthStatusDot.classList.add('ready');
//     elements.mouthStatusText.textContent = 'Calibrated ✓';
//   } else {
//     elements.mouthStatusText.textContent = 'Not calibrated';
//   }
// }

// // Show states
// function hideAll() {
//   // Hide content states, but NOT settings elements
//   const elementsToHide = [
//     elements.welcome,
//     elements.loadingExtract,
//     elements.loadingSummarize,
//     elements.contentArea,
//     elements.error
//   ];

//   elementsToHide.forEach(el => {
//     if (el && el.classList) {
//       el.classList.add('hidden');
//     }
//   });
// }

// function showWelcome() {
//   hideAll();
//   if (elements.welcome) {
//     elements.welcome.classList.remove('hidden');
//   }
// }

// function showProcessing(title) {
//   if (settings.displayMode === 'tooltip') return; // Don't show in panel if tooltip-only

//   hideAll();
//   if (elements.loadingExtract) {
//     elements.loadingExtract.classList.remove('hidden');
//   }

//   // After brief moment, show summarizing state
//   setTimeout(() => {
//     if (elements.loadingExtract) {
//       elements.loadingExtract.classList.add('hidden');
//     }
//     if (elements.loadingSummarize) {
//       elements.loadingSummarize.classList.remove('hidden');
//     }
//   }, 500);
// }

// function updateSummaryDisplay(formattedContent) {
//   if (settings.displayMode === 'tooltip') return;

//   // Show content area if hidden
//   if (elements.contentArea && elements.contentArea.classList.contains('hidden')) {
//     hideAll();
//     elements.contentArea.classList.remove('hidden');
//   }

//   // Update summary
//   if (elements.aiSummary) {
//     elements.aiSummary.innerHTML = formattedContent;
//   }
// }

// function displayCachedSummary(title, formattedSummary) {
//   hideAll();

//   if (elements.contentArea) {
//     elements.contentArea.classList.remove('hidden');
//   }

//   if (elements.title) {
//     elements.title.textContent = title;
//   }

//   if (elements.aiSummary) {
//     elements.aiSummary.innerHTML = formattedSummary;
//   }
// }

// // Listen for mouth calibration completion
// chrome.storage.onChanged.addListener((changes, area) => {
//   if (area === 'local' && changes.mouthCalV1) {
//     console.log('[Sidepanel] Mouth calibration updated');
//     updateMouthStatus(!!changes.mouthCalV1.newValue);
//   }
// });

// console.log('[Sidepanel] Script loaded');

// // ============ VOICE RECOGNITION (SIDEPANEL MANAGED) ============
// const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
// let recognition = null;
// let voiceRunning = false;
// let lastInterimMatch = '';
// const INSTANT_COMMANDS = ['scroll down', 'scroll up', 'go back', 'go forward', 'click', 'reload', 'refresh', 'top', 'bottom'];
// let voiceContext = "default";
// let voiceSynthesis = window.speechSynthesis;
// let voicePausedForTTS = false;

// function appendVoiceLog(text, type, command) {
//   if (!elements.voiceLog) return;

//   const entry = document.createElement('div');
//   entry.className = 'voice-log-entry';

//   let badgeClass = 'badge-ignored';
//   let badgeText = 'Ignored';

//   if (type === 'executed') {
//     badgeClass = 'badge-executed';
//     badgeText = command || 'Executed';
//   } else if (type === 'heard') {
//     badgeClass = 'badge-heard';
//     badgeText = command ? `Parsed: ${command}` : 'Heard';
//   } else if (type === 'skipped') {
//     badgeClass = 'badge-ignored';
//     badgeText = 'Skipped';
//   }

//   const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

//   entry.innerHTML = `
//     <span class="voice-log-badge ${badgeClass}">${badgeText}</span>
//     <span class="voice-log-text" title="${text}">${text}</span>
//     <span class="voice-log-time">${time}</span>
//   `;

//   elements.voiceLog.appendChild(entry);
//   elements.voiceLog.scrollTop = elements.voiceLog.scrollHeight;

//   while (elements.voiceLog.children.length > 50) {
//     elements.voiceLog.removeChild(elements.voiceLog.firstChild);
//   }
// }

// function startVoiceRecognition() {
//   if (!SpeechRecognition) {
//     console.warn("[Voice] SpeechRecognition API not available in sidepanel");
//     return;
//   }
//   if (voiceRunning) return;

//   if (recognition) {
//     try { recognition.stop(); } catch (e) { }
//     recognition = null;
//   }

//   recognition = new SpeechRecognition();
//   recognition.lang = "en-US";
//   recognition.continuous = true;
//   recognition.interimResults = true;

//   recognition.onstart = () => {
//     voiceRunning = true;
//     console.log("[Voice] ✅ Voice recognition ACTIVE in sidepanel");
//   };

//   recognition.onresult = (event) => {
//     for (let i = event.resultIndex; i < event.results.length; ++i) {
//       const transcript = event.results[i][0].transcript.trim().toLowerCase();

//       if (event.results[i].isFinal) {
//         const wasInterimMatched = lastInterimMatch && transcript.includes(lastInterimMatch);
//         lastInterimMatch = '';

//         if (!wasInterimMatched) {
//           const executedCmd = handleVoiceCommand(transcript);
//           appendVoiceLog(transcript, executedCmd ? 'executed' : 'heard', executedCmd);
//         } else {
//           appendVoiceLog(transcript, 'skipped', lastInterimMatch);
//         }
//       } else {
//         const matched = INSTANT_COMMANDS.find(cmd => transcript.includes(cmd));
//         if (matched && lastInterimMatch !== matched) {
//           lastInterimMatch = matched;
//           handleVoiceCommand(matched);
//           appendVoiceLog(transcript, 'executed', matched);
//         }
//       }
//     }
//   };

//   recognition.onend = () => {
//     voiceRunning = false;
//     if (voicePausedForTTS) return;
//     if (settings.voiceEnabled) {
//       setTimeout(() => {
//         if (settings.voiceEnabled && !voicePausedForTTS) {
//           voiceRunning = false;
//           startVoiceRecognition();
//         }
//       }, 300);
//     }
//   };

//   recognition.onerror = (e) => {
//     if (e.error !== 'aborted') console.warn("[Voice] Error:", e.error);
//     if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
//       settings.voiceEnabled = false;
//       if (elements.voiceEnabled) elements.voiceEnabled.checked = false;
//       saveSettings();
//     }
//     if (e.error === 'aborted') voiceRunning = false;
//   };

//   try { recognition.start(); } catch (e) { console.error("[Voice] Failed to start:", e); }
// }

// function stopVoiceRecognition() {
//   voiceRunning = false;
//   if (recognition) {
//     try { recognition.stop(); } catch (e) { }
//     recognition = null;
//   }
// }

// function executeInActiveTab(command) {
//   console.log('[Sidepanel] Routing voice command through background:', command);
//   chrome.runtime.sendMessage({
//     type: 'RELAY_VOICE_COMMAND',
//     command: command
//   }).catch((e) => {
//     console.error('[Sidepanel] Error routing voice command:', e);
//   });
// }

// function handleVoiceCommand(command) {
//   if (voiceContext === "awaiting_search_query") {
//     voiceContext = "default";
//     if (command && !command.includes("cancel") && !command.includes("stop")) {
//       chrome.tabs.create({ url: `https://www.google.com/search?q=${encodeURIComponent(command)}` });
//     }
//     return "search: " + command;
//   }

//   if (command.includes("down")) {
//     executeInActiveTab("scroll down");
//     return "scroll down";
//   }
//   else if (command.includes("up")) {
//     executeInActiveTab("scroll up");
//     return "scroll up";
//   }
//   else if (command.includes("top")) {
//     executeInActiveTab("go to top");
//     return "go to top";
//   }
//   else if (command.includes("bottom")) {
//     executeInActiveTab("go to bottom");
//     return "go to bottom";
//   }
//   else if (command.includes("click")) {
//     executeInActiveTab("click");
//     return "click";
//   }
//   else if (command.includes("go back") || command.includes("back")) {
//     executeInActiveTab("go back");
//     return "go back";
//   }
//   else if (command.includes("go forward") || command.includes("forward")) {
//     executeInActiveTab("go forward");
//     return "go forward";
//   }
//   else if (command.includes("reload") || command.includes("refresh")) {
//     executeInActiveTab("reload");
//     return "reload";
//   }
//   else if (command.startsWith("search ")) {
//     const query = command.replace(/^search\s+/, "").trim();
//     if (query) {
//       chrome.tabs.create({ url: `https://www.google.com/search?q=${encodeURIComponent(query)}` });
//     }
//     return "search: " + query;
//   }
//   else if (command.trim() === "search") {
//     voicePausedForTTS = true;
//     if (recognition) try { recognition.stop(); } catch (e) { }
//     voiceRunning = false;
//     voiceContext = "awaiting_search_query";

//     if (voiceSynthesis) {
//       const utterance = new SpeechSynthesisUtterance("What do you want to search?");
//       utterance.rate = 1.1;
//       utterance.onend = () => {
//         voicePausedForTTS = false;
//         setTimeout(() => { voiceRunning = false; startVoiceRecognition(); }, 500);
//       };
//       voiceSynthesis.speak(utterance);
//     } else {
//       voicePausedForTTS = false;
//       voiceRunning = false;
//       startVoiceRecognition();
//     }
//     return "search (waiting...)";
//   }

//   return null;
// }


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
  voiceEnabled: false,
  aiSummaryEnabled: true
};

let currentContent = {
  title: '',
  fullContent: '',
  summary: ''
};

// DOM elements
const elements = {};

// ========================================
// VOICE COMMAND HELPERS
// ========================================

// Get available voice commands (for help)
async function getVoiceCommands(category = null) {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_VOICE_COMMANDS',
      category: category
    });
    return response;
  } catch (error) {
    console.error('[Sidepanel] Failed to get voice commands:', error);
    return null;
  }
}

// Execute a specific command by key
async function executeCommandByKey(commandKey) {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'EXECUTE_COMMAND_BY_KEY',
      commandKey: commandKey
    });
    return response;
  } catch (error) {
    console.error('[Sidepanel] Failed to execute command:', error);
    return null;
  }
}

// Speak available commands using TTS
function speakAvailableCommands() {
  getVoiceCommands().then((response) => {
    if (response && response.status === 'ok' && response.commands) {
      const commands = response.commands;
      const categories = {};

      // Group by category
      commands.forEach(cmd => {
        if (!categories[cmd.category]) {
          categories[cmd.category] = [];
        }
        categories[cmd.category].push(cmd.key.replace(/_/g, ' '));
      });

      let message = 'Available voice commands: ';
      for (const [category, cmds] of Object.entries(categories)) {
        message += `${category}: ${cmds.slice(0, 5).join(', ')}. `;
        if (cmds.length > 5) {
          message += `and ${cmds.length - 5} more in ${category}. `;
        }
      }

      // Speak using TTS
      if (window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
      }

      console.log('[Voice] Available commands by category:', categories);
      appendVoiceLog('Commands listed in console', 'executed', 'help');
    } else {
      appendVoiceLog('Could not load voice commands', 'heard', null);
    }
  });
}

// ========================================
// INITIALIZATION
// ========================================

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
  const stored = await chrome.storage.local.get(['apiChoice', 'customPrompt', 'displayMode', 'gazeEnabled', 'gazeDwellMs', 'mouthClickEnabled', 'mouthCalV1', 'aiSummaryEnabled']);

  if (stored.apiChoice) settings.apiChoice = stored.apiChoice;
  if (stored.customPrompt) settings.customPrompt = stored.customPrompt;
  if (stored.displayMode) settings.displayMode = stored.displayMode;
  if (typeof stored.gazeEnabled === 'boolean') settings.gazeEnabled = stored.gazeEnabled;
  if (typeof stored.gazeDwellMs === 'number') settings.gazeDwellMs = stored.gazeDwellMs;
  if (typeof stored.voiceEnabled === 'boolean') settings.voiceEnabled = stored.voiceEnabled;
  if (typeof stored.aiSummaryEnabled === 'boolean') settings.aiSummaryEnabled = stored.aiSummaryEnabled;

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

  // Load AI Summary settings
  const aiSummaryToggle = document.getElementById('ai-summary-enabled');
  if (aiSummaryToggle) {
    aiSummaryToggle.checked = settings.aiSummaryEnabled;
  }

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
    voiceEnabled: settings.voiceEnabled,
    aiSummaryEnabled: settings.aiSummaryEnabled
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
        if (tabs && tabs[0] && tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'TRIGGER_CALIBRATION'
          }).then(() => {
            console.log('[Sidepanel] Calibration message sent successfully');
          }).catch((error) => {
            console.warn('[Sidepanel] Calibration failed - content script not ready:', error);
            // If content script not ready, refresh the page
            chrome.tabs.reload(tabs[0].id, () => {
              setTimeout(() => {
                chrome.tabs.sendMessage(tabs[0].id, {
                  type: 'TRIGGER_CALIBRATION'
                }).catch(() => { });
              }, 1000);
            });
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

      // Blur the button
      elements.calibrateMouthBtn.blur();

      // Send message to active tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0] && tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'TRIGGER_MOUTH_CALIBRATION'
          }).catch((error) => {
            console.warn('[Sidepanel] Mouth calibration failed - content script not ready:', error);
            // If content script not ready, refresh the page
            chrome.tabs.reload(tabs[0].id, () => {
              setTimeout(() => {
                chrome.tabs.sendMessage(tabs[0].id, {
                  type: 'TRIGGER_MOUTH_CALIBRATION'
                }).catch(() => { });
              }, 1000);
            });
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
          }).catch(() => { });
        }
      });
    });
  }

  // AI Summary enabled toggle
  const aiSummaryToggle = document.getElementById('ai-summary-enabled');
  if (aiSummaryToggle) {
    aiSummaryToggle.addEventListener('change', async (e) => {
      settings.aiSummaryEnabled = e.target.checked;
      saveSettings();
      console.log('[Sidepanel] AI Summarization toggled:', settings.aiSummaryEnabled);

      // Notify content script
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'AI_SUMMARY_ENABLED_CHANGED',
            aiSummaryEnabled: settings.aiSummaryEnabled
          }).catch(() => {
            // Ignore errors if content script not ready
          });
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

// ========================================
// VOICE RECOGNITION (SIDEPANEL MANAGED)
// ========================================

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let voiceRunning = false;
let lastInterimMatch = '';

// UPDATED: Expanded instant commands list
const INSTANT_COMMANDS = [
  'scroll down', 'scroll up', 'go back', 'go forward',
  'click', 'reload', 'refresh', 'top', 'bottom',
  'new tab', 'close tab', 'next tab', 'previous tab',
  'stop', 'cancel', 'yes', 'no', 'help'
];

let voiceContext = "default";
let voiceSynthesis = window.speechSynthesis;
let voicePausedForTTS = false;
let lastExecutedCommand = '';

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
  } else if (type === 'unknown') {
    badgeClass = 'badge-ignored';
    badgeText = 'Unknown';
  }

  const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

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

// ========================================
// FIXED: VOICE RECOGNITION WITH BETTER ERROR HANDLING
// ========================================

function startVoiceRecognition() {
  if (!SpeechRecognition) {
    console.warn("[Voice] SpeechRecognition API not available in sidepanel");
    return;
  }
  if (voiceRunning) return;

  if (recognition) {
    try { recognition.stop(); } catch (e) { }
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
      }, 500); // Increased from 300ms for stability
    }
  };

  // FIXED: Better error handling for network errors
  recognition.onerror = (e) => {
    console.warn("[Voice] Error:", e.error);

    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
      settings.voiceEnabled = false;
      if (elements.voiceEnabled) elements.voiceEnabled.checked = false;
      saveSettings();
      appendVoiceLog('Microphone access denied', 'heard', null);
    } else if (e.error === 'network') {
      // Network error - retry after delay
      appendVoiceLog('Network error, retrying...', 'heard', null);
      voiceRunning = false;
      setTimeout(() => {
        if (settings.voiceEnabled) {
          startVoiceRecognition();
        }
      }, 2000);
    } else if (e.error === 'aborted') {
      voiceRunning = false;
    } else {
      // Other errors - retry
      voiceRunning = false;
      setTimeout(() => {
        if (settings.voiceEnabled) {
          startVoiceRecognition();
        }
      }, 1000);
    }
  };

  try { recognition.start(); } catch (e) {
    console.error("[Voice] Failed to start:", e);
    // Retry after delay
    setTimeout(() => {
      if (settings.voiceEnabled) {
        startVoiceRecognition();
      }
    }, 1000);
  }
}

function stopVoiceRecognition() {
  voiceRunning = false;
  if (recognition) {
    try { recognition.stop(); } catch (e) { }
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

/**
 * UPDATED: Enhanced voice command handler with modular support
 * Routes commands to content script for execution
 */
function handleVoiceCommand(command) {
  // Prevent duplicate execution of the same command
  if (lastExecutedCommand === command) {
    console.log('[Voice] Duplicate command ignored:', command);
    return null;
  }

  // Handle search context
  if (voiceContext === "awaiting_search_query") {
    voiceContext = "default";
    if (command && !command.includes("cancel") && !command.includes("stop")) {
      chrome.tabs.create({ url: `https://www.google.com/search?q=${encodeURIComponent(command)}` });
      lastExecutedCommand = command;
      return "search: " + command;
    }
    lastExecutedCommand = command;
    return "search cancelled";
  }

  // ========================================
  // NAVIGATION COMMANDS
  // ========================================

  // Scroll commands
  if (command.includes("scroll down") || command.includes("page down")) {
    executeInActiveTab("scroll down");
    lastExecutedCommand = command;
    return "scroll down";
  }
  else if (command.includes("scroll up") || command.includes("page up")) {
    executeInActiveTab("scroll up");
    lastExecutedCommand = command;
    return "scroll up";
  }
  else if (command.includes("scroll left")) {
    executeInActiveTab("scroll left");
    lastExecutedCommand = command;
    return "scroll left";
  }
  else if (command.includes("scroll right")) {
    executeInActiveTab("scroll right");
    lastExecutedCommand = command;
    return "scroll right";
  }
  else if (command.includes("scroll faster")) {
    executeInActiveTab("scroll faster");
    lastExecutedCommand = command;
    return "scroll faster";
  }
  else if (command.includes("scroll slower")) {
    executeInActiveTab("scroll slower");
    lastExecutedCommand = command;
    return "scroll slower";
  }
  else if (command.includes("stop scrolling") || command === "stop") {
    executeInActiveTab("stop scrolling");
    lastExecutedCommand = command;
    return "stop scrolling";
  }

  // Navigation commands
  else if (command.includes("go back") || command === "back") {
    executeInActiveTab("go back");
    lastExecutedCommand = command;
    return "go back";
  }
  else if (command.includes("go forward") || command === "forward") {
    executeInActiveTab("go forward");
    lastExecutedCommand = command;
    return "go forward";
  }
  else if (command.includes("reload") || command.includes("refresh")) {
    executeInActiveTab("reload");
    lastExecutedCommand = command;
    return "reload";
  }
  else if (command.includes("top") || command.includes("scroll to top")) {
    executeInActiveTab("go to top");
    lastExecutedCommand = command;
    return "go to top";
  }
  else if (command.includes("bottom") || command.includes("scroll to bottom")) {
    executeInActiveTab("go to bottom");
    lastExecutedCommand = command;
    return "go to bottom";
  }

  // ========================================
  // TAB COMMANDS
  // ========================================

  else if (command.includes("new tab")) {
    executeInActiveTab("new tab");
    lastExecutedCommand = command;
    return "new tab";
  }
  else if (command.includes("close tab")) {
    executeInActiveTab("close tab");
    lastExecutedCommand = command;
    return "close tab";
  }
  else if (command.includes("next tab")) {
    executeInActiveTab("next tab");
    lastExecutedCommand = command;
    return "next tab";
  }
  else if (command.includes("previous tab") || command.includes("prev tab")) {
    executeInActiveTab("previous tab");
    lastExecutedCommand = command;
    return "previous tab";
  }

  // ========================================
  // CLICK COMMANDS
  // ========================================

  else if (command.includes("click")) {
    executeInActiveTab("click");
    lastExecutedCommand = command;
    return "click";
  }
  else if (command.includes("double click")) {
    executeInActiveTab("double click");
    lastExecutedCommand = command;
    return "double click";
  }
  else if (command.includes("right click")) {
    executeInActiveTab("right click");
    lastExecutedCommand = command;
    return "right click";
  }
  else if (command.includes("left click")) {
    executeInActiveTab("left click");
    lastExecutedCommand = command;
    return "left click";
  }

  // ========================================
  // ZOOM COMMANDS
  // ========================================

  else if (command.includes("zoom in")) {
    executeInActiveTab("zoom in");
    lastExecutedCommand = command;
    return "zoom in";
  }
  else if (command.includes("zoom out")) {
    executeInActiveTab("zoom out");
    lastExecutedCommand = command;
    return "zoom out";
  }
  else if (command.includes("reset zoom")) {
    executeInActiveTab("reset zoom");
    lastExecutedCommand = command;
    return "reset zoom";
  }

  // ========================================
  // FULLSCREEN COMMANDS
  // ========================================

  else if (command.includes("fullscreen") || command.includes("full screen")) {
    executeInActiveTab("fullscreen");
    lastExecutedCommand = command;
    return "fullscreen";
  }
  else if (command.includes("exit fullscreen")) {
    executeInActiveTab("exit fullscreen");
    lastExecutedCommand = command;
    return "exit fullscreen";
  }

  // ========================================
  // TEXT & SELECTION COMMANDS
  // ========================================

  else if (command.includes("select all")) {
    executeInActiveTab("select all");
    lastExecutedCommand = command;
    return "select all";
  }
  else if (command.includes("copy")) {
    executeInActiveTab("copy");
    lastExecutedCommand = command;
    return "copy";
  }
  else if (command.includes("paste")) {
    executeInActiveTab("paste");
    lastExecutedCommand = command;
    return "paste";
  }
  else if (command.includes("cut")) {
    executeInActiveTab("cut");
    lastExecutedCommand = command;
    return "cut";
  }
  else if (command.includes("undo")) {
    executeInActiveTab("undo");
    lastExecutedCommand = command;
    return "undo";
  }
  else if (command.includes("redo")) {
    executeInActiveTab("redo");
    lastExecutedCommand = command;
    return "redo";
  }

  // ========================================
  // TEXT INPUT COMMANDS
  // ========================================

  else if (command.includes("start typing")) {
    executeInActiveTab("start typing");
    lastExecutedCommand = command;
    return "start typing";
  }
  else if (command.includes("stop typing")) {
    executeInActiveTab("stop typing");
    lastExecutedCommand = command;
    return "stop typing";
  }
  else if (command.includes("clear text")) {
    executeInActiveTab("clear text");
    lastExecutedCommand = command;
    return "clear text";
  }
  else if (command.includes("delete last word")) {
    executeInActiveTab("delete last word");
    lastExecutedCommand = command;
    return "delete last word";
  }

  // ========================================
  // KEY PRESS COMMANDS
  // ========================================

  else if (command.includes("press enter") || command === "enter") {
    executeInActiveTab("press enter");
    lastExecutedCommand = command;
    return "press enter";
  }
  else if (command.includes("press tab") || command === "tab") {
    executeInActiveTab("press tab");
    lastExecutedCommand = command;
    return "press tab";
  }
  else if (command.includes("press escape") || command === "escape" || command === "esc") {
    executeInActiveTab("press escape");
    lastExecutedCommand = command;
    return "press escape";
  }

  // ========================================
  // FORM COMMANDS
  // ========================================

  else if (command.includes("next field")) {
    executeInActiveTab("next field");
    lastExecutedCommand = command;
    return "next field";
  }
  else if (command.includes("previous field") || command.includes("prev field")) {
    executeInActiveTab("previous field");
    lastExecutedCommand = command;
    return "previous field";
  }
  else if (command.includes("check checkbox")) {
    executeInActiveTab("check checkbox");
    lastExecutedCommand = command;
    return "check checkbox";
  }
  else if (command.includes("uncheck checkbox")) {
    executeInActiveTab("uncheck checkbox");
    lastExecutedCommand = command;
    return "uncheck checkbox";
  }
  else if (command.includes("submit form") || command === "submit") {
    executeInActiveTab("submit form");
    lastExecutedCommand = command;
    return "submit form";
  }

  // ========================================
  // MEDIA COMMANDS
  // ========================================

  else if (command.includes("play")) {
    executeInActiveTab("play");
    lastExecutedCommand = command;
    return "play";
  }
  else if (command.includes("pause")) {
    executeInActiveTab("pause");
    lastExecutedCommand = command;
    return "pause";
  }
  else if (command.includes("mute")) {
    executeInActiveTab("mute");
    lastExecutedCommand = command;
    return "mute";
  }
  else if (command.includes("unmute")) {
    executeInActiveTab("unmute");
    lastExecutedCommand = command;
    return "unmute";
  }
  else if (command.includes("volume up")) {
    executeInActiveTab("volume up");
    lastExecutedCommand = command;
    return "volume up";
  }
  else if (command.includes("volume down")) {
    executeInActiveTab("volume down");
    lastExecutedCommand = command;
    return "volume down";
  }
  else if (command.includes("next video")) {
    executeInActiveTab("next video");
    lastExecutedCommand = command;
    return "next video";
  }
  else if (command.includes("previous video") || command.includes("prev video")) {
    executeInActiveTab("previous video");
    lastExecutedCommand = command;
    return "previous video";
  }
  else if (command.includes("skip forward")) {
    executeInActiveTab("skip forward");
    lastExecutedCommand = command;
    return "skip forward";
  }
  else if (command.includes("rewind")) {
    executeInActiveTab("rewind");
    lastExecutedCommand = command;
    return "rewind";
  }

  // ========================================
  // ACCESSIBILITY COMMANDS
  // ========================================

  else if (command.includes("read page") || command.includes("read aloud")) {
    executeInActiveTab("read page");
    lastExecutedCommand = command;
    return "read page";
  }
  else if (command.includes("stop reading")) {
    executeInActiveTab("stop reading");
    lastExecutedCommand = command;
    return "stop reading";
  }
  else if (command.includes("read selected text")) {
    executeInActiveTab("read selected text");
    lastExecutedCommand = command;
    return "read selected text";
  }
  else if (command.includes("increase text size")) {
    executeInActiveTab("increase text size");
    lastExecutedCommand = command;
    return "increase text size";
  }
  else if (command.includes("decrease text size")) {
    executeInActiveTab("decrease text size");
    lastExecutedCommand = command;
    return "decrease text size";
  }

  // ========================================
  // EXTENSION COMMANDS
  // ========================================

  else if (command.includes("enable voice")) {
    settings.voiceEnabled = true;
    if (elements.voiceEnabled) elements.voiceEnabled.checked = true;
    saveSettings();
    startVoiceRecognition();
    lastExecutedCommand = command;
    return "enable voice";
  }
  else if (command.includes("disable voice")) {
    settings.voiceEnabled = false;
    if (elements.voiceEnabled) elements.voiceEnabled.checked = false;
    saveSettings();
    stopVoiceRecognition();
    lastExecutedCommand = command;
    return "disable voice";
  }
  else if (command.includes("enable mouth click")) {
    chrome.storage.local.set({ mouthClickEnabled: true });
    if (elements.mouthClickEnabled) elements.mouthClickEnabled.checked = true;
    if (elements.calibrateMouthBtn) elements.calibrateMouthBtn.disabled = false;
    lastExecutedCommand = command;
    return "enable mouth click";
  }
  else if (command.includes("disable mouth click")) {
    chrome.storage.local.set({ mouthClickEnabled: false });
    if (elements.mouthClickEnabled) elements.mouthClickEnabled.checked = false;
    if (elements.calibrateMouthBtn) elements.calibrateMouthBtn.disabled = true;
    lastExecutedCommand = command;
    return "disable mouth click";
  }
  else if (command.includes("enable head tracking")) {
    settings.gazeEnabled = true;
    if (elements.gazeEnabled) elements.gazeEnabled.checked = true;
    saveSettings();
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'GAZE_ENABLED_CHANGED',
          gazeEnabled: true
        }).catch(() => { });
      }
    });
    lastExecutedCommand = command;
    return "enable head tracking";
  }
  else if (command.includes("disable head tracking")) {
    settings.gazeEnabled = false;
    if (elements.gazeEnabled) elements.gazeEnabled.checked = false;
    saveSettings();
    updateGazeStatus('ready', 'Disabled');
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'GAZE_ENABLED_CHANGED',
          gazeEnabled: false
        }).catch(() => { });
      }
    });
    lastExecutedCommand = command;
    return "disable head tracking";
  }
  else if (command.includes("start calibration") || command.includes("calibrate")) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'TRIGGER_CALIBRATION'
        }).catch(() => { });
      }
    });
    lastExecutedCommand = command;
    return "start calibration";
  }
  else if (command.includes("reset calibration")) {
    chrome.storage.local.remove(['gazeCalibration', 'mouthCalV1']);
    updateMouthStatus(false);
    lastExecutedCommand = command;
    return "reset calibration";
  }

  // ========================================
  // BROWSER COMMANDS
  // ========================================

  else if (command.includes("open history") || command === "history") {
    executeInActiveTab("open history");
    lastExecutedCommand = command;
    return "open history";
  }
  else if (command.includes("open downloads") || command === "downloads") {
    executeInActiveTab("open downloads");
    lastExecutedCommand = command;
    return "open downloads";
  }
  else if (command.includes("open bookmarks") || command === "bookmarks") {
    executeInActiveTab("open bookmarks");
    lastExecutedCommand = command;
    return "open bookmarks";
  }

  // ========================================
  // SEARCH COMMANDS
  // ========================================

  else if (command.startsWith("search ")) {
    const query = command.replace(/^search\s+/, "").trim();
    if (query) {
      chrome.tabs.create({ url: `https://www.google.com/search?q=${encodeURIComponent(query)}` });
    }
    lastExecutedCommand = command;
    return "search: " + query;
  }
  else if (command.trim() === "search") {
    voicePausedForTTS = true;
    if (recognition) try { recognition.stop(); } catch (e) { }
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
    lastExecutedCommand = command;
    return "search (waiting...)";
  }

  // ========================================
  // SMART COMMANDS
  // ========================================

  else if (command === "yes" || command === "yep" || command === "yeah") {
    executeInActiveTab("yes");
    lastExecutedCommand = command;
    return "yes";
  }
  else if (command === "no" || command === "nope") {
    executeInActiveTab("no");
    lastExecutedCommand = command;
    return "no";
  }
  else if (command.includes("cancel")) {
    if (voiceContext === "awaiting_search_query") {
      voiceContext = "default";
      if (voiceSynthesis) {
        const utterance = new SpeechSynthesisUtterance("Search cancelled");
        voiceSynthesis.speak(utterance);
      }
      startVoiceRecognition();
    }
    lastExecutedCommand = command;
    return "cancel";
  }
  else if (command.includes("help")) {
    speakAvailableCommands();
    lastExecutedCommand = command;
    return "help";
  }
  else if (command.includes("repeat")) {
    executeInActiveTab("repeat");
    lastExecutedCommand = command;
    return "repeat";
  }

  // ========================================
  // UNKNOWN COMMAND
  // ========================================

  else {
    console.log('[Voice] Unknown command:', command);
    appendVoiceLog(command, 'unknown', null);
    return null;
  }
}

console.log('[Sidepanel] Voice command system loaded with modular commands');