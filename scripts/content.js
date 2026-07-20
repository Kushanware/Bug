(function () {
  // Cleanup old elements from previous injections (if extension reloaded without page refresh)
  const oldIds = [
    'face-navigator-styles', 'face-navigator-cursor', 'face-navigator-ring', 
    'face-navigator-snap-indicator', 'face-navigator-click-flash', 
    'fn-scroll-top', 'fn-scroll-bottom', 'fn-nav-left', 'fn-nav-right',
    'face-navigator-edge-glow'
  ];
  oldIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });

  // Remove old edge glow if it didn't have an ID (from very first version)
  document.querySelectorAll('div').forEach(el => {
    if (el.style.zIndex === '2147483639' && el.style.pointerEvents === 'none') {
      el.remove();
    }
  });

  // We no longer abort on duplicate injection, so the new logic can take over.
  // Generate unique ID for this instance to prevent duplicate script wars
  const INSTANCE_ID = Math.random().toString(36).slice(2);
  
  // Kill any previous instance's voice recognition
  if (window._bugVoiceCleanup) {
    window._bugVoiceCleanup();
  }
  window._bugActiveInstance = INSTANCE_ID;

  console.log("Face Navigator content script loaded. Instance:", INSTANCE_ID);

  // Visual Feedback - Edge Glow
  const edgeGlow = document.createElement('div');
  edgeGlow.id = 'face-navigator-edge-glow';
  edgeGlow.style.cssText = "position: fixed; inset: 0; pointer-events: none; z-index: 2147483639; box-shadow: inset 0 0 20px rgba(168, 85, 247, 0.4); border: 2px solid rgba(168, 85, 247, 0.5); opacity: 1; transition: opacity 0.5s;";

  // Inject Custom Styles
  const style = document.createElement('style');
  style.id = 'face-navigator-styles';
  style.textContent = `
    #face-navigator-cursor {
      position: fixed !important;
      width: 14px !important;
      height: 14px !important;
      background-color: #ef4444 !important;
      border: 2px solid #ffffff !important;
      border-radius: 50% !important;
      pointer-events: none !important;
      z-index: 2147483647 !important;
      box-shadow: 0 0 8px rgba(239, 68, 68, 0.8);
      transition: none !important;
      transform: translate(-50%, -50%);
      left: 50%;
      top: 50%;
    }
    
    #face-navigator-snap-indicator {
      position: fixed;
      width: 28px;
      height: 28px;
      background-color: rgba(59, 130, 246, 0.25);
      border: 2px solid rgba(59, 130, 246, 0.7);
      border-radius: 50%;
      pointer-events: none;
      z-index: 2147483645;
      transform: translate(-50%, -50%);
      left: 0;
      top: 0;
      opacity: 0;
      transition: opacity 0.15s, left 0.1s, top 0.1s;
    }
    
    #face-navigator-ring {
      position: fixed;
      width: 32px;
      height: 32px;
      border: 2px solid rgba(168, 85, 247, 0.4);
      border-radius: 50%;
      pointer-events: none;
      z-index: 2147483646;
      transform: translate(-50%, -50%);
      left: 50%;
      top: 50%;
      transition: width 0.05s, height 0.05s, border-color 0.1s;
    }

    .face-nav-highlight {
      outline: 3px dashed #a855f7 !important;
      outline-offset: 4px !important;
      box-shadow: 0 0 12px rgba(168, 85, 247, 0.6) !important;
      transition: outline-color 0.15s, box-shadow 0.15s;
    }

    #face-navigator-click-flash {
      position: fixed;
      width: 0px;
      height: 0px;
      border: 4px solid #ffffff;
      border-radius: 50%;
      pointer-events: none;
      z-index: 2147483647;
      transform: translate(-50%, -50%);
      opacity: 0;
      left: 0;
      top: 0;
    }
    
    .fn-scroll-zone {
      position: fixed; left: 0; right: 0; height: 180px;
      pointer-events: none; z-index: 2147483640; opacity: 0;
      transition: opacity 0.3s;
    }
    #fn-scroll-top { top: 0; background: linear-gradient(to bottom, rgba(168,85,247,0.3) 0%, transparent 100%); }
    #fn-scroll-bottom { bottom: 0; background: linear-gradient(to top, rgba(168,85,247,0.3) 0%, transparent 100%); }
    
    .fn-nav-zone {
      position: fixed; top: 0; bottom: 0; width: 80px;
      pointer-events: none; z-index: 2147483640; opacity: 0;
      transition: opacity 0.3s;
    }
    #fn-nav-left { left: 0; background: linear-gradient(to right, rgba(168,85,247,0.4) 0%, transparent 100%); }
    #fn-nav-right { right: 0; background: linear-gradient(to left, rgba(245,158,11,0.4) 0%, transparent 100%); }
    
    @keyframes face-nav-flash-anim {
      0% {
        width: 14px;
        height: 14px;
        opacity: 1;
        border-width: 6px;
      }
      100% {
        width: 70px;
        height: 70px;
        opacity: 0;
        border-width: 1px;
      }
    }
  `;
  document.head.appendChild(style);

  // Create UI Elements
  const cursor = document.createElement('div');
  cursor.id = 'face-navigator-cursor';

  const ring = document.createElement('div');
  ring.id = 'face-navigator-ring';

  const snapIndicator = document.createElement('div');
  snapIndicator.id = 'face-navigator-snap-indicator';

  const flash = document.createElement('div');
  flash.id = 'face-navigator-click-flash';

  const scrollTopZone = document.createElement('div');
  scrollTopZone.id = 'fn-scroll-top';
  scrollTopZone.className = 'fn-scroll-zone';

  const scrollBottomZone = document.createElement('div');
  scrollBottomZone.id = 'fn-scroll-bottom';
  scrollBottomZone.className = 'fn-scroll-zone';

  const navLeftZone = document.createElement('div');
  navLeftZone.id = 'fn-nav-left';
  navLeftZone.className = 'fn-nav-zone';

  const navRightZone = document.createElement('div');
  navRightZone.id = 'fn-nav-right';
  navRightZone.className = 'fn-nav-zone';

  // Voice Recognition
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let voiceRunning = false;

  function initUI() {
    if (!document.documentElement) {
      setTimeout(initUI, 50);
      return;
    }
    document.documentElement.appendChild(edgeGlow);
    document.documentElement.appendChild(cursor);
    document.documentElement.appendChild(snapIndicator);
    document.documentElement.appendChild(ring);
    document.documentElement.appendChild(flash);
    document.documentElement.appendChild(scrollTopZone);
    document.documentElement.appendChild(scrollBottomZone);
    document.documentElement.appendChild(navLeftZone);
    document.documentElement.appendChild(navRightZone);
  }
  initUI();

  // State Variables - Start at center
  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight / 2;
  let curX = targetX;
  let curY = targetY;

  let clickCooldown = false;
  let lastScrollTime = 0;

  let navZoneActive = null;
  let navDwellStartTime = 0;
  let navCooldown = false;

  // Dwell Click Variables
  let dwellStartTime = 0;
  let lastDwellX = 0;
  let lastDwellY = 0;
  let isDwelling = false;

  // Path history for circle gesture detection
  let pathHistory = [];

  // Configuration
  let sensitivityRadius = 45;
  let isAimAssistEnabled = true;
  let isDwellClickingEnabled = true;
  let isMouthClickingEnabled = true;
  let isScrollEnabled = true;
  let isNavigationEnabled = false;
  let isVoiceEnabled = false;

  let lastHeartbeatTime = 0;
  let isUIVisible = true; // initially set to true so we can force a hide

  function updateUIVisibility() {
    const isActive = (Date.now() - lastHeartbeatTime <= 2000);
    const shouldShow = isActive && isNavigationEnabled;
    
    if (isUIVisible === shouldShow) return;
    isUIVisible = shouldShow;
    
    const display = shouldShow ? '' : 'none';
    edgeGlow.style.display = display;
    cursor.style.display = display;
    snapIndicator.style.display = display;
    ring.style.display = display;
    flash.style.display = display;
    scrollTopZone.style.display = display;
    scrollBottomZone.style.display = display;
    navLeftZone.style.display = display;
    navRightZone.style.display = display;

    // Bug fix #9: Reset scroll/nav zone opacity when hiding
    if (!shouldShow) {
      scrollTopZone.style.opacity = '0';
      scrollBottomZone.style.opacity = '0';
      navLeftZone.style.opacity = '0';
      navRightZone.style.opacity = '0';
    }

    // Bug fix #10: Stop voice recognition when panel is disconnected
    if (!isActive && voiceRunning) {
      stopVoiceRecognition();
    }
  }

  updateUIVisibility();
  const uiInterval = setInterval(() => {
    if (window._bugActiveInstance !== INSTANCE_ID) {
      clearInterval(uiInterval);
      return;
    }
    updateUIVisibility();
  }, 500);

  // Track clickable targets — Bug fix #7: store elements only, compute rects fresh
  let clickableElements = [];
  const CLICKABLE_SELECTORS = [
    'a', 'button', 'input', 'select', 'textarea',
    '[role="button"]', '[role="link"]', '[role="checkbox"]',
    '[onclick]', '.btn', '.button'
  ];

  function refreshClickables() {
    clickableElements = [];
    CLICKABLE_SELECTORS.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        const computedStyle = window.getComputedStyle(el);
        if (computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden' && computedStyle.opacity !== '0') {
          clickableElements.push(el);
        }
      });
    });
  }

  refreshClickables();
  const clickablesInterval = setInterval(() => {
    if (window._bugActiveInstance !== INSTANCE_ID) {
      clearInterval(clickablesInterval);
      return;
    }
    refreshClickables();
  }, 1000);

  function getNearestTarget(x, y) {
    if (!isAimAssistEnabled) return null;
    let nearest = null;
    let minDistance = sensitivityRadius;

    for (const el of clickableElements) {
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;
      if (rect.top >= window.innerHeight || rect.bottom <= 0) continue;
      if (rect.left >= window.innerWidth || rect.right <= 0) continue;

      const elCenterX = rect.left + rect.width / 2;
      const elCenterY = rect.top + rect.height / 2;

      const dx = x - elCenterX;
      const dy = y - elCenterY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < minDistance) {
        minDistance = dist;
        nearest = { element: el, x: elCenterX, y: elCenterY };
      }
    }

    return nearest;
  }

  function triggerClick(element) {
    if (!element || clickCooldown) return;
    try {
      clickCooldown = true;

      let clickX = curX;
      let clickY = curY;
      if (element && element.getBoundingClientRect) {
        const rect = element.getBoundingClientRect();
        clickX = rect.left + rect.width / 2;
        clickY = rect.top + rect.height / 2;
      }

      // Bug fix #4: reset borderColor before click flash
      flash.style.borderColor = '#ffffff';
      flash.style.left = `${clickX}px`;
      flash.style.top = `${clickY}px`;
      flash.style.animation = 'none';
      void flash.offsetWidth;
      flash.style.animation = 'face-nav-flash-anim 0.4s ease-out';

      if (typeof element.click === 'function') {
        element.click();
      } else {
        const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
        element.dispatchEvent(clickEvent);
      }
    } catch (err) {
      console.error('Face Navigator: triggerClick error', err);
    }

    setTimeout(() => {
      clickCooldown = false;
    }, 1500);
  }

  function handleEdgeScroll(y) {
    if (!isScrollEnabled) return;

    const scrollZone = 180;
    const maxSpeed = 30; // Increased from 4 to 30 for faster scrolling

    if (y < scrollZone) {
      scrollTopZone.style.opacity = '1';
      scrollBottomZone.style.opacity = '0';
    } else if (y > window.innerHeight - scrollZone) {
      scrollTopZone.style.opacity = '0';
      scrollBottomZone.style.opacity = '1';
    } else {
      scrollTopZone.style.opacity = '0';
      scrollBottomZone.style.opacity = '0';
    }

    const now = Date.now();
    if (now - lastScrollTime < 40) return;

    if (y < scrollZone) {
      const speed = ((scrollZone - y) / scrollZone) * maxSpeed;
      window.scrollBy({ top: -speed, behavior: 'auto' });
      lastScrollTime = now;
    } else if (y > window.innerHeight - scrollZone) {
      const speed = ((y - (window.innerHeight - scrollZone)) / scrollZone) * maxSpeed;
      window.scrollBy({ top: speed, behavior: 'auto' });
      lastScrollTime = now;
    }
  }

  function handleBrowserNav(x) {
    const navZone = 80;
    const now = performance.now();

    let currentZone = null;
    if (x < navZone) currentZone = 'back';
    else if (x > window.innerWidth - navZone) currentZone = 'forward';

    navLeftZone.style.opacity = currentZone === 'back' ? '1' : '0';
    navRightZone.style.opacity = currentZone === 'forward' ? '1' : '0';

    // Bug fix #2: only reset navZoneActive when cursor actually left the zone
    if (currentZone && !navCooldown) {
      if (navZoneActive === currentZone) {
        if (now - navDwellStartTime > 400) {
          navCooldown = true;
          setTimeout(() => navCooldown = false, 2000);
          if (currentZone === 'back') window.history.back();
          if (currentZone === 'forward') window.history.forward();
        }
      } else {
        navZoneActive = currentZone;
        navDwellStartTime = now;
      }
    } else if (!currentZone) {
      navZoneActive = null;
    }
  }

  // Detect Circular / Oval Gestures
  function detectGesture() {
    if (pathHistory.length < 20) return;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of pathHistory) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    const width = maxX - minX;
    const height = maxY - minY;

    if (width < 250 || height < 250) return;

    const centerX = minX + width / 2;
    const centerY = minY + height / 2;

    let cumulativeAngle = 0;
    let prevAngle = Math.atan2(pathHistory[0].y - centerY, pathHistory[0].x - centerX);

    for (let i = 1; i < pathHistory.length; i++) {
      const angle = Math.atan2(pathHistory[i].y - centerY, pathHistory[i].x - centerX);
      let dTheta = angle - prevAngle;

      if (dTheta > Math.PI) dTheta -= 2 * Math.PI;
      if (dTheta < -Math.PI) dTheta += 2 * Math.PI;

      cumulativeAngle += dTheta;
      prevAngle = angle;
    }

    if (Math.abs(cumulativeAngle) > 5.5) {
      pathHistory = [];

      flash.style.borderColor = '#3b82f6';
      flash.style.left = `${window.innerWidth / 2}px`;
      flash.style.top = `${window.innerHeight / 2}px`;
      flash.style.animation = 'none';
      void flash.offsetWidth;
      flash.style.animation = 'face-nav-flash-anim 0.6s ease-out';

      setTimeout(() => {
        window.location.href = "https://www.google.com/";
      }, 500);
    }
  }

  // Smooth cursor physics
  // Bug fix #8: use instance-scoped flag instead of global window property
  let cursorInitialized = false;
  function updateCursorPhysics() {
    if (window._bugActiveInstance !== INSTANCE_ID) return;
    if (!cursorInitialized) {
      curX = window.innerWidth / 2;
      curY = window.innerHeight / 2;
      targetX = curX;
      targetY = curY;
      cursorInitialized = true;
    }
    if (isNaN(curX) || isNaN(targetX)) {
      curX = window.innerWidth / 2;
      targetX = curX;
    }
    if (isNaN(curY) || isNaN(targetY)) {
      curY = window.innerHeight / 2;
      targetY = curY;
    }

    const dx = targetX - curX;
    const dy = targetY - curY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const screenDiag = Math.sqrt(window.innerWidth ** 2 + window.innerHeight ** 2);
    const normalizedDist = dist / screenDiag;

    const lerpAlpha = 0.05 + normalizedDist * 0.10;

    curX += dx * lerpAlpha;
    curY += dy * lerpAlpha;

    // Update cursor position
    cursor.style.left = `${curX}px`;
    cursor.style.top = `${curY}px`;

    // === Guard: only allow interactions when the extension is actively connected ===
    if (isUIVisible) {
      // Aim assist
      let snapped = null;
      if (isAimAssistEnabled) {
        snapped = getNearestTarget(curX, curY);
      }

      if (snapped) {
        snapIndicator.style.opacity = '1';
        snapIndicator.style.left = `${snapped.x}px`;
        snapIndicator.style.top = `${snapped.y}px`;
        ring.style.left = `${snapped.x}px`;
        ring.style.top = `${snapped.y}px`;
      } else {
        snapIndicator.style.opacity = '0';
        ring.style.left = `${curX}px`;
        ring.style.top = `${curY}px`;
      }

      // Record path for circle gesture — Bug fix #6: throttle detection
      pathHistory.push({ x: curX, y: curY });
      if (pathHistory.length > 60) pathHistory.shift();
      if (pathHistory.length >= 20 && pathHistory.length % 5 === 0) {
        detectGesture();
      }

      // Dwell Clicking Logic — Bug fix #3: force position change after dwell click
      if (isDwellClickingEnabled && !clickCooldown) {
        const now = performance.now();
        const dwellDist = Math.sqrt(Math.pow(curX - lastDwellX, 2) + Math.pow(curY - lastDwellY, 2));
        
        if (dwellDist < 30) {
          if (!isDwelling) {
            isDwelling = true;
            dwellStartTime = now;
          } else if (now - dwellStartTime > 1200) {
            const snapped = getNearestTarget(curX, curY);
            const target = snapped ? snapped.element : document.elementFromPoint(curX, curY);
            if (target) triggerClick(target);
            
            isDwelling = false;
            // Force cursor to move away before next dwell can start
            lastDwellX = -9999;
            lastDwellY = -9999;
          }
        } else {
          isDwelling = false;
          lastDwellX = curX;
          lastDwellY = curY;
          dwellStartTime = now;
        }
      }

      handleEdgeScroll(curY);
      handleBrowserNav(curX);
    } else {
      // Panel is closed / heartbeat timed out — reset all interaction state
      isDwelling = false;
      lastDwellX = -9999;
      lastDwellY = -9999;
      pathHistory = [];
    }

    requestAnimationFrame(updateCursorPhysics);
  }

  // Voice Commands — Bug fix #1: use interimResults for instant command matching
  // Known short commands that can be matched instantly from interim results
  const INSTANT_COMMANDS = [
    'down', 'up', 'top', 'bottom',
    'click', 'go back', 'back', 'go forward', 'forward',
    'reload', 'refresh'
  ];
  let lastInterimMatch = ''; // prevent duplicate execution of same interim match

  function startVoiceRecognition() {
    // Check if this instance is still the active one
    if (window._bugActiveInstance !== INSTANCE_ID) {
      isVoiceEnabled = false;
      return;
    }
    if (!SpeechRecognition) {
      console.warn("[BUG Voice] SpeechRecognition API not available");
      return;
    }
    if (voiceRunning) return;

    // Clean up any existing instance
    if (recognition) {
      try { recognition.stop(); } catch(e) {}
      recognition = null;
    }

    recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true; // Bug fix #1: enable for low latency
    
    recognition.onstart = () => {
      voiceRunning = true;
      console.log("[BUG Voice] ✅ Voice recognition ACTIVE");
    };
    
    // Send voice log entry to sidepanel
    function sendVoiceLog(text, type, command) {
      chrome.runtime.sendMessage({
        action: 'voice_log',
        text: text,
        type: type,        // 'executed', 'heard', 'skipped'
        command: command || null
      }).catch(() => {});
    }

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript.trim().toLowerCase();
        
        if (event.results[i].isFinal) {
          // Final result — handle all commands including "search [query]"
          const wasInterimMatched = lastInterimMatch && transcript.includes(lastInterimMatch);
          lastInterimMatch = ''; // reset for next utterance
          console.log("[BUG Voice] Final:", transcript);
          
          // Only execute final result if we didn't already trigger an instant action for it
          if (!wasInterimMatched) {
            const executedCmd = handleVoiceCommand(transcript);
            sendVoiceLog(transcript, executedCmd ? 'executed' : 'heard', executedCmd);
          } else {
            console.log("[BUG Voice] Skipped final result (already executed as instant command)");
            sendVoiceLog(transcript, 'skipped', lastInterimMatch);
          }
        } else {
          // Interim result — instantly match known short commands
          const matched = INSTANT_COMMANDS.find(cmd => transcript.includes(cmd));
          if (matched && lastInterimMatch !== matched) {
            lastInterimMatch = matched;
            console.log("[BUG Voice] Instant:", matched);
            handleVoiceCommand(matched);
            sendVoiceLog(transcript, 'executed', matched);
          }
        }
      }
    };
    
    recognition.onend = () => {
      voiceRunning = false;
      if (voicePausedForTTS) return;
      if (voicePausedByVisibility) return; // Tab is hidden — don't restart
      if (window._bugActiveInstance !== INSTANCE_ID) return;
      // In continuous mode, onend only fires on errors/interruptions — restart to keep listening
      if (isVoiceEnabled && !document.hidden) {
        setTimeout(() => {
          if (isVoiceEnabled && !voicePausedForTTS && !voicePausedByVisibility && !document.hidden && window._bugActiveInstance === INSTANCE_ID) {
            voiceRunning = false;
            startVoiceRecognition();
          }
        }, 300);
      }
    };
    
    recognition.onerror = (e) => {
      if (e.error !== 'aborted') {
        console.warn("[BUG Voice] Error:", e.error);
      }
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        isVoiceEnabled = false;
      }
      if (e.error === 'aborted') {
        voiceRunning = false;
      }
    };
    
    try {
      recognition.start();
    } catch (e) {
      console.error("[BUG Voice] Failed to start:", e);
    }
  }

  function stopVoiceRecognition() {
    voiceRunning = false;
    isVoiceEnabled = false;
    if (recognition) {
      try { recognition.stop(); } catch(e) {}
      recognition = null;
    }
  }

  // Register cleanup function so new instances can kill this one
  window._bugVoiceCleanup = () => {
    console.log("[BUG Voice] Cleaning up old instance:", INSTANCE_ID);
    voiceRunning = false;
    isVoiceEnabled = false;
    if (recognition) {
      try { recognition.stop(); } catch(e) {}
      recognition = null;
    }
  };
  let voiceContext = "default";
  let voiceSynthesis = window.speechSynthesis;
  let voicePausedForTTS = false;
  let voicePausedByVisibility = false;

  function handleVoiceCommand(command) {
    console.log("Executing:", command);

    // If we are waiting for a search query
    if (voiceContext === "awaiting_search_query") {
      voiceContext = "default"; // Reset state
      if (command && !command.includes("cancel") && !command.includes("stop")) {
        chrome.runtime.sendMessage({ action: 'voice_search', query: command });
      }
      return "search: " + command;
    }

    // Bug fix #5: use .includes() instead of strict === for commands that
    // speech recognition may add trailing words to
    if (command.includes("down")) {
      window.scrollBy({ top: 500, behavior: "smooth" });
      return "scroll down";
    }
    else if (command.includes("up")) {
      window.scrollBy({ top: -500, behavior: "smooth" });
      return "scroll up";
    }
    else if (command.includes("top")) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return "go to top";
    }
    else if (command.includes("bottom")) {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      return "go to bottom";
    }
    else if (command.includes("click")) {
      const snapped = getNearestTarget(curX, curY);
      const target = snapped ? snapped.element : document.elementFromPoint(curX, curY);
      if (target) triggerClick(target);
      return "click";
    }
    else if (command.includes("go back") || command.includes("back")) {
      history.back();
      return "go back";
    }
    else if (command.includes("go forward") || command.includes("forward")) {
      history.forward();
      return "go forward";
    }
    else if (command.includes("reload") || command.includes("refresh")) {
      location.reload();
      return "reload";
    }
    else if (command.startsWith("search ")) {
      // One-shot search (e.g. "search python jobs")
      const query = command.replace(/^search\s+/, "").trim();
      if (query) {
        chrome.runtime.sendMessage({ action: 'voice_search', query: query });
      }
      return "search: " + query;
    }
    else if (command.trim() === "search") {
      // Two-step conversational search
      // Set flag BEFORE stopping so onend knows not to auto-restart
      voicePausedForTTS = true;
      if (recognition) {
        try { recognition.stop(); } catch(e) {}
      }
      voiceRunning = false;

      voiceContext = "awaiting_search_query";
      if (voiceSynthesis) {
        const utterance = new SpeechSynthesisUtterance("What do you want to search?");
        utterance.rate = 1.1;
        utterance.onend = () => {
          // Resume listening AFTER TTS finishes speaking
          console.log("[BUG Voice] TTS finished, resuming recognition for search query...");
          voicePausedForTTS = false;
          setTimeout(() => {
            voiceRunning = false;
            startVoiceRecognition();
          }, 500);
        };
        voiceSynthesis.speak(utterance);
      } else {
        // No TTS available, just restart recognition immediately
        voicePausedForTTS = false;
        voiceRunning = false;
        startVoiceRecognition();
      }
      return "search (waiting...)";
    }

    return null; // No command matched
  }

  // Start physics loop
  requestAnimationFrame(updateCursorPhysics);

  // Message listener
  const messageListener = (message, sender, sendResponse) => {
    if (window._bugActiveInstance !== INSTANCE_ID) {
      chrome.runtime.onMessage.removeListener(messageListener);
      return;
    }
    try {
      if (['heartbeat', 'move_cursor', 'config', 'mouth_click', 'voice_toggle'].includes(message.action)) {
        lastHeartbeatTime = Date.now();
        updateUIVisibility();
      }

      if (message.action === 'move_cursor') {
        targetX = message.x * window.innerWidth;
        targetY = message.y * window.innerHeight;
      } else if (message.action === 'config') {
        sensitivityRadius = message.sensitivityRadius || sensitivityRadius;
        isAimAssistEnabled = message.isAimAssistEnabled !== undefined ? message.isAimAssistEnabled : isAimAssistEnabled;
        isDwellClickingEnabled = message.isDwellClickingEnabled !== undefined ? message.isDwellClickingEnabled : isDwellClickingEnabled;
        isMouthClickingEnabled = message.isMouthClickingEnabled !== undefined ? message.isMouthClickingEnabled : isMouthClickingEnabled;
        isScrollEnabled = message.isScrollEnabled !== undefined ? message.isScrollEnabled : isScrollEnabled;
        if (message.isNavigationEnabled !== undefined) {
          isNavigationEnabled = message.isNavigationEnabled;
        }
        if (message.isVoiceEnabled !== undefined && message.isVoiceEnabled !== isVoiceEnabled) {
          isVoiceEnabled = message.isVoiceEnabled;
          if (isVoiceEnabled) {
            startVoiceRecognition();
          } else {
            stopVoiceRecognition();
          }
        }
        updateUIVisibility();
      } else if (message.action === 'mouth_click') {
        if (!isMouthClickingEnabled || !isUIVisible) return;
        const snapped = getNearestTarget(curX, curY);
        const targetElement = snapped ? snapped.element : document.elementFromPoint(curX, curY);
        if (targetElement) triggerClick(targetElement);
      } else if (message.action === 'voice_toggle') {
        console.log("[BUG Voice] Received voice_toggle message, enabled:", message.enabled);
        isVoiceEnabled = message.enabled;
        if (message.enabled) {
          startVoiceRecognition();
        } else {
          stopVoiceRecognition();
        }
      }
    } catch (err) {
      console.error('Face Navigator: message handler error', err);
    }
    return;
  };
  chrome.runtime.onMessage.addListener(messageListener);

  // Bug fix #11: Only the active (visible) tab should hold the microphone.
  // When the user switches tabs, pause voice recognition in the old tab.
  // When the tab regains focus, resume if voice was enabled.
  document.addEventListener('visibilitychange', () => {
    if (window._bugActiveInstance !== INSTANCE_ID) return;

    if (document.hidden) {
      // Tab lost focus — release the microphone
      if (voiceRunning) {
        voicePausedByVisibility = true;
        console.log("[BUG Voice] Tab hidden — pausing recognition");
        if (recognition) {
          try { recognition.stop(); } catch(e) {}
        }
        voiceRunning = false;
      }
    } else {
      // Tab regained focus — resume if voice was paused by tab switch
      if (voicePausedByVisibility && isVoiceEnabled) {
        voicePausedByVisibility = false;
        console.log("[BUG Voice] Tab visible — resuming recognition");
        setTimeout(() => {
          if (isVoiceEnabled && !voiceRunning && window._bugActiveInstance === INSTANCE_ID) {
            startVoiceRecognition();
          }
        }, 200);
      }
    }
  });
})();