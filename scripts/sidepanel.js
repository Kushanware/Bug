class LowPassFilter {
  constructor(alpha) {
    this.alpha = alpha;
    this.y = null;
  }

  filter(value, alpha = null) {
    if (alpha !== null) this.alpha = alpha;
    if (this.y === null || isNaN(this.y)) {
      this.y = value;
    } else {
      this.y = this.y + this.alpha * (value - this.y);
    }
    return this.y;
  }

  lastValue() {
    return this.y;
  }
}

class OneEuroFilter {
  constructor(freq, mincutoff = 1.0, beta = 0.0, dcutoff = 1.0) {
    this.freq = freq;
    this.mincutoff = mincutoff;
    this.beta = beta;
    this.dcutoff = dcutoff;
    this.x = new LowPassFilter(this.alpha(mincutoff));
    this.dx = new LowPassFilter(this.alpha(dcutoff));
    this.lastTime = null;
  }

  alpha(cutoff) {
    const te = 1.0 / this.freq;
    const tau = 1.0 / (2 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / te);
  }

  filter(value, mincutoff = null, beta = null, timestamp = null) {
    if (isNaN(value)) return 0.5;
    if (mincutoff !== null) this.mincutoff = mincutoff;
    if (beta !== null) this.beta = beta;

    if (this.lastTime !== null && timestamp !== null) {
      const dt = (timestamp - this.lastTime) / 1000.0;
      if (dt > 0.0001) {
        this.freq = 1.0 / dt;
      }
    }
    this.lastTime = timestamp;

    const lastX = this.x.lastValue();
    const dvalue = lastX === null || isNaN(lastX) ? 0.0 : (value - lastX) * this.freq;
    const edvalue = this.dx.filter(dvalue, this.alpha(this.dcutoff));
    const cutoff = this.mincutoff + this.beta * Math.abs(edvalue);

    const result = this.x.filter(value, this.alpha(cutoff));
    return isNaN(result) ? value : result;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const videoElement = document.getElementById('webcam-preview');
  const canvasElement = document.getElementById('canvas-overlay');
  const ctx = canvasElement.getContext('2d');
  const placeholder = document.getElementById('camera-placeholder');

  // HUD elements
  const hudElement = document.getElementById('system-hud');
  const hudIcon = document.getElementById('hud-icon');
  const hudText = document.getElementById('hud-text');

  let currentHUDState = "";
  function updateHUD(iconText, labelText, stateClass) {
    if (!hudElement || currentHUDState === stateClass) return;
    currentHUDState = stateClass;
    hudElement.className = 'system-hud ' + stateClass;
    hudIcon.textContent = iconText;
    hudText.textContent = labelText;
  }

  const btnCalibrate = document.getElementById('btn-calibrate');
  const calibrationStatus = document.getElementById('calibration-status');

  // Settings Toggles
  const toggleNavigation = document.getElementById('toggle-navigation');
  const toggleAimAssist = document.getElementById('toggle-aim-assist');
  const toggleDwellClicking = document.getElementById('toggle-dwell-clicking');
  const toggleMouthClicking = document.getElementById('toggle-mouth-clicking');
  const toggleScroll = document.getElementById('toggle-scroll');
  const toggleVoice = document.getElementById("toggle-voice");

  // Settings Sliders
  const sliderSensitivity = document.getElementById('slider-sensitivity');
  const sliderFilter = document.getElementById('slider-filter');
  const sliderSnapRadius = document.getElementById('slider-snap-radius');

  // Slider Value Readouts
  const valSensitivity = document.getElementById('val-sensitivity');
  const valFilter = document.getElementById('val-filter');
  const valSnapRadius = document.getElementById('val-snap-radius');

  let activeStream = null;
  let human = null;
  let isDetecting = false;

  // Calibration settings
  let isCalibrating = false;
  let calibBounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
  let calibratedBounds = null;

  // One Euro Filters for X & Y coordinates
  const filterX = new OneEuroFilter(30, 0.08, 0.4, 1.0);
  const filterY = new OneEuroFilter(30, 0.08, 0.4, 1.0);

  // Synchronise slider readout texts
  sliderSensitivity.addEventListener('input', () => {
    valSensitivity.textContent = `${sliderSensitivity.value}x`;
    syncConfig();
  });

  sliderFilter.addEventListener('input', () => {
    valFilter.textContent = sliderFilter.value;
    syncConfig();
  });

  sliderSnapRadius.addEventListener('input', () => {
    valSnapRadius.textContent = `${sliderSnapRadius.value}px`;
    syncConfig();
  });

  [
    toggleAimAssist,
    toggleDwellClicking,
    toggleMouthClicking,
    toggleScroll
  ].forEach(ctrl => {
    ctrl.addEventListener("change", syncConfig);
  });

  toggleNavigation.addEventListener("change", async () => {
    syncConfig();
    if (toggleNavigation.checked) {
      if (!activeStream || !activeStream.active) {
        await startCamera(true);
      }
    }
  });

  // Listen for permission granted message from the permission tab
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'permission_granted') {
      console.log("Camera permission granted message received, starting camera...");
      toggleNavigation.checked = true;
      syncConfig();
      startCamera();
    }
  });

  // Trigger calibration routine
  btnCalibrate.addEventListener('click', () => {
    startCalibration();
  });

  // Voice toggle - send to content script
  toggleVoice.addEventListener("change", () => {
    updateHUD(
      toggleVoice.checked ? "🎤" : "✓",
      toggleVoice.checked ? "Listening" : "Ready",
      toggleVoice.checked ? "state-listening" : "state-ready"
    );

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs.length) return;
      chrome.tabs.sendMessage(tabs[0].id, {
        action: "voice_toggle",
        enabled: toggleVoice.checked
      }).catch(() => {});
    });
  });

  // Initialize Human.js AI
  const humanConfig = {
    backend: 'webgl',
    cacheSensitivity: 0,
    modelBasePath: '../models/',
    face: {
      enabled: true,
      detector: { enabled: true, return: true, rotation: true },
      mesh: { enabled: true },
      iris: { enabled: false },
      description: { enabled: false },
      emotion: { enabled: false }
    },
    body: { enabled: false },
    hand: { enabled: false },
    object: { enabled: false },
    segmentation: { enabled: false }
  };

  try {
    const HumanClass = typeof Human !== 'undefined' ? (Human.default || Human) : null;
    if (!HumanClass) {
      throw new Error("Human.js library not loaded in sidepanel context.");
    }
    human = new HumanClass(humanConfig);
    console.log("Human.js instantiated successfully.");

    await human.load();
    console.log("Human.js models loaded.");

    await human.warmup();
    console.log("Human.js warmup complete.");

    await startCamera();
  } catch (err) {
    console.error("Initialization error:", err);
    placeholder.classList.remove('hidden');
  }

  // Start Camera Stream
  async function startCamera(userTriggered = false) {
    if (activeStream && activeStream.active) {
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false
      });
      activeStream = stream;
      videoElement.srcObject = stream;

      videoElement.onloadedmetadata = () => {
        canvasElement.width = videoElement.videoWidth;
        canvasElement.height = videoElement.videoHeight;
        placeholder.classList.add('hidden');

        if (!isDetecting) {
          isDetecting = true;
          detectFrame();
          startCalibration();
        }
      };

      // Check if this page was opened specifically to request permission
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('requestPermission') === 'true') {
        chrome.runtime.sendMessage({ action: 'permission_granted' }, () => {
          chrome.tabs.getCurrent((tab) => {
            if (tab) {
              chrome.tabs.remove(tab.id);
            }
          });
        });
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      placeholder.classList.remove('hidden');

      // Set checkbox to false since camera failed to start (e.g. no permission yet)
      toggleNavigation.checked = false;
      syncConfig();

      // If user explicitly toggled it ON, open a tab to request permission.
      if (userTriggered) {
        chrome.tabs.getCurrent((tab) => {
          if (!tab) {
            chrome.tabs.create({ url: chrome.runtime.getURL('sidepanel/sidepanel.html?requestPermission=true') });
          }
        });
      }
    }
  }

  // Sync parameters with active tab content script
  function syncConfig() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'config',
          sensitivityRadius: parseFloat(sliderSnapRadius.value),
          isAimAssistEnabled: toggleAimAssist.checked,
          isDwellClickingEnabled: toggleDwellClicking.checked,
          isMouthClickingEnabled: toggleMouthClicking.checked,
          isScrollEnabled: toggleScroll.checked,
          isNavigationEnabled: toggleNavigation.checked,
          isVoiceEnabled: toggleVoice.checked
        }).catch(() => { });
      }
    });
  }

  // Cache the active tab ID
  let activeTabId = null;
  function updateActiveTab() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) activeTabId = tabs[0].id;
    });
  }
  updateActiveTab();

  chrome.tabs.onActivated.addListener(() => {
    updateActiveTab();
    setTimeout(syncConfig, 500);
  });

  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'complete') {
      updateActiveTab();
      setTimeout(syncConfig, 500);
    }
  });

  // Start calibration
  function startCalibration() {
    isCalibrating = true;
    calibBounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
    btnCalibrate.disabled = true;

    const steps = [
      { text: "Look at the Center of your screen", duration: 3 },
      { text: "Look at the Left edge", duration: 2 },
      { text: "Look at the Right edge", duration: 2 },
      { text: "Look at the Top edge", duration: 2 },
      { text: "Look at the Bottom edge", duration: 2 }
    ];

    let currentStep = 0;
    let countdown = steps[currentStep].duration;

    calibrationStatus.textContent = `${steps[currentStep].text}... ${countdown}s`;

    const timer = setInterval(() => {
      countdown--;
      if (countdown > 0) {
        calibrationStatus.textContent = `${steps[currentStep].text}... ${countdown}s`;
      } else {
        currentStep++;
        if (currentStep < steps.length) {
          countdown = steps[currentStep].duration;
          calibrationStatus.textContent = `${steps[currentStep].text}... ${countdown}s`;
        } else {
          clearInterval(timer);
          isCalibrating = false;

          calibratedBounds = { ...calibBounds };

          btnCalibrate.disabled = false;
          calibrationStatus.textContent = "Calibration Complete!";
          btnCalibrate.textContent = "Recalibrate Range";
          setTimeout(() => {
            calibrationStatus.textContent = "Tracking Active";
          }, 1500);
        }
      }
    }, 1000);
  }

  // Detect loop
  let lastFaceTime = performance.now();

  async function detectFrame() {
    if (!isDetecting) return;

    try {
      const result = await human.detect(videoElement);

      ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);

      // Draw target ring
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.arc(canvasElement.width / 2, canvasElement.height / 2, 60, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.setLineDash([]);

      if (result.face && result.face.length > 0 && result.face[0].score > 0.6) {
        lastFaceTime = performance.now();
        const face = result.face[0];

        // Update HUD when face detected
        if (!toggleVoice.checked) {
          updateHUD("🖱", "Tracking", "state-ready");
        }

        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 3;
        ctx.strokeRect(face.box[0], face.box[1], face.box[2], face.box[3]);

        const curCenterX = face.box[0] + face.box[2] / 2;
        const curCenterY = face.box[1] + face.box[3] / 2;

        ctx.fillStyle = '#6366f1';
        ctx.beginPath();
        ctx.arc(curCenterX, curCenterY, 6, 0, 2 * Math.PI);
        ctx.fill();

        let posX = curCenterX / canvasElement.width;
        let posY = curCenterY / canvasElement.height;
        let rotX = 0;
        let rotY = 0;

        if (face.rotation && face.rotation.angle && typeof face.rotation.angle.yaw === 'number') {
          rotX = face.rotation.angle.yaw;
          rotY = face.rotation.angle.pitch;
        }

        // Use 100% rotation for cursor movement to reduce neck stress
        let rawTrackX = rotX;
        let rawTrackY = rotY;

        if (isNaN(rawTrackX) || isNaN(rawTrackY)) {
          rawTrackX = 0.5;
          rawTrackY = 0.5;
        }

        // Mouth Opening Detection
        if (face.mesh && face.mesh.length > 15) {
          const upperLip = face.mesh[13];
          const lowerLip = face.mesh[14];
          if (upperLip && lowerLip) {
            const upperY = upperLip.y !== undefined ? upperLip.y : upperLip[1];
            const lowerY = lowerLip.y !== undefined ? lowerLip.y : lowerLip[1];
            const mouthDist = Math.abs(upperY - lowerY);
            const faceHeight = face.box[3];

            if (mouthDist / faceHeight > 0.08) {
              if (typeof window.lastMouthClickTime === 'undefined') window.lastMouthClickTime = 0;
              const now = performance.now();
              if (now - window.lastMouthClickTime > 1200) {
                window.lastMouthClickTime = now;

                ctx.fillStyle = '#f59e0b';
                ctx.beginPath();
                ctx.arc(curCenterX, curCenterY + 20, 10, 0, 2 * Math.PI);
                ctx.fill();

                // Show click feedback on HUD
                updateHUD("✓", "Clicked!", "state-executing");
                setTimeout(() => {
                  if (!toggleVoice.checked) {
                    updateHUD("🖱", "Tracking", "state-ready");
                  }
                }, 500);

                if (toggleNavigation.checked && toggleMouthClicking.checked && activeTabId) {
                  chrome.tabs.sendMessage(activeTabId, { action: 'mouth_click' }).catch(() => { });
                }
              }
            }
          }
        }

        // Calibration bounds
        if (isCalibrating) {
          if (rawTrackX < calibBounds.minX) calibBounds.minX = rawTrackX;
          if (rawTrackX > calibBounds.maxX) calibBounds.maxX = rawTrackX;
          if (rawTrackY < calibBounds.minY) calibBounds.minY = rawTrackY;
          if (rawTrackY > calibBounds.maxY) calibBounds.maxY = rawTrackY;
        } else if (calibratedBounds === null) {
          calibratedBounds = {
            minX: rawTrackX - 0.1,
            maxX: rawTrackX + 0.1,
            minY: rawTrackY - 0.1,
            maxY: rawTrackY + 0.1
          };
        }

        let targetX = 0.5;
        let targetY = 0.5;

        if (calibratedBounds) {
          let rangeX = calibratedBounds.maxX - calibratedBounds.minX;
          let rangeY = calibratedBounds.maxY - calibratedBounds.minY;

          if (rangeX < 0.10) rangeX = 0.10;
          if (rangeY < 0.10) rangeY = 0.10;

          const sensitivity = parseFloat(sliderSensitivity.value);
          const scaleMultiplier = 1.0 / sensitivity;

          rangeX *= scaleMultiplier;
          rangeY *= scaleMultiplier;

          const centerX = (calibratedBounds.minX + calibratedBounds.maxX) / 2;
          const centerY = (calibratedBounds.minY + calibratedBounds.maxY) / 2;

          let normX = (rawTrackX - centerX) / rangeX;
          let normY = (rawTrackY - centerY) / rangeY;

          const DEADZONE = 0.08;
          if (Math.abs(normX) < DEADZONE) normX = 0;
          else normX = normX > 0 ? normX - DEADZONE : normX + DEADZONE;
          if (Math.abs(normY) < DEADZONE) normY = 0;
          else normY = normY > 0 ? normY - DEADZONE : normY + DEADZONE;

          const ACCEL_CURVE = 0.9;
          normX = Math.sign(normX) * Math.pow(Math.abs(normX), ACCEL_CURVE);
          normY = Math.sign(normY) * Math.pow(Math.abs(normY), ACCEL_CURVE);

          targetX = 0.5 + normX;
          targetY = 0.5 + normY;
        }

        const fc = parseFloat(sliderFilter.value);
        const beta = 0.5 + fc * 5.0;
        const timestamp = performance.now();

        const filteredX = filterX.filter(targetX, fc, beta, timestamp);
        const filteredY = filterY.filter(targetY, fc, beta, timestamp);

        const finalX = Math.max(0, Math.min(1, filteredX));
        const finalY = Math.max(0, Math.min(1, filteredY));

        // Draw cursor path
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(canvasElement.width / 2, canvasElement.height / 2);
        ctx.lineTo(curCenterX, curCenterY);
        ctx.stroke();

        if (toggleNavigation.checked && activeTabId) {
          chrome.tabs.sendMessage(activeTabId, {
            action: 'move_cursor',
            x: finalX,
            y: finalY
          }).catch(() => { });
        }
      } else {
        ctx.fillStyle = '#ef4444';
        ctx.font = '500 14px "Plus Jakarta Sans"';
        ctx.textAlign = 'center';
        ctx.fillText('Searching for Face...', canvasElement.width / 2, 35);

        // Update HUD when no face
        if (!toggleVoice.checked) {
          updateHUD("👀", "No Face", "state-paused");
        }

        if (performance.now() - lastFaceTime > 1000) {
          if (toggleNavigation.checked && activeTabId) {
            chrome.tabs.sendMessage(activeTabId, {
              action: 'move_cursor',
              x: 0.5,
              y: 0.5
            }).catch(() => { });
          }
        }
      }
    } catch (err) {
      console.error("Frame detection failed:", err);
    } finally {
      requestAnimationFrame(detectFrame);
    }
  }

  // Send initial config on load
  setTimeout(syncConfig, 1000);

  // Heartbeat to keep content script active
  setInterval(() => {
    if (activeTabId) {
      chrome.tabs.sendMessage(activeTabId, { action: 'heartbeat' }).catch(() => {});
    }
  }, 1000);
});