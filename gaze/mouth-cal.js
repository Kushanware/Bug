// (function() {
//   'use strict';

//   const MOUTH_CAL_STORAGE_KEY = 'mouthCalV1';
//   const MIN_SAMPLES = 10;

//   let calUI = null;
//   let currentStep = 'idle'; // 'idle', 'open', 'closed'
//   let samples = [];

//   function createCalibrationUI() {
//     const overlay = document.createElement('div');
//     overlay.id = 'mouth-cal-overlay';
//     overlay.style.cssText = `
//       position: fixed;
//       top: 0;
//       left: 0;
//       width: 100%;
//       height: 100%;
//       background: rgba(0, 0, 0, 0.9);
//       z-index: 2147483647;
//       display: flex;
//       align-items: center;
//       justify-content: center;
//       font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
//     `;

//     const panel = document.createElement('div');
//     panel.style.cssText = `
//       background: #2a2a2a;
//       border-radius: 16px;
//       padding: 48px;
//       max-width: 600px;
//       text-align: center;
//       color: white;
//       box-shadow: 0 8px 32px rgba(0,0,0,0.4);
//     `;

//     panel.innerHTML = `
//       <div style="font-size: 48px; margin-bottom: 16px;">👄</div>
//       <h2 style="margin: 0 0 16px 0; font-size: 28px; font-weight: 600;">Mouth Click Calibration</h2>
//       <p id="mouth-cal-instructions" style="font-size: 18px; line-height: 1.6; margin: 0 0 32px 0; color: #ccc;">
//         Click "Start" to begin calibrating mouth-open detection.<br>
//         You'll capture your mouth in two positions: open and closed.
//       </p>
//       <div id="mouth-cal-progress" style="display: none; margin-bottom: 24px;">
//         <div style="font-size: 64px; font-weight: bold; color: #8b5a3c;" id="mouth-cal-count">0</div>
//         <div style="font-size: 14px; color: #999;">samples collected</div>
//       </div>
//       <button id="mouth-cal-action" style="
//         background: #8b5a3c;
//         color: white;
//         border: none;
//         padding: 16px 48px;
//         font-size: 18px;
//         font-weight: 600;
//         border-radius: 8px;
//         cursor: pointer;
//         transition: all 0.2s;
//       ">Start Calibration</button>
//       <div style="margin-top: 24px; font-size: 14px; color: #999;">Press ESC to cancel</div>
//     `;

//     overlay.appendChild(panel);
//     return overlay;
//   }

//   function updateUI(step, count = 0) {
//     const instructions = document.getElementById('mouth-cal-instructions');
//     const progress = document.getElementById('mouth-cal-progress');
//     const countEl = document.getElementById('mouth-cal-count');
//     const button = document.getElementById('mouth-cal-action');

//     if (!instructions || !button) return;

//     countEl.textContent = count;

//     if (step === 'start') {
//       instructions.innerHTML = `
//         <strong style="font-size: 24px; color: #8b5a3c;">Step 1: Open Mouth</strong><br><br>
//         OPEN your mouth wide (like saying "AAAH")<br>
//         and press SPACE or click the button below.
//       `;
//       progress.style.display = 'block';
//       button.textContent = 'Capture Open Mouth';
//       button.style.background = '#8b5a3c';
//     } else if (step === 'open-collecting') {
//       instructions.innerHTML = `
//         <strong style="font-size: 24px; color: #4CAF50;">Keep mouth OPEN!</strong><br><br>
//         Collecting samples... ${count}/${MIN_SAMPLES}
//       `;
//       button.textContent = 'Collecting...';
//       button.disabled = true;
//       button.style.background = '#666';
//       button.style.cursor = 'not-allowed';
//     } else if (step === 'open-done') {
//       instructions.innerHTML = `
//         <strong style="font-size: 24px; color: #4CAF50;">✓ Open mouth captured!</strong><br><br>
//         <strong style="font-size: 24px; color: #8b5a3c;">Step 2: Close Mouth</strong><br><br>
//         CLOSE your mouth normally (relaxed)<br>
//         and press SPACE or click the button below.
//       `;
//       button.textContent = 'Capture Closed Mouth';
//       button.disabled = false;
//       button.style.background = '#8b5a3c';
//       button.style.cursor = 'pointer';
//     } else if (step === 'closed-collecting') {
//       instructions.innerHTML = `
//         <strong style="font-size: 24px; color: #4CAF50;">Keep mouth CLOSED!</strong><br><br>
//         Collecting samples... ${count}/${MIN_SAMPLES}
//       `;
//       button.textContent = 'Collecting...';
//       button.disabled = true;
//       button.style.background = '#666';
//       button.style.cursor = 'not-allowed';
//     } else if (step === 'done') {
//       instructions.innerHTML = `
//         <strong style="font-size: 32px; color: #4CAF50;">🎉 Calibration Complete!</strong><br><br>
//         Mouth-open clicking is now ready to use.<br>
//         Open your mouth wide to trigger clicks!
//       `;
//       progress.style.display = 'none';
//       button.textContent = 'Done';
//       button.style.background = '#4CAF50';
//     }
//   }

//   function collectSamples(type) {
//     samples = [];
//     currentStep = `${type}-collecting`;
//     updateUI(currentStep, 0);

//     const interval = setInterval(() => {
//       const ratio = window.__lastMouthRatio || 0;
//       if (ratio > 0) {
//         samples.push(ratio);
//         updateUI(currentStep, samples.length);

//         if (samples.length >= MIN_SAMPLES) {
//           clearInterval(interval);
//           const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
//           console.log(`[MouthCal] ${type} average: ${avg.toFixed(3)}`);

//           if (type === 'open') {
//             window.__mouthCalOpen = avg;
//             currentStep = 'open-done';
//             updateUI(currentStep);
//           } else {
//             window.__mouthCalClosed = avg;
//             finishCalibration();
//           }
//         }
//       }
//     }, 100);

//     // Store interval so we can cancel if needed
//     window.__mouthCalInterval = interval;
//   }

//   function finishCalibration() {
//     const openRatio = window.__mouthCalOpen;
//     const closedRatio = window.__mouthCalClosed;

//     // Calculate threshold at 50% between closed and open
//     const threshold = closedRatio + (openRatio - closedRatio) * 0.5;

//     const calibration = {
//       version: 1,
//       closedRatio,
//       openRatio,
//       threshold,
//       timestamp: Date.now()
//     };

//     console.log('[MouthCal] Calibration complete:', calibration);

//     // Save to storage
//     chrome.storage.local.set({ [MOUTH_CAL_STORAGE_KEY]: calibration }, () => {
//       console.log('[MouthCal] Saved to storage');
//     });

//     // Dispatch event to notify gaze-core
//     window.dispatchEvent(new CustomEvent('mouth-cal:complete', {
//       detail: calibration
//     }));

//     currentStep = 'done';
//     updateUI(currentStep);

//     setTimeout(() => {
//       closeCalibration();
//     }, 2000);
//   }

//   function startCalibration() {
//     console.log('[MouthCal] Starting mouth calibration');
//     window.__gazeMouthCalActive = true;

//     calUI = createCalibrationUI();
//     document.body.appendChild(calUI);

//     const button = document.getElementById('mouth-cal-action');

//     button.addEventListener('click', () => {
//       if (currentStep === 'idle' || currentStep === 'start') {
//         currentStep = 'open';
//         collectSamples('open');
//       } else if (currentStep === 'open-done') {
//         currentStep = 'closed';
//         collectSamples('closed');
//       } else if (currentStep === 'done') {
//         closeCalibration();
//       }
//     });

//     // Handle spacebar
//     const handleKeydown = (e) => {
//       if (e.code === 'Space') {
//         e.preventDefault();
//         button.click();
//       } else if (e.code === 'Escape') {
//         e.preventDefault();
//         closeCalibration();
//       }
//     };

//     document.addEventListener('keydown', handleKeydown);
//     calUI.__keydownHandler = handleKeydown;

//     currentStep = 'start';
//     updateUI(currentStep);
//   }

//   function closeCalibration() {
//     console.log('[MouthCal] Closing calibration');
//     window.__gazeMouthCalActive = false;

//     if (window.__mouthCalInterval) {
//       clearInterval(window.__mouthCalInterval);
//       window.__mouthCalInterval = null;
//     }

//     if (calUI) {
//       if (calUI.__keydownHandler) {
//         document.removeEventListener('keydown', calUI.__keydownHandler);
//       }
//       calUI.remove();
//       calUI = null;
//     }

//     currentStep = 'idle';
//     samples = [];
//   }

//   // Expose function globally
//   window.startMouthCalibration = startCalibration;

//   // Listen for calibration requests
//   window.addEventListener('mouth-cal:start', startCalibration);

//   // Keyboard shortcut: Alt+M
//   document.addEventListener('keydown', (event) => {
//     const code = event.code || '';
//     if (event.altKey && !event.ctrlKey && !event.metaKey && code === 'KeyM') {
//       event.preventDefault();
//       event.stopPropagation();
//       startCalibration();
//     }
//   }, true);

//   console.log('[MouthCal] Mouth calibration module loaded. Press Alt+M to calibrate.');
// })();


// ========================================
// MOUTH CALIBRATION MODULE
// ========================================

(function() {
  'use strict';

  // ========================================
  // CONFIGURATION
  // ========================================
  
  const CONFIG = {
    MOUTH_CAL_STORAGE_KEY: 'mouthCalV1',
    MIN_SAMPLES: 10,
    SAMPLE_INTERVAL_MS: 100,
    AUTO_CLOSE_DELAY_MS: 2000,
    DISMISS_TIMEOUT_MS: 5000
  };

  // ========================================
  // STATE
  // ========================================
  
  let calUI = null;
  let currentStep = 'idle'; // 'idle', 'start', 'open', 'open-collecting', 'open-done', 'closed', 'closed-collecting', 'done'
  let samples = [];
  let sampleInterval = null;
  let autoCloseTimeout = null;
  let isCalibrating = false;

  // ========================================
  // DOM HELPERS
  // ========================================
  
  function getElement(id) {
    return document.getElementById(id);
  }

  function updateElementText(id, text) {
    const el = getElement(id);
    if (el) el.textContent = text;
  }

  function updateElementHTML(id, html) {
    const el = getElement(id);
    if (el) el.innerHTML = html;
  }

  function updateElementStyle(id, styles) {
    const el = getElement(id);
    if (el) {
      Object.assign(el.style, styles);
    }
  }

  function showElement(id) {
    const el = getElement(id);
    if (el) el.style.display = 'block';
  }

  function hideElement(id) {
    const el = getElement(id);
    if (el) el.style.display = 'none';
  }

  // ========================================
  // UI CREATION
  // ========================================
  
  function createCalibrationUI() {
    const overlay = document.createElement('div');
    overlay.id = 'mouth-cal-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      animation: mouthCalFadeIn 0.3s ease;
    `;

    // Add animation styles
    if (!document.getElementById('mouth-cal-styles')) {
      const style = document.createElement('style');
      style.id = 'mouth-cal-styles';
      style.textContent = `
        @keyframes mouthCalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes mouthCalPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        .mouth-cal-pulse {
          animation: mouthCalPulse 1s ease-in-out infinite;
        }
      `;
      document.head.appendChild(style);
    }

    const panel = document.createElement('div');
    panel.style.cssText = `
      background: #2a2a2a;
      border-radius: 16px;
      padding: 48px;
      max-width: 600px;
      width: 90%;
      text-align: center;
      color: white;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      max-height: 90vh;
      overflow-y: auto;
    `;

    panel.innerHTML = `
      <div style="font-size: 48px; margin-bottom: 16px;" id="mouth-cal-icon">👄</div>
      <h2 style="margin: 0 0 16px 0; font-size: 28px; font-weight: 600;">Mouth Click Calibration</h2>
      <p id="mouth-cal-instructions" style="font-size: 18px; line-height: 1.6; margin: 0 0 32px 0; color: #ccc;">
        Click "Start" to begin calibrating mouth-open detection.<br>
        You'll capture your mouth in two positions: open and closed.
      </p>
      <div id="mouth-cal-progress" style="display: none; margin-bottom: 24px;">
        <div style="font-size: 64px; font-weight: bold; color: #8b5a3c;" id="mouth-cal-count">0</div>
        <div style="font-size: 14px; color: #999;">samples collected</div>
        <div style="margin-top: 8px; font-size: 12px; color: #666;" id="mouth-cal-status-text">Collecting...</div>
      </div>
      <button id="mouth-cal-action" style="
        background: #8b5a3c;
        color: white;
        border: none;
        padding: 16px 48px;
        font-size: 18px;
        font-weight: 600;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
        min-width: 200px;
      ">Start Calibration</button>
      <div style="margin-top: 24px; font-size: 14px; color: #999;">
        Press <kbd style="background:#444;padding:2px 8px;border-radius:4px;">SPACE</kbd> to capture | 
        <kbd style="background:#444;padding:2px 8px;border-radius:4px;">ESC</kbd> to cancel
      </div>
      <div id="mouth-cal-error" style="display:none;margin-top:16px;padding:12px;background:#442222;border-radius:8px;color:#ff6b6b;"></div>
    `;

    overlay.appendChild(panel);
    return overlay;
  }

  // ========================================
  // UI UPDATE FUNCTIONS
  // ========================================
  
  function updateUI(step, count = 0) {
    const instructions = getElement('mouth-cal-instructions');
    const button = getElement('mouth-cal-action');
    const icon = getElement('mouth-cal-icon');
    const statusText = getElement('mouth-cal-status-text');

    if (!instructions || !button) return;

    updateElementText('mouth-cal-count', count);

    // Reset button state
    button.disabled = false;
    button.style.cursor = 'pointer';
    button.style.background = '#8b5a3c';
    button.textContent = 'Next Step';

    switch (step) {
      case 'start':
        instructions.innerHTML = `
          <strong style="font-size: 24px; color: #8b5a3c;">Step 1: Open Mouth</strong><br><br>
          OPEN your mouth wide (like saying "AAAH")<br>
          and press <kbd style="background:#444;padding:2px 8px;border-radius:4px;">SPACE</kbd> or click the button below.
        `;
        showElement('mouth-cal-progress');
        button.textContent = 'Capture Open Mouth';
        if (icon) icon.textContent = '👄';
        if (statusText) statusText.textContent = 'Get ready to open your mouth...';
        break;

      case 'open-collecting':
        instructions.innerHTML = `
          <strong style="font-size: 24px; color: #4CAF50;">Keep mouth OPEN!</strong><br><br>
          Collecting samples... ${count}/${CONFIG.MIN_SAMPLES}
        `;
        button.textContent = 'Collecting...';
        button.disabled = true;
        button.style.background = '#666';
        button.style.cursor = 'not-allowed';
        if (icon) icon.textContent = '😮';
        if (statusText) statusText.textContent = `Collecting open mouth samples (${count}/${CONFIG.MIN_SAMPLES})`;
        break;

      case 'open-done':
        instructions.innerHTML = `
          <strong style="font-size: 24px; color: #4CAF50;">✓ Open mouth captured!</strong><br><br>
          <strong style="font-size: 24px; color: #8b5a3c;">Step 2: Close Mouth</strong><br><br>
          CLOSE your mouth normally (relaxed)<br>
          and press <kbd style="background:#444;padding:2px 8px;border-radius:4px;">SPACE</kbd> or click the button below.
        `;
        button.textContent = 'Capture Closed Mouth';
        button.style.background = '#8b5a3c';
        if (icon) icon.textContent = '😐';
        if (statusText) statusText.textContent = 'Close your mouth naturally';
        break;

      case 'closed-collecting':
        instructions.innerHTML = `
          <strong style="font-size: 24px; color: #4CAF50;">Keep mouth CLOSED!</strong><br><br>
          Collecting samples... ${count}/${CONFIG.MIN_SAMPLES}
        `;
        button.textContent = 'Collecting...';
        button.disabled = true;
        button.style.background = '#666';
        button.style.cursor = 'not-allowed';
        if (icon) icon.textContent = '😐';
        if (statusText) statusText.textContent = `Collecting closed mouth samples (${count}/${CONFIG.MIN_SAMPLES})`;
        break;

      case 'done':
        instructions.innerHTML = `
          <strong style="font-size: 32px; color: #4CAF50;">🎉 Calibration Complete!</strong><br><br>
          Mouth-open clicking is now ready to use.<br>
          Open your mouth wide to trigger clicks!
        `;
        hideElement('mouth-cal-progress');
        button.textContent = 'Done ✓';
        button.style.background = '#4CAF50';
        if (icon) icon.textContent = '✅';
        if (statusText) statusText.textContent = 'Calibration successful!';
        break;

      default:
        break;
    }
  }

  function showError(message) {
    const errorEl = getElement('mouth-cal-error');
    if (errorEl) {
      errorEl.textContent = '⚠️ ' + message;
      errorEl.style.display = 'block';
      setTimeout(() => {
        if (errorEl) errorEl.style.display = 'none';
      }, CONFIG.DISMISS_TIMEOUT_MS);
    }
  }

  // ========================================
  // CALIBRATION LOGIC
  // ========================================
  
  function collectSamples(type) {
    samples = [];
    currentStep = `${type}-collecting`;
    updateUI(currentStep, 0);

    if (sampleInterval) {
      clearInterval(sampleInterval);
      sampleInterval = null;
    }

    sampleInterval = setInterval(() => {
      const ratio = window.__lastMouthRatio || 0;
      
      if (ratio > 0) {
        samples.push(ratio);
        updateUI(currentStep, samples.length);

        if (samples.length >= CONFIG.MIN_SAMPLES) {
          clearInterval(sampleInterval);
          sampleInterval = null;
          
          const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
          console.log(`[MouthCal] ${type} average: ${avg.toFixed(3)}`);

          if (type === 'open') {
            window.__mouthCalOpen = avg;
            currentStep = 'open-done';
            updateUI(currentStep);
            
            // Speak confirmation (if available)
            speakStatus('Open mouth captured. Now close your mouth.');
          } else {
            window.__mouthCalClosed = avg;
            finishCalibration();
          }
        }
      } else if (samples.length === 0 && currentStep.includes('collecting')) {
        // Show warning if no samples yet
        const statusText = getElement('mouth-cal-status-text');
        if (statusText) {
          statusText.textContent = `Waiting for mouth detection... (${type} position)`;
        }
      }
    }, CONFIG.SAMPLE_INTERVAL_MS);
  }

  function finishCalibration() {
    const openRatio = window.__mouthCalOpen || 0.15;
    const closedRatio = window.__mouthCalClosed || 0.05;

    // Validate values
    if (openRatio <= closedRatio) {
      showError('Open ratio must be greater than closed ratio. Please recalibrate.');
      // Reset to start
      currentStep = 'start';
      updateUI(currentStep);
      return;
    }

    // Calculate threshold at 60% between closed and open (slightly higher for better accuracy)
    const threshold = closedRatio + (openRatio - closedRatio) * 0.6;

    const calibration = {
      version: 1,
      closedRatio: Math.round(closedRatio * 1000) / 1000,
      openRatio: Math.round(openRatio * 1000) / 1000,
      threshold: Math.round(threshold * 1000) / 1000,
      timestamp: Date.now()
    };

    console.log('[MouthCal] Calibration complete:', calibration);

    // Save to storage
    chrome.storage.local.set({ [CONFIG.MOUTH_CAL_STORAGE_KEY]: calibration }, () => {
      console.log('[MouthCal] Saved to storage');
      
      // Dispatch event to notify gaze-core
      window.dispatchEvent(new CustomEvent('mouth-cal:complete', {
        detail: calibration
      }));

      // Notify sidepanel
      chrome.runtime.sendMessage({
        action: 'voice_log',
        text: 'Mouth calibration complete! Open mouth to click.',
        type: 'executed',
        command: 'mouth_calibration'
      }).catch(() => {});
    });

    currentStep = 'done';
    updateUI(currentStep);
    
    // Speak completion
    speakStatus('Calibration complete! Open your mouth to click.');

    // Auto-close after delay
    if (autoCloseTimeout) {
      clearTimeout(autoCloseTimeout);
      autoCloseTimeout = null;
    }
    autoCloseTimeout = setTimeout(() => {
      closeCalibration();
    }, CONFIG.AUTO_CLOSE_DELAY_MS);
  }

  // ========================================
  // TTS HELPER
  // ========================================
  
  function speakStatus(message) {
    try {
      if (window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 0.8;
        window.speechSynthesis.speak(utterance);
      }
    } catch (error) {
      // Ignore TTS errors
    }
  }

  // ========================================
  // CALIBRATION CONTROL
  // ========================================
  
  function startCalibration() {
    // Prevent multiple calibrations
    if (isCalibrating) {
      console.log('[MouthCal] Calibration already in progress');
      return;
    }

    console.log('[MouthCal] Starting mouth calibration');
    isCalibrating = true;
    window.__gazeMouthCalActive = true;

    // Close any existing UI
    closeCalibration();

    calUI = createCalibrationUI();
    document.body.appendChild(calUI);

    const button = getElement('mouth-cal-action');
    if (!button) {
      console.error('[MouthCal] Button not found');
      closeCalibration();
      return;
    }

    // Click handler
    const clickHandler = () => {
      if (currentStep === 'idle' || currentStep === 'start') {
        currentStep = 'open';
        collectSamples('open');
      } else if (currentStep === 'open-done') {
        currentStep = 'closed';
        collectSamples('closed');
      } else if (currentStep === 'done') {
        closeCalibration();
      }
    };

    button.addEventListener('click', clickHandler);

    // Keyboard handler
    const keydownHandler = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        e.stopPropagation();
        if (!button.disabled) {
          button.click();
        }
      } else if (e.code === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeCalibration();
      }
    };

    document.addEventListener('keydown', keydownHandler, true);
    
    // Store handlers for cleanup
    calUI.__clickHandler = clickHandler;
    calUI.__keydownHandler = keydownHandler;

    currentStep = 'start';
    updateUI(currentStep);
    
    // Speak intro
    speakStatus('Starting mouth calibration. Open your mouth wide and press space.');
  }

  function closeCalibration() {
    console.log('[MouthCal] Closing calibration');
    isCalibrating = false;
    window.__gazeMouthCalActive = false;

    if (sampleInterval) {
      clearInterval(sampleInterval);
      sampleInterval = null;
    }

    if (autoCloseTimeout) {
      clearTimeout(autoCloseTimeout);
      autoCloseTimeout = null;
    }

    if (calUI) {
      // Clean up event listeners
      if (calUI.__clickHandler) {
        const button = getElement('mouth-cal-action');
        if (button) {
          button.removeEventListener('click', calUI.__clickHandler);
        }
        delete calUI.__clickHandler;
      }
      
      if (calUI.__keydownHandler) {
        document.removeEventListener('keydown', calUI.__keydownHandler, true);
        delete calUI.__keydownHandler;
      }
      
      calUI.remove();
      calUI = null;
    }

    currentStep = 'idle';
    samples = [];
  }

  // ========================================
  // PUBLIC API
  // ========================================
  
  // Expose function globally
  window.startMouthCalibration = startCalibration;
  window.closeMouthCalibration = closeCalibration;
  window.getMouthCalibrationStatus = () => ({
    isCalibrating,
    currentStep,
    samplesCollected: samples.length
  });

  // ========================================
  // EVENT LISTENERS
  // ========================================
  
  // Listen for calibration requests
  window.addEventListener('mouth-cal:start', startCalibration);
  window.addEventListener('mouth-cal:cancel', closeCalibration);

  // Keyboard shortcut: Alt+M
  document.addEventListener('keydown', (event) => {
    const code = event.code || '';
    // Only trigger if not in input/textarea
    const target = event.target;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
      return;
    }
    
    if (event.altKey && !event.ctrlKey && !event.metaKey && code === 'KeyM') {
      event.preventDefault();
      event.stopPropagation();
      
      if (isCalibrating) {
        closeCalibration();
      } else {
        startCalibration();
      }
    }
  }, true);

  // ========================================
  // STORAGE CHANGE LISTENER
  // ========================================
  
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[CONFIG.MOUTH_CAL_STORAGE_KEY]) {
      const newValue = changes[CONFIG.MOUTH_CAL_STORAGE_KEY].newValue;
      if (newValue) {
        console.log('[MouthCal] Calibration updated from storage:', newValue);
        // Notify content script
        window.dispatchEvent(new CustomEvent('mouth-cal:updated', {
          detail: newValue
        }));
      }
    }
  });

  console.log('[MouthCal] 🎯 Mouth calibration module loaded. Press Alt+M to calibrate.');
  console.log('[MouthCal] 📖 Commands: Alt+M = start/close calibration');
  console.log('[MouthCal] 💡 Use window.startMouthCalibration() to programmatically start');

})();