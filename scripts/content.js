(function () {
  // Prevent duplicate injection
  if (window.hasFaceNavigatorInjected) return;
  window.hasFaceNavigatorInjected = true;

  console.log("Face Navigator content script loaded.");

  // Visual Feedback - Edge Glow
  const edgeGlow = document.createElement('div');
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

  // Path history for circle gesture detection
  let pathHistory = [];

  // Configuration
  let sensitivityRadius = 45;
  let isAimAssistEnabled = true;
  let isClickingEnabled = true;
  let isScrollEnabled = true;

  // Track clickable targets
  let clickableElements = [];
  function refreshClickables() {
    clickableElements = [];
    const selectors = [
      'a', 'button', 'input', 'select', 'textarea',
      '[role="button"]', '[role="link"]', '[role="checkbox"]',
      '[onclick]', '.btn', '.button'
    ];

    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        const rect = el.getBoundingClientRect();
        if (
          rect.width > 0 &&
          rect.height > 0 &&
          rect.top < window.innerHeight &&
          rect.bottom > 0 &&
          rect.left < window.innerWidth &&
          rect.right > 0
        ) {
          const computedStyle = window.getComputedStyle(el);
          if (computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden' && computedStyle.opacity !== '0') {
            clickableElements.push({ element: el, rect });
          }
        }
      });
    });
  }

  refreshClickables();
  setInterval(refreshClickables, 1000);

  function getNearestTarget(x, y) {
    if (!isAimAssistEnabled) return null;
    let nearest = null;
    let minDistance = sensitivityRadius;

    clickableElements.forEach(item => {
      const elCenterX = item.rect.left + item.rect.width / 2;
      const elCenterY = item.rect.top + item.rect.height / 2;

      const dx = x - elCenterX;
      const dy = y - elCenterY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < minDistance) {
        minDistance = dist;
        nearest = { element: item.element, x: elCenterX, y: elCenterY };
      }
    });

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
    const maxSpeed = 4;

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
    } else {
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
  function updateCursorPhysics() {
    if (!window.cursorInitialized) {
      curX = window.innerWidth / 2;
      curY = window.innerHeight / 2;
      targetX = curX;
      targetY = curY;
      window.cursorInitialized = true;
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

    // Record path for circle gesture
    pathHistory.push({ x: curX, y: curY });
    if (pathHistory.length > 60) pathHistory.shift();
    detectGesture();

    handleEdgeScroll(curY);
    handleBrowserNav(curX);

    requestAnimationFrame(updateCursorPhysics);
  }

  // Voice Commands
  function startVoiceRecognition() {
    if (!SpeechRecognition) {
      console.warn("Speech Recognition not supported");
      return;
    }
    if (voiceRunning) return;
    recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onstart = () => {
      voiceRunning = true;
      console.log("Voice Started");
    };
    recognition.onresult = (event) => {
      const command = event.results[event.results.length - 1][0].transcript
        .trim()
        .toLowerCase();
      console.log("Voice:", command);
      handleVoiceCommand(command);
    };
    recognition.onend = () => {
      if (voiceRunning) {
        recognition.start();
      }
    };
    recognition.onerror = (e) => {
      console.warn("Voice error:", e.error);
    };
    recognition.start();
  }

  function stopVoiceRecognition() {
    voiceRunning = false;
    if (recognition) {
      recognition.stop();
      recognition = null;
    }
  }

  let voiceContext = "default";
  let voiceSynthesis = window.speechSynthesis;

  function handleVoiceCommand(command) {
    console.log("Executing:", command);

    // If we are waiting for a search query
    if (voiceContext === "awaiting_search_query") {
      voiceContext = "default"; // Reset state
      if (command && !command.includes("cancel") && !command.includes("stop")) {
        chrome.runtime.sendMessage({ action: 'voice_search', query: command });
      }
      return;
    }

    if (command.includes("scroll down")) {
      window.scrollBy({ top: 500, behavior: "smooth" });
    }
    else if (command.includes("scroll up")) {
      window.scrollBy({ top: -500, behavior: "smooth" });
    }
    else if (command.includes("scroll top") || command.includes("top of page")) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    else if (command.includes("scroll bottom") || command.includes("bottom of page")) {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    }
    else if (command.includes("click")) {
      const snapped = getNearestTarget(curX, curY);
      const target = snapped ? snapped.element : document.elementFromPoint(curX, curY);
      if (target) triggerClick(target);
    }
    else if (command.includes("go back") || command === "back") {
      history.back();
    }
    else if (command.includes("go forward") || command === "forward") {
      history.forward();
    }
    else if (command.includes("reload") || command.includes("refresh")) {
      location.reload();
    }
    else if (command.startsWith("search ")) {
      // One-shot search (e.g. "search python jobs")
      const query = command.replace("search ", "").trim();
      if (query) {
        chrome.runtime.sendMessage({ action: 'voice_search', query: query });
      }
    }
    else if (command === "search") {
      // Two-step conversational search
      voiceContext = "awaiting_search_query";
      if (voiceSynthesis) {
        const utterance = new SpeechSynthesisUtterance("What do you want to search?");
        utterance.rate = 1.1;
        voiceSynthesis.speak(utterance);
      }
    }
  }

  // Start physics loop
  requestAnimationFrame(updateCursorPhysics);

  // Message listener
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
      if (message.action === 'move_cursor') {
        targetX = message.x * window.innerWidth;
        targetY = message.y * window.innerHeight;
      } else if (message.action === 'config') {
        sensitivityRadius = message.sensitivityRadius || sensitivityRadius;
        isAimAssistEnabled = message.isAimAssistEnabled !== undefined ? message.isAimAssistEnabled : isAimAssistEnabled;
        isClickingEnabled = message.isClickingEnabled !== undefined ? message.isClickingEnabled : isClickingEnabled;
        isScrollEnabled = message.isScrollEnabled !== undefined ? message.isScrollEnabled : isScrollEnabled;
      } else if (message.action === 'mouth_click') {
        if (!isClickingEnabled) return;
        const snapped = getNearestTarget(curX, curY);
        const targetElement = snapped ? snapped.element : document.elementFromPoint(curX, curY);
        if (targetElement) triggerClick(targetElement);
      } else if (message.action === 'voice_toggle') {
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
  });
})();