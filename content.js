(function () {
  'use strict';

  const CONFIG = {
    HOVER_DELAY: 300,
    IS_YOUTUBE: window.location.hostname.includes('youtube.com'),
    IS_TWITTER: window.location.hostname.includes('twitter.com') || window.location.hostname.includes('x.com'),
    DEBUG_ENABLED: !window.location.hostname.includes('youtube.com'),
    VOICE_RESTART_DELAY: 300,
    MIN_DISPLAY_TIME: 500,
    THREAD_CAPTURE_TIMEOUT: 12000,
    YOUTUBE_SUMMARY_TIMEOUT: 30000,
    MOUTH_CAL_STORAGE_KEY: 'mouthCalV1',
    MIN_SAMPLES: 10
  };

  function getTargetElement() {
    // Priority 1: document.activeElement (if it's interactive)
    const active = document.activeElement;
    if (active && (
      active.tagName === 'INPUT' ||
      active.tagName === 'TEXTAREA' ||
      active.tagName === 'SELECT' ||
      active.tagName === 'BUTTON' ||
      active.tagName === 'A' ||
      active.isContentEditable ||
      active.getAttribute('role') === 'button' ||
      active.getAttribute('role') === 'link'
    )) {
      return active;
    }

    // Priority 2: Gaze hovered element (if gaze tracking is active)
    const gazeElement = document.querySelector('[data-gaze-hover]');
    if (gazeElement) {
      return gazeElement;
    }

    // Priority 3: Mouse hovered element
    const hovered = document.querySelector(':hover');
    if (hovered && hovered !== document.body && hovered !== document.documentElement) {
      return hovered;
    }

    // Priority 4: Find ANY clickable element on the page
    const clickableSelectors = [
      'a[href]',
      'button',
      'input[type="submit"]',
      'input[type="button"]',
      'input[type="reset"]',
      '[role="button"]',
      '[role="link"]',
      '[onclick]',
      '[data-clickable]',
      'ytd-rich-grid-video-renderer',
      'ytd-video-renderer',
      'ytd-compact-video-renderer',
      '.ytd-rich-grid-video-renderer',
      '.ytd-video-renderer'
    ];

    // Try to find the first clickable element
    for (const selector of clickableSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        console.log('[Voice] Found clickable element via selector:', selector);
        return element;
      }
    }

    // Priority 5: Try to find any element with a click handler
    const allElements = document.querySelectorAll('*');
    for (const element of allElements) {
      if (element.onclick || element.getAttribute('onclick')) {
        console.log('[Voice] Found element with onclick handler:', element);
        return element;
      }
    }

    // Last resort: Return body (but it won't do anything useful)
    console.warn('[Voice] No clickable element found on page');
    return null;
  }

  /**
   * Find nearest clickable ancestor
   */
  function findClickableAncestor(element) {
    if (!element) return null;

    const clickableSelectors = [
      'a[href]',
      'button',
      'input[type="submit"]',
      'input[type="button"]',
      'input[type="reset"]',
      '[role="button"]',
      '[role="link"]',
      '[onclick]',
      '[data-clickable]',
      'ytd-rich-grid-video-renderer',
      'ytd-video-renderer',
      'ytd-compact-video-renderer'
    ];

    let current = element;
    for (let i = 0; i < 10 && current; i++) {
      if (current.matches && current.matches(clickableSelectors.join(','))) {
        return current;
      }
      current = current.parentElement;
    }
    return element;
  }

  /**
   * Get the context of an element for smarter command behavior
   */
  function getElementContext(element) {
    if (!element) return 'unknown';

    // Check for YouTube
    if (element.closest('ytd-rich-grid-video-renderer') ||
      element.closest('ytd-video-renderer') ||
      element.closest('ytd-compact-video-renderer') ||
      element.closest('ytd-thumbnail')) {
      return 'youtube';
    }

    // Check for Google search results
    if (element.closest('div.g') || element.closest('div[data-sokoban-container]')) {
      return 'google';
    }

    // Check for forms
    if (element.closest('form')) {
      return 'form';
    }

    // Check for editable fields
    if (element.tagName === 'INPUT' ||
      element.tagName === 'TEXTAREA' ||
      element.isContentEditable) {
      return 'editable';
    }

    return 'unknown';
  }

  const REDDIT_HOSTS = [
    'reddit.com',
    'www.reddit.com',
    'old.reddit.com',
    'new.reddit.com',
    'np.reddit.com',
    'redd.it'
  ];

  const TWITTER_HOSTS = new Set([
    'twitter.com',
    'www.twitter.com',
    'x.com',
    'www.x.com'
  ]);

  const YOUTUBE_HOSTS = new Set([
    'youtube.com',
    'www.youtube.com',
    'm.youtube.com',
    'music.youtube.com'
  ]);

  // Debug logging helper
  const debugLog = (...args) => {
    if (CONFIG.DEBUG_ENABLED) console.log(...args);
  };
  const VoiceCommandMap = {

    'scroll_down': {
      patterns: [/scroll\s*down/, /down/, /page\s*down/],
      action: () => window.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' }),
      description: 'Scroll down one page',
      category: 'navigation',
      isInstant: true
    },

    'scroll_up': {
      patterns: [/scroll\s*up/, /up/, /page\s*up/],
      action: () => window.scrollBy({ top: -(window.innerHeight * 0.8), behavior: 'smooth' }),
      description: 'Scroll up one page',
      category: 'navigation',
      isInstant: true
    },

    'scroll_left': {
      patterns: [/scroll\s*left/, /left/],
      action: () => window.scrollBy({ left: -300, behavior: 'smooth' }),
      description: 'Scroll left',
      category: 'navigation'
    },

    'scroll_right': {
      patterns: [/scroll\s*right/, /right/],
      action: () => window.scrollBy({ left: 300, behavior: 'smooth' }),
      description: 'Scroll right',
      category: 'navigation'
    },

    'scroll_faster': {
      patterns: [/scroll\s*faster/, /faster/],
      action: () => { window.scrollBy({ top: window.innerHeight * 1.5, behavior: 'smooth' }); },
      description: 'Scroll faster',
      category: 'navigation'
    },

    'scroll_slower': {
      patterns: [/scroll\s*slower/, /slower/],
      action: () => { window.scrollBy({ top: window.innerHeight * 0.3, behavior: 'smooth' }); },
      description: 'Scroll slower',
      category: 'navigation'
    },

    'stop_scrolling': {
      patterns: [/stop\s*scrolling/, /stop\s*scroll/, /stop/],
      action: () => { /* Stop scrolling - can be enhanced with scroll cancellation */ },
      description: 'Stop scrolling',
      category: 'navigation',
      isInstant: true
    },

    'go_back': {
      patterns: [/go\s*back/, /back/],
      action: () => history.back(),
      description: 'Go back in history',
      category: 'navigation',
      isInstant: true
    },

    'go_forward': {
      patterns: [/go\s*forward/, /forward/],
      action: () => history.forward(),
      description: 'Go forward in history',
      category: 'navigation',
      isInstant: true
    },

    'refresh_page': {
      patterns: [/refresh\s*page/, /refresh/, /reload\s*page/, /reload/],
      action: () => location.reload(),
      description: 'Refresh the page',
      category: 'navigation',
      isInstant: true
    },

    'reload_page': {
      patterns: [/reload\s*page/, /reload/],
      action: () => location.reload(),
      description: 'Reload the page',
      category: 'navigation',
      isInstant: true
    },

    'scroll_to_top': {
      patterns: [/scroll\s*to\s*top/, /go\s*to\s*top/, /top/],
      action: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
      description: 'Scroll to top of page',
      category: 'page',
      isInstant: true
    },

    'scroll_to_bottom': {
      patterns: [/scroll\s*to\s*bottom/, /go\s*to\s*bottom/, /bottom/],
      action: () => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }),
      description: 'Scroll to bottom of page',
      category: 'page',
      isInstant: true
    },

    // ========================================
    // CLICK COMMANDS
    // ========================================

    'click': {
      patterns: [/click/],
      action: () => {
        const target = getTargetElement();
        console.log('[Voice] Click target:', target);

        if (!target) {
          console.warn('[Voice] No valid target element found for click');
          return;
        }

        // If target is body or html, try to find a clickable element
        if (target === document.body || target === document.documentElement) {
          const anyClickable = document.querySelector('button, a[href], input[type="submit"], [role="button"]');
          if (anyClickable) {
            anyClickable.click();
            console.log('[Voice] Clicked fallback element:', anyClickable);
            return;
          }
          console.warn('[Voice] No clickable elements on page');
          return;
        }

        const context = getElementContext(target);
        console.log('[Voice] Click context:', context);

        // For YouTube thumbnails, find the video card
        if (context === 'youtube') {
          const card = target.closest('ytd-rich-grid-video-renderer') ||
            target.closest('ytd-video-renderer') ||
            target.closest('ytd-compact-video-renderer');
          if (card) {
            const link = card.querySelector('a#thumbnail, a[href*="watch"]');
            if (link) {
              link.click();
              console.log('[Voice] Clicked YouTube video');
              return;
            }
          }
        }

        // For Google search results
        if (context === 'google') {
          const result = target.closest('div.g') || target.closest('div[data-sokoban-container]');
          if (result) {
            const link = result.querySelector('a[jsname="UWckNb"], a[data-ved]');
            if (link) {
              link.click();
              console.log('[Voice] Clicked Google search result');
              return;
            }
          }
        }

        // Find clickable element
        const clickable = findClickableAncestor(target);

        // Dispatch click event
        try {
          if (clickable.tagName === 'A' && clickable.href) {
            clickable.click();
            console.log('[Voice] Clicked link:', clickable.href);
            return;
          }

          if (typeof clickable.click === 'function') {
            clickable.click();
            console.log('[Voice] Clicked element:', clickable);
          } else {
            const event = new MouseEvent('click', {
              view: window,
              bubbles: true,
              cancelable: true
            });
            clickable.dispatchEvent(event);
            console.log('[Voice] Dispatched click event on:', clickable);
          }
        } catch (error) {
          console.error('[Voice] Click failed:', error);
        }
      },
      description: 'Click on current element (focused/hovered)',
      category: 'click',
      isInstant: true
    },

    'double_click': {
      patterns: [/double\s*click/],
      action: () => {
        const target = getTargetElement();
        if (!target || target === document.body) return;

        const clickable = findClickableAncestor(target);
        const event = new MouseEvent('dblclick', {
          view: window,
          bubbles: true,
          cancelable: true
        });
        clickable.dispatchEvent(event);
        console.log('[Voice] Double-clicked:', clickable);
      },
      description: 'Double click on current element',
      category: 'click'
    },


    'right_click': {
      patterns: [/right\s*click/],
      action: () => {
        const target = getTargetElement();
        if (!target || target === document.body) return;

        const clickable = findClickableAncestor(target);
        const event = new MouseEvent('contextmenu', {
          view: window,
          bubbles: true,
          cancelable: true
        });
        clickable.dispatchEvent(event);
        console.log('[Voice] Right-clicked:', clickable);
      },
      description: 'Right click on current element',
      category: 'click'
    },

    'left_click': {
      patterns: [/left\s*click/],
      action: () => {
        const target = getTargetElement();
        if (!target || target === document.body) return;

        const clickable = findClickableAncestor(target);
        if (typeof clickable.click === 'function') {
          clickable.click();
        } else {
          const event = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true
          });
          clickable.dispatchEvent(event);
        }
        console.log('[Voice] Left-clicked:', clickable);
      },
      description: 'Left click on current element',
      category: 'click'
    },


    'hover': {
      patterns: [/hover/],
      action: () => {
        const target = getTargetElement();
        if (!target || target === document.body) return;

        // Dispatch hover events
        const events = ['mouseenter', 'mouseover'];
        events.forEach(eventType => {
          const event = new MouseEvent(eventType, {
            view: window,
            bubbles: true,
            cancelable: true
          });
          target.dispatchEvent(event);
        });

        target.setAttribute('data-gaze-hover', 'true');
        console.log('[Voice] Hovered:', target);
      },
      description: 'Hover over current element',
      category: 'click'
    },

    // ========================================
    // TAB COMMANDS
    // ========================================

    'open_new_tab': {
      patterns: [/open\s*new\s*tab/, /new\s*tab/],
      action: () => chrome.runtime.sendMessage({ type: 'RELAY_VOICE_COMMAND', command: 'new tab' }),
      description: 'Open a new tab',
      category: 'tabs',
      isInstant: true
    },

    'close_tab': {
      patterns: [/close\s*tab/],
      action: () => chrome.runtime.sendMessage({ type: 'RELAY_VOICE_COMMAND', command: 'close tab' }),
      description: 'Close current tab',
      category: 'tabs',
      isInstant: true
    },

    'next_tab': {
      patterns: [/next\s*tab/],
      action: () => chrome.runtime.sendMessage({ type: 'RELAY_VOICE_COMMAND', command: 'next tab' }),
      description: 'Switch to next tab',
      category: 'tabs',
      isInstant: true
    },

    'previous_tab': {
      patterns: [/previous\s*tab/, /prev\s*tab/],
      action: () => chrome.runtime.sendMessage({ type: 'RELAY_VOICE_COMMAND', command: 'previous tab' }),
      description: 'Switch to previous tab',
      category: 'tabs',
      isInstant: true
    },

    // ========================================
    // ZOOM COMMANDS
    // ========================================

    'zoom_in': {
      patterns: [/zoom\s*in/],
      action: () => {
        const currentZoom = parseFloat(document.body.style.zoom) || 1;
        document.body.style.zoom = currentZoom * 1.1;
      },
      description: 'Zoom in',
      category: 'page'
    },

    'zoom_out': {
      patterns: [/zoom\s*out/],
      action: () => {
        const currentZoom = parseFloat(document.body.style.zoom) || 1;
        document.body.style.zoom = currentZoom / 1.1;
      },
      description: 'Zoom out',
      category: 'page'
    },

    'reset_zoom': {
      patterns: [/reset\s*zoom/],
      action: () => { document.body.style.zoom = 1; },
      description: 'Reset zoom to default',
      category: 'page'
    },

    // ========================================
    // FULLSCREEN COMMANDS
    // ========================================

    'fullscreen': {
      patterns: [/fullscreen/, /full\s*screen/],
      action: () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => { });
        } else {
          document.exitFullscreen().catch(() => { });
        }
      },
      description: 'Toggle fullscreen mode',
      category: 'media'
    },

    'exit_fullscreen': {
      patterns: [/exit\s*fullscreen/, /exit\s*full\s*screen/],
      action: () => {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => { });
        }
      },
      description: 'Exit fullscreen mode',
      category: 'media'
    },

    // ========================================
    // TEXT SELECTION COMMANDS
    // ========================================

    'select_all': {
      patterns: [/select\s*all/],
      action: () => {
        const active = document.activeElement;

        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
          active.select();
          console.log('[Voice] Selected all text in input');
          return;
        }

        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(document.body);
        selection.removeAllRanges();
        selection.addRange(range);
        console.log('[Voice] Selected all page text');
      },
      description: 'Select all text on page or in input',
      category: 'text'
    },

    'copy': {
      patterns: [/copy/],
      action: () => {
        const selection = window.getSelection();
        const active = document.activeElement;

        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
          const selectedText = active.value.substring(active.selectionStart || 0, active.selectionEnd || 0);
          if (selectedText) {
            navigator.clipboard.writeText(selectedText).then(() => {
              console.log('[Voice] Copied text from input');
            }).catch(() => {
              document.execCommand('copy');
            });
            return;
          }
        }

        if (selection.toString()) {
          navigator.clipboard.writeText(selection.toString()).then(() => {
            console.log('[Voice] Copied selected text');
          }).catch(() => {
            document.execCommand('copy');
          });
        } else {
          console.warn('[Voice] No text selected to copy');
        }
      },
      description: 'Copy selected text',
      category: 'text'
    },

    'paste': {
      patterns: [/paste/],
      action: () => {
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) {
          navigator.clipboard.readText().then(text => {
            if (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA') {
              const start = active.selectionStart || 0;
              const end = active.selectionEnd || 0;
              active.value = active.value.substring(0, start) + text + active.value.substring(end);
              active.selectionStart = active.selectionEnd = start + text.length;
            } else if (active.isContentEditable) {
              document.execCommand('insertText', false, text);
            }
            console.log('[Voice] Pasted text');
          }).catch(() => {
            console.warn('[Voice] Failed to paste');
          });
        } else {
          console.warn('[Voice] No editable field focused');
        }
      },
      description: 'Paste text into active field',
      category: 'text'
    },

    'cut': {
      patterns: [/cut/],
      action: () => {
        const selection = window.getSelection();
        const active = document.activeElement;

        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
          const start = active.selectionStart || 0;
          const end = active.selectionEnd || 0;
          const selectedText = active.value.substring(start, end);
          if (selectedText) {
            navigator.clipboard.writeText(selectedText).then(() => {
              active.value = active.value.substring(0, start) + active.value.substring(end);
              active.selectionStart = active.selectionEnd = start;
              console.log('[Voice] Cut text from input');
            }).catch(() => {
              document.execCommand('cut');
            });
          }
          return;
        }

        if (selection.toString()) {
          navigator.clipboard.writeText(selection.toString()).then(() => {
            selection.deleteFromDocument();
            console.log('[Voice] Cut selected text');
          }).catch(() => {
            document.execCommand('cut');
          });
        }
      },
      description: 'Cut selected text',
      category: 'text'
    },

    'undo': {
      patterns: [/undo/],
      action: () => {
        document.execCommand('undo');
        console.log('[Voice] Undo');
      },
      description: 'Undo last action',
      category: 'text'
    },

    'redo': {
      patterns: [/redo/],
      action: () => {
        document.execCommand('redo');
        console.log('[Voice] Redo');
      },
      description: 'Redo last action',
      category: 'text'
    },

    'clear_text': {
      patterns: [/clear\s*text/, /clear/],
      action: () => {
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
          active.value = '';
          console.log('[Voice] Cleared text');
        } else if (active && active.isContentEditable) {
          active.innerText = '';
          console.log('[Voice] Cleared content');
        }
      },
      description: 'Clear text in active field',
      category: 'text'
    },

    'delete_last_word': {
      patterns: [/delete\s*last\s*word/, /delete\s*word/],
      action: () => {
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
          const text = active.value;
          const cursorPos = active.selectionStart || text.length;
          const lastSpace = text.lastIndexOf(' ', cursorPos - 1);
          const start = lastSpace === -1 ? 0 : lastSpace + 1;
          active.value = text.substring(0, start) + text.substring(cursorPos);
          active.selectionStart = active.selectionEnd = start;
          console.log('[Voice] Deleted last word');
        } else if (active && active.isContentEditable) {
          document.execCommand('deleteWordBackward');
          console.log('[Voice] Deleted last word');
        }
      },
      description: 'Delete last word',
      category: 'text'
    },

    // ========================================
    // KEY PRESS COMMANDS
    // ========================================

    'press_enter': {
      patterns: [/press\s*enter/, /enter/],
      action: () => {
        const active = document.activeElement;
        if (active) {
          ['keydown', 'keypress', 'keyup'].forEach(type => {
            const event = new KeyboardEvent(type, { key: 'Enter', bubbles: true });
            active.dispatchEvent(event);
          });
          console.log('[Voice] Pressed Enter');
        }
      },
      description: 'Press Enter key',
      category: 'keyboard'
    },

    'press_tab': {
      patterns: [/press\s*tab/, /tab/],
      action: () => {
        const active = document.activeElement;
        if (active) {
          ['keydown', 'keyup'].forEach(type => {
            const event = new KeyboardEvent(type, { key: 'Tab', bubbles: true });
            active.dispatchEvent(event);
          });
          console.log('[Voice] Pressed Tab');
        }
      },
      description: 'Press Tab key',
      category: 'keyboard'
    },

    'press_escape': {
      patterns: [/press\s*escape/, /escape/, /esc/],
      action: () => {
        const active = document.activeElement;
        if (active) {
          ['keydown', 'keyup'].forEach(type => {
            const event = new KeyboardEvent(type, { key: 'Escape', bubbles: true });
            active.dispatchEvent(event);
          });
          console.log('[Voice] Pressed Escape');
        }
      },
      description: 'Press Escape key',
      category: 'keyboard'
    },

    // ========================================
    // FORM COMMANDS
    // ========================================

    'next_field': {
      patterns: [/next\s*field/],
      action: () => {
        const inputs = document.querySelectorAll('input, textarea, select, [contenteditable="true"]');
        let found = false;
        for (let i = 0; i < inputs.length; i++) {
          if (inputs[i] === document.activeElement && i < inputs.length - 1) {
            inputs[i + 1].focus();
            found = true;
            console.log('[Voice] Moved to next field');
            break;
          }
        }
        if (!found && inputs.length) {
          inputs[0].focus();
          console.log('[Voice] Moved to first field');
        }
      },
      description: 'Move to next form field',
      category: 'form'
    },

    'previous_field': {
      patterns: [/previous\s*field/, /prev\s*field/],
      action: () => {
        const inputs = document.querySelectorAll('input, textarea, select, [contenteditable="true"]');
        let found = false;
        for (let i = 0; i < inputs.length; i++) {
          if (inputs[i] === document.activeElement && i > 0) {
            inputs[i - 1].focus();
            found = true;
            console.log('[Voice] Moved to previous field');
            break;
          }
        }
        if (!found && inputs.length) {
          inputs[inputs.length - 1].focus();
          console.log('[Voice] Moved to last field');
        }
      },
      description: 'Move to previous form field',
      category: 'form'
    },

    'check_checkbox': {
      patterns: [/check\s*checkbox/, /check\s*box/],
      action: () => {
        const active = document.activeElement;
        if (active && active.type === 'checkbox' && !active.checked) {
          active.click();
          console.log('[Voice] Checked focused checkbox');
          return;
        }

        const checkboxes = document.querySelectorAll('input[type="checkbox"]:not(:checked)');
        if (checkboxes.length) {
          checkboxes[0].click();
          console.log('[Voice] Checked first unchecked checkbox');
        } else {
          console.warn('[Voice] No unchecked checkboxes found');
        }
      },
      description: 'Check a checkbox',
      category: 'form'
    },

    'uncheck_checkbox': {
      patterns: [/uncheck\s*checkbox/, /uncheck\s*box/],
      action: () => {
        const active = document.activeElement;
        if (active && active.type === 'checkbox' && active.checked) {
          active.click();
          console.log('[Voice] Unchecked focused checkbox');
          return;
        }

        const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');
        if (checkboxes.length) {
          checkboxes[0].click();
          console.log('[Voice] Unchecked first checked checkbox');
        } else {
          console.warn('[Voice] No checked checkboxes found');
        }
      },
      description: 'Uncheck a checkbox',
      category: 'form'
    },

    'submit_form': {
      patterns: [/submit\s*form/, /submit/],
      action: () => {
        const active = document.activeElement;
        const form = active?.closest?.('form') || document.querySelector('form');
        if (form) {
          const event = new Event('submit', { bubbles: true, cancelable: true });
          form.dispatchEvent(event);
          console.log('[Voice] Submitted form');
        } else {
          console.warn('[Voice] No form found');
        }
      },
      description: 'Submit the current form',
      category: 'form'
    },
    // ========================================
    // MEDIA COMMANDS
    // ========================================

    'play': {
      patterns: [/play/],
      action: () => {
        const video = document.querySelector('video');
        if (video && video.paused) video.play();
      },
      description: 'Play media',
      category: 'media'
    },

    'pause': {
      patterns: [/pause/],
      action: () => {
        const video = document.querySelector('video');
        if (video && !video.paused) video.pause();
      },
      description: 'Pause media',
      category: 'media'
    },

    'mute': {
      patterns: [/mute/],
      action: () => {
        const video = document.querySelector('video');
        if (video) video.muted = true;
      },
      description: 'Mute media',
      category: 'media'
    },

    'unmute': {
      patterns: [/unmute/],
      action: () => {
        const video = document.querySelector('video');
        if (video) video.muted = false;
      },
      description: 'Unmute media',
      category: 'media'
    },

    'volume_up': {
      patterns: [/volume\s*up/],
      action: () => {
        const video = document.querySelector('video');
        if (video) video.volume = Math.min(video.volume + 0.1, 1);
      },
      description: 'Increase volume',
      category: 'media'
    },

    'volume_down': {
      patterns: [/volume\s*down/],
      action: () => {
        const video = document.querySelector('video');
        if (video) video.volume = Math.max(video.volume - 0.1, 0);
      },
      description: 'Decrease volume',
      category: 'media'
    },

    'next_video': {
      patterns: [/next\s*video/],
      action: () => {
        const video = document.querySelector('video');
        if (CONFIG.IS_YOUTUBE) {
          const nextBtn = document.querySelector('a[aria-label*="Next"]') ||
            document.querySelector('ytd-compact-video-renderer a');
          if (nextBtn) nextBtn.click();
        } else if (video) {
          // Attempt to find next video in playlist
          const next = video.closest?.('video')?.parentElement?.nextElementSibling?.querySelector?.('video');
          if (next) next.scrollIntoView({ behavior: 'smooth' });
        }
      },
      description: 'Go to next video',
      category: 'media'
    },

    'previous_video': {
      patterns: [/previous\s*video/, /prev\s*video/],
      action: () => {
        const video = document.querySelector('video');
        if (CONFIG.IS_YOUTUBE) {
          const prevBtn = document.querySelector('a[aria-label*="Previous"]');
          if (prevBtn) prevBtn.click();
        } else if (video) {
          const prev = video.closest?.('video')?.parentElement?.previousElementSibling?.querySelector?.('video');
          if (prev) prev.scrollIntoView({ behavior: 'smooth' });
        }
      },
      description: 'Go to previous video',
      category: 'media'
    },

    'skip_forward': {
      patterns: [/skip\s*forward/, /skip\s*ahead/],
      action: () => {
        const video = document.querySelector('video');
        if (video) video.currentTime = Math.min(video.currentTime + 10, video.duration);
      },
      description: 'Skip forward 10 seconds',
      category: 'media'
    },

    'rewind': {
      patterns: [/rewind/, /skip\s*back/],
      action: () => {
        const video = document.querySelector('video');
        if (video) video.currentTime = Math.max(video.currentTime - 10, 0);
      },
      description: 'Rewind 10 seconds',
      category: 'media'
    },

    // ========================================
    // ACCESSIBILITY COMMANDS
    // ========================================

    'read_page': {
      patterns: [/read\s*page/, /read\s*aloud/],
      action: () => {
        const utterance = new SpeechSynthesisUtterance(document.body.innerText);
        utterance.rate = 1;
        utterance.pitch = 1;
        speechSynthesis.speak(utterance);
      },
      description: 'Read the page aloud',
      category: 'accessibility'
    },

    'stop_reading': {
      patterns: [/stop\s*reading/],
      action: () => speechSynthesis.cancel(),
      description: 'Stop reading aloud',
      category: 'accessibility'
    },

    'read_selected_text': {
      patterns: [/read\s*selected\s*text/, /read\s*selection/],
      action: () => {
        const selection = window.getSelection();
        if (selection.toString()) {
          const utterance = new SpeechSynthesisUtterance(selection.toString());
          utterance.rate = 1;
          utterance.pitch = 1;
          speechSynthesis.speak(utterance);
        }
      },
      description: 'Read selected text aloud',
      category: 'accessibility'
    },

    'increase_text_size': {
      patterns: [/increase\s*text\s*size/],
      action: () => {
        const fontSize = parseFloat(getComputedStyle(document.body).fontSize);
        document.body.style.fontSize = (fontSize * 1.1) + 'px';
      },
      description: 'Increase text size',
      category: 'accessibility'
    },

    'decrease_text_size': {
      patterns: [/decrease\s*text\s*size/],
      action: () => {
        const fontSize = parseFloat(getComputedStyle(document.body).fontSize);
        document.body.style.fontSize = Math.max(fontSize * 0.9, 8) + 'px';
      },
      description: 'Decrease text size',
      category: 'accessibility'
    },

    // ========================================
    // EXTENSION COMMANDS
    // ========================================

    'enable_voice': {
      patterns: [/enable\s*voice/, /turn\s*on\s*voice/],
      action: () => {
        chrome.storage.local.set({ voiceEnabled: true });
        chrome.runtime.sendMessage({ type: 'VOICE_ENABLED_CHANGED', voiceEnabled: true });
      },
      description: 'Enable voice commands',
      category: 'extension'
    },

    'disable_voice': {
      patterns: [/disable\s*voice/, /turn\s*off\s*voice/],
      action: () => {
        chrome.storage.local.set({ voiceEnabled: false });
        chrome.runtime.sendMessage({ type: 'VOICE_ENABLED_CHANGED', voiceEnabled: false });
      },
      description: 'Disable voice commands',
      category: 'extension'
    },

    'enable_mouth_click': {
      patterns: [/enable\s*mouth\s*click/],
      action: () => {
        chrome.storage.local.set({ mouthClickEnabled: true });
      },
      description: 'Enable mouth click',
      category: 'extension'
    },

    'disable_mouth_click': {
      patterns: [/disable\s*mouth\s*click/],
      action: () => {
        chrome.storage.local.set({ mouthClickEnabled: false });
      },
      description: 'Disable mouth click',
      category: 'extension'
    },

    'enable_head_tracking': {
      patterns: [/enable\s*head\s*tracking/],
      action: () => {
        chrome.storage.local.set({ gazeEnabled: true });
        chrome.runtime.sendMessage({ type: 'GAZE_ENABLED_CHANGED', gazeEnabled: true });
      },
      description: 'Enable head tracking',
      category: 'extension'
    },

    'disable_head_tracking': {
      patterns: [/disable\s*head\s*tracking/],
      action: () => {
        chrome.storage.local.set({ gazeEnabled: false });
        chrome.runtime.sendMessage({ type: 'GAZE_ENABLED_CHANGED', gazeEnabled: false });
      },
      description: 'Disable head tracking',
      category: 'extension'
    },

    'start_calibration': {
      patterns: [/start\s*calibration/, /calibrate/],
      action: () => {
        const event = new KeyboardEvent('keydown', {
          key: 'h',
          code: 'KeyH',
          altKey: true,
          bubbles: true,
          cancelable: true
        });
        document.dispatchEvent(event);
      },
      description: 'Start head tracking calibration',
      category: 'extension'
    },

    'reset_calibration': {
      patterns: [/reset\s*calibration/],
      action: () => {
        chrome.storage.local.remove(['gazeCalibration', 'mouthCalV1']);
      },
      description: 'Reset calibration',
      category: 'extension'
    },

    // ========================================
    // BROWSER COMMANDS
    // ========================================

    'open_history': {
      patterns: [/open\s*history/, /history/],
      action: () => chrome.runtime.sendMessage({ type: 'RELAY_VOICE_COMMAND', command: 'open history' }),
      description: 'Open browsing history',
      category: 'browser'
    },

    'open_downloads': {
      patterns: [/open\s*downloads/, /downloads/],
      action: () => chrome.runtime.sendMessage({ type: 'RELAY_VOICE_COMMAND', command: 'open downloads' }),
      description: 'Open downloads page',
      category: 'browser'
    },

    'open_bookmarks': {
      patterns: [/open\s*bookmarks/, /bookmarks/],
      action: () => chrome.runtime.sendMessage({ type: 'RELAY_VOICE_COMMAND', command: 'open bookmarks' }),
      description: 'Open bookmarks',
      category: 'browser'
    },

    // ========================================
    // YOUTUBE COMMANDS
    // ========================================

    'youtube_play_video': {
      patterns: [/play\s*video/],
      action: () => {
        const video = document.querySelector('video');
        if (video && video.paused) video.play();
      },
      description: 'Play YouTube video',
      category: 'youtube'
    },

    'youtube_pause_video': {
      patterns: [/pause\s*video/],
      action: () => {
        const video = document.querySelector('video');
        if (video && !video.paused) video.pause();
      },
      description: 'Pause YouTube video',
      category: 'youtube'
    },

    'youtube_next_video': {
      patterns: [/youtube\s*next/, /yt\s*next/],
      action: () => {
        const nextBtn = document.querySelector('a[aria-label*="Next"]') ||
          document.querySelector('ytd-compact-video-renderer a');
        if (nextBtn) nextBtn.click();
      },
      description: 'Next YouTube video',
      category: 'youtube'
    },

    'youtube_previous_video': {
      patterns: [/youtube\s*previous/, /yt\s*previous/, /yt\s*prev/],
      action: () => {
        const prevBtn = document.querySelector('a[aria-label*="Previous"]');
        if (prevBtn) prevBtn.click();
      },
      description: 'Previous YouTube video',
      category: 'youtube'
    },

    'youtube_skip_10': {
      patterns: [/skip\s*10\s*seconds/, /skip\s*ten\s*seconds/],
      action: () => {
        const video = document.querySelector('video');
        if (video) video.currentTime = Math.min(video.currentTime + 10, video.duration);
      },
      description: 'Skip 10 seconds on YouTube',
      category: 'youtube'
    },

    'youtube_rewind_10': {
      patterns: [/rewind\s*10\s*seconds/, /rewind\s*ten\s*seconds/],
      action: () => {
        const video = document.querySelector('video');
        if (video) video.currentTime = Math.max(video.currentTime - 10, 0);
      },
      description: 'Rewind 10 seconds on YouTube',
      category: 'youtube'
    },

    // ========================================
    // SMART COMMANDS
    // ========================================

    'yes': {
      patterns: [/^yes$/, /^yep$/, /^yeah$/],
      action: () => {
        const button = document.querySelector('button[aria-label*="Yes"], button[aria-label*="Confirm"]');
        if (button) button.click();
      },
      description: 'Click Yes/Confirm button',
      category: 'smart',
      isInstant: true
    },

    'no': {
      patterns: [/^no$/, /^nope$/],
      action: () => {
        const button = document.querySelector('button[aria-label*="No"], button[aria-label*="Cancel"]');
        if (button) button.click();
      },
      description: 'Click No/Cancel button',
      category: 'smart',
      isInstant: true
    },

    'cancel': {
      patterns: [/cancel/],
      action: () => {
        const button = document.querySelector('button[aria-label*="Cancel"]');
        if (button) button.click();
      },
      description: 'Cancel current action',
      category: 'smart',
      isInstant: true
    },

    'help': {
      patterns: [/help/],
      action: () => {
        const commands = Object.keys(VoiceCommandMap).map(key => {
          const cmd = VoiceCommandMap[key];
          return `${cmd.patterns[0].source} - ${cmd.description}`;
        });
        console.log('[Voice] Available commands:\n', commands.join('\n'));
        const utterance = new SpeechSynthesisUtterance(`Available commands: ${commands.slice(0, 10).join('. ')}`);
        speechSynthesis.speak(utterance);
      },
      description: 'List available voice commands',
      category: 'smart'
    },

    'repeat': {
      patterns: [/repeat/],
      action: () => {
        // Repeats the last spoken text - can be enhanced with history
        console.log('[Voice] Repeat last command');
      },
      description: 'Repeat last command',
      category: 'smart'
    },

    // ========================================
    // SEARCH COMMANDS
    // ========================================

    'search_for': {
      patterns: [/search\s+for\s+(.+)/, /search\s+(.+)/],
      action: (match) => {
        const query = match[1] || match[0];
        if (query) {
          chrome.runtime.sendMessage({
            action: 'voice_search',
            query: query.trim()
          });
        }
      },
      description: 'Search for text on Google',
      category: 'search',
      needsParam: true
    },

    'find': {
      patterns: [/find\s+(.+)/],
      action: (match) => {
        const query = match[1];
        if (query) {
          const selection = window.getSelection();
          selection.removeAllRanges();
          const range = document.createRange();
          const textNodes = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
              acceptNode: (node) => {
                if (node.textContent.toLowerCase().includes(query.toLowerCase())) {
                  return NodeFilter.FILTER_ACCEPT;
                }
                return NodeFilter.FILTER_REJECT;
              }
            }
          );
          const node = textNodes.nextNode();
          if (node) {
            range.setStart(node, node.textContent.toLowerCase().indexOf(query.toLowerCase()));
            range.setEnd(node, range.startOffset + query.length);
            selection.addRange(range);
            node.parentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      },
      description: 'Find text on page',
      category: 'search',
      needsParam: true
    },

    // ========================================
    // TEXT INPUT COMMANDS
    // ========================================

    'start_typing': {
      patterns: [/start\s*typing/],
      action: () => {
        const inputs = document.querySelectorAll('input, textarea, [contenteditable="true"]');
        if (inputs.length) {
          inputs[0].focus();
          console.log('[Voice] Started typing mode');
          window.__dictationMode = true;
          window.__dictationTarget = inputs[0];
        } else {
          console.warn('[Voice] No editable fields found');
        }
      },
      description: 'Focus on first input and enable dictation',
      category: 'text'
    },

    'stop_typing': {
      patterns: [/stop\s*typing/],
      action: () => {
        if (document.activeElement) {
          document.activeElement.blur();
          console.log('[Voice] Stopped typing mode');
        }
        window.__dictationMode = false;
        window.__dictationTarget = null;
      },
      description: 'Exit dictation mode',
      category: 'text'
    },

    'start_copy': {
      patterns: [/start\s*copy/],
      action: () => {
        window.__copyMode = true;
        console.log('[Voice] Copy mode enabled. Select text to copy, then say "stop copy"');
      },
      description: 'Enable copy mode (copies on selection)',
      category: 'text'
    },

    'stop_copy': {
      patterns: [/stop\s*copy/],
      action: () => {
        if (window.__copyMode) {
          const selection = window.getSelection();
          const active = document.activeElement;
          let textToCopy = '';

          // Check if in input/textarea
          if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
            textToCopy = active.value.substring(active.selectionStart || 0, active.selectionEnd || 0);
          } else if (selection.toString()) {
            textToCopy = selection.toString();
          }

          if (textToCopy) {
            navigator.clipboard.writeText(textToCopy).then(() => {
              console.log('[Voice] Copied selection and exited copy mode');
            }).catch(() => {
              document.execCommand('copy');
              console.log('[Voice] Copied selection and exited copy mode');
            });
          } else {
            console.warn('[Voice] No text selected to copy');
          }
          window.__copyMode = false;
        }
      },
      description: 'Copy current selection and exit copy mode',
      category: 'text'
    },

    'start_paste': {
      patterns: [/start\s*paste/],
      action: () => {
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) {
          navigator.clipboard.readText().then(text => {
            if (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA') {
              const start = active.selectionStart || 0;
              const end = active.selectionEnd || 0;
              active.value = active.value.substring(0, start) + text + active.value.substring(end);
              active.selectionStart = active.selectionEnd = start + text.length;
            } else if (active.isContentEditable) {
              document.execCommand('insertText', false, text);
            }
            console.log('[Voice] Pasted text');
          }).catch(() => {
            console.warn('[Voice] Failed to paste');
          });
        } else {
          console.warn('[Voice] No editable field focused');
        }
      },
      description: 'Paste clipboard text into active field',
      category: 'text'
    },

    'stop_paste': {
      patterns: [/stop\s*paste/],
      action: () => {
        console.log('[Voice] Paste mode exited');
      },
      description: 'Exit paste mode',
      category: 'text'
    },

    // ========================================
    // GOOGLE COMMANDS
    // ========================================

    'open_first_result': {
      patterns: [/open\s*first\s*result/, /first\s*result/],
      action: () => {
        const result = document.querySelector('a[jsname="UWckNb"], a[data-ved]');
        if (result) result.click();
      },
      description: 'Open first search result on Google',
      category: 'google'
    },

    'open_second_result': {
      patterns: [/open\s*second\s*result/, /second\s*result/],
      action: () => {
        const results = document.querySelectorAll('a[jsname="UWckNb"], a[data-ved]');
        if (results[1]) results[1].click();
      },
      description: 'Open second search result on Google',
      category: 'google'
    },

    'open_third_result': {
      patterns: [/open\s*third\s*result/, /third\s*result/],
      action: () => {
        const results = document.querySelectorAll('a[jsname="UWckNb"], a[data-ved]');
        if (results[2]) results[2].click();
      },
      description: 'Open third search result on Google',
      category: 'google'
    }
  };

  // ========================================
  // DICTATION MODE SUPPORT
  // ========================================

  // Check if dictation mode is active and this is not a command
  if (window.__dictationMode && window.__dictationTarget) {
    // Check if this is a command or dictation input
    const isCommand = Object.values(VoiceCommandMap).some(cmdDef =>
      cmdDef.patterns.some(pattern => {
        if (typeof pattern === 'string') {
          return normalized.includes(pattern);
        } else if (pattern instanceof RegExp) {
          return pattern.test(normalized);
        }
        return false;
      })
    );

    // If it's not a command, treat as dictation input
    if (!isCommand) {
      const target = window.__dictationTarget;
      const text = normalized;

      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        const start = target.selectionStart || target.value.length;
        const end = target.selectionEnd || target.value.length;
        target.value = target.value.substring(0, start) + ' ' + text + ' ' + target.value.substring(end);
        target.selectionStart = target.selectionEnd = start + text.length + 2;
      } else if (target.isContentEditable) {
        document.execCommand('insertText', false, ' ' + text + ' ');
      }

      console.log('[Voice] Dictation inserted:', text);
      return 'dictation';
    }
  }

  /**
   * VOICE COMMAND ENGINE
   */
  let voiceLastCommand = '';
  let voiceCommandHistory = [];
  const VOICE_HISTORY_LIMIT = 10;

  function executeVoiceCommand(transcript) {
    const normalized = transcript.toLowerCase().trim();
    console.log(`[Voice] Processing: "${normalized}"`);

    const browserCommands = [
      'new tab', 'close tab', 'next tab', 'previous tab', 'prev tab',
      'open history', 'open downloads', 'open bookmarks',
      'new_tab', 'close_tab', 'next_tab', 'previous_tab', 'prev_tab',
      'open_history', 'open_downloads', 'open_bookmarks'
    ];

    // Check if this is a browser-level command
    const isBrowserCommand = browserCommands.some(cmd =>
      normalized === cmd || normalized.includes(cmd)
    );

    if (isBrowserCommand) {
      console.log(`[Voice] Browser command detected: "${normalized}" - relaying to background`);
      chrome.runtime.sendMessage({
        type: 'RELAY_VOICE_COMMAND',
        command: normalized
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn('[Voice] Failed to relay browser command:', chrome.runtime.lastError);
          return;
        }
        if (response && response.status === 'ok') {
          console.log(`[Voice] ✓ Browser command executed: ${response.command}`);
          voiceLastCommand = normalized;
          voiceCommandHistory.push({ command: response.command, transcript: normalized, timestamp: Date.now() });
          if (voiceCommandHistory.length > VOICE_HISTORY_LIMIT) {
            voiceCommandHistory.shift();
          }
        }
      });
      return 'browser';
    }

    // ✅ DUPLICATE CHECK REMOVED - Commands can repeat freely

    // Try to match each command
    for (const [commandKey, commandDef] of Object.entries(VoiceCommandMap)) {
      for (const pattern of commandDef.patterns) {
        let match = null;

        if (typeof pattern === 'string') {
          if (normalized.includes(pattern)) {
            match = [normalized];
          }
        } else if (pattern instanceof RegExp) {
          const result = normalized.match(pattern);
          if (result) {
            match = result;
          }
        }

        if (match) {
          try {
            if (commandDef.needsParam) {
              commandDef.action(match);
            } else {
              commandDef.action();
            }

            voiceLastCommand = normalized;
            voiceCommandHistory.push({ command: commandKey, transcript: normalized, timestamp: Date.now() });
            if (voiceCommandHistory.length > VOICE_HISTORY_LIMIT) {
              voiceCommandHistory.shift();
            }

            console.log(`[Voice] ✓ Executed: ${commandKey} - ${commandDef.description}`);
            return commandKey;
          } catch (error) {
            console.error(`[Voice] ✗ Error executing ${commandKey}:`, error);
            return null;
          }
        }
      }
    }

    console.log('[Voice] ✗ Unknown command');
    return null;
  }
  
  /**
   * Get all commands in a category
   */
  function getCommandsByCategory(category) {
    const result = {};
    for (const [key, def] of Object.entries(VoiceCommandMap)) {
      if (def.category === category) {
        result[key] = def;
      }
    }
    return result;
  }

  /**
   * Get all instant commands (executed without final recognition)
   */
  function getInstantCommands() {
    const result = [];
    for (const [key, def] of Object.entries(VoiceCommandMap)) {
      if (def.isInstant) {
        result.push(key);
      }
    }
    return result;
  }

  /**
   * Get command description
   */
  function getCommandDescription(commandKey) {
    return VoiceCommandMap[commandKey]?.description || 'Unknown command';
  }

  // ========================================
  // EXISTING CONTENT SCRIPT CODE
  // ========================================

  // State management
  let currentHoverTimeout = null;
  let hideTimeout = null;
  let lastProcessedUrl = null;
  let currentlyProcessingUrl = null;
  let currentlyDisplayedUrl = null;
  let processingElement = null;
  let tooltip = null;
  let tooltipContent = null;
  let tooltipCloseHandlerAttached = false;
  let twitterHoverTimeout = null;
  let currentTwitterArticle = null;
  let currentTwitterTweetId = null;
  let pendingTwitterThreadId = null;
  let pendingTwitterStartedAt = 0;
  let displayMode = 'tooltip';
  let gazeEnabled = false;
  let currentTooltipPlacement = 'auto';
  let currentYouTubeRequestToken = 0;
  let currentHoveredElement = null;
  let isMouseInTooltip = false;
  let displayTimes = new Map();
  let hoverTimeouts = new Map();
  let isVoiceEnabled = false;

  // Twitter-specific state
  const twitterGqlCache = new Map();
  let twitterInterceptorInstalled = false;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // ========================================
  // TOOLTIP FUNCTIONS (Existing)
  // ========================================

  function createTooltip() {
    if (tooltip && tooltipContent && tooltipContent.parentNode === tooltip) {
      return tooltip;
    }

    if (tooltip && tooltip.parentNode) {
      tooltip.parentNode.removeChild(tooltip);
      tooltip = null;
      tooltipContent = null;
    }

    if (!document.getElementById('hover-tooltip-styles')) {
      const style = document.createElement('style');
      style.id = 'hover-tooltip-styles';
      style.textContent = `
        #hover-summary-tooltip ul {
          margin: 12px 0;
          padding-left: 24px;
          list-style-type: disc;
          list-style-position: outside;
        }
        #hover-summary-tooltip li {
          margin-bottom: 8px;
          line-height: 1.6;
          display: list-item;
        }
        #hover-summary-tooltip strong {
          font-weight: 600;
        }
        #hover-summary-tooltip em {
          font-style: italic;
        }
        .tooltip-close-btn {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.05);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          line-height: 1;
          color: #666;
          transition: all 0.2s ease;
          padding: 0;
          z-index: 1;
        }
        .tooltip-close-btn:hover {
          background: rgba(0, 0, 0, 0.1);
          color: #333;
          transform: scale(1.1);
        }
      `;
      document.head.appendChild(style);
    }

    tooltip = document.createElement('div');
    tooltip.id = 'hover-summary-tooltip';
    tooltip.style.cssText = `
      position: fixed;
      z-index: 2147483647;
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.1);
      padding: 16px 40px 16px 16px;
      max-width: 400px;
      max-height: 500px;
      overflow-y: auto;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #1a1a1a;
      display: none;
      pointer-events: auto;
      opacity: 0;
      transition: opacity 0.2s ease;
      cursor: auto;
      user-select: text;
    `;

    tooltipContent = document.createElement('div');
    tooltipContent.className = 'tooltip-content-wrapper';
    tooltip.appendChild(tooltipContent);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'tooltip-close-btn';
    closeBtn.innerHTML = '×';
    closeBtn.title = 'Close';
    closeBtn.setAttribute('data-gaze-clickable', 'true');
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      hideTooltip();
    });
    tooltip.appendChild(closeBtn);

    tooltip.addEventListener('mouseenter', () => {
      isMouseInTooltip = true;
      clearTimeout(hideTimeout);
      hideTimeout = null;
    });

    tooltip.addEventListener('mouseleave', () => {
      isMouseInTooltip = false;
      scheduleHide(200);
    });

    document.body.appendChild(tooltip);
    return tooltip;
  }

  function positionTooltip(element, placement = 'auto') {
    if (!tooltip || !element) return;

    const rect = element.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const gap = 12;

    let top = rect.top;
    let left = rect.left;

    if (placement === 'right') {
      left = rect.right + gap;
      if (left + tooltipRect.width > viewportWidth - gap) {
        left = rect.left - gap - tooltipRect.width;
      }
      if (left < gap) {
        left = Math.max(gap, rect.left);
      }
      top = Math.max(gap, Math.min(rect.top, viewportHeight - tooltipRect.height - gap));
    } else if (placement === 'left') {
      left = rect.left - gap - tooltipRect.width;
      if (left < gap) {
        left = rect.right + gap;
      }
      if (left + tooltipRect.width > viewportWidth - gap) {
        left = Math.max(gap, viewportWidth - tooltipRect.width - gap);
      }
      top = Math.max(gap, Math.min(rect.top, viewportHeight - tooltipRect.height - gap));
    } else {
      if (rect.bottom + gap + tooltipRect.height < viewportHeight) {
        top = rect.bottom + gap;
      } else if (rect.top - gap - tooltipRect.height > 0) {
        top = rect.top - gap - tooltipRect.height;
      } else {
        top = Math.max(gap, (viewportHeight - tooltipRect.height) / 2);
      }
      left = rect.left;
      if (left + tooltipRect.width > viewportWidth - gap) {
        left = Math.max(gap, rect.right - tooltipRect.width);
      }
      if (left < gap) {
        left = gap;
      }
    }

    top = Math.max(gap, Math.min(top, viewportHeight - tooltipRect.height - gap));
    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
  }

  const handleTooltipPointerDown = (event) => {
    if (!tooltip || tooltip.style.display !== 'block') return;
    if (tooltip.contains(event.target)) {
      return;
    }
    hideTooltip();
  };

  const handleTooltipKeyDown = (event) => {
    if (event.key === 'Escape' && tooltip && tooltip.style.display === 'block') {
      event.preventDefault();
      cancelActiveSummary('escape_key');
    }
  };

  function attachTooltipDismissHandlers() {
    if (tooltipCloseHandlerAttached) return;
    document.addEventListener('pointerdown', handleTooltipPointerDown, true);
    document.addEventListener('keydown', handleTooltipKeyDown, true);
    tooltipCloseHandlerAttached = true;
  }

  function detachTooltipDismissHandlers() {
    if (!tooltipCloseHandlerAttached) return;
    document.removeEventListener('pointerdown', handleTooltipPointerDown, true);
    document.removeEventListener('keydown', handleTooltipKeyDown, true);
    tooltipCloseHandlerAttached = false;
  }

  function cancelActiveSummary(reason = 'user_cancel') {
    const previousUrl = currentlyProcessingUrl;
    const wasYouTube = previousUrl ? (() => {
      try {
        const parsed = new URL(previousUrl, window.location.origin);
        return YOUTUBE_HOSTS.has(parsed.hostname.toLowerCase());
      } catch (error) {
        return false;
      }
    })() : false;

    if (currentHoverTimeout) {
      clearTimeout(currentHoverTimeout);
      currentHoverTimeout = null;
    }
    hoverTimeouts.forEach(({ timeoutId }) => {
      clearTimeout(timeoutId);
    });
    hoverTimeouts.clear();

    hideTooltip();

    currentlyProcessingUrl = null;
    processingElement = null;
    currentHoveredElement = null;

    if (CONFIG.IS_TWITTER) {
      clearTwitterState();
    }

    if (wasYouTube) {
      const videoId = extractYouTubeVideoId(previousUrl);
      if (videoId) {
        chrome.runtime.sendMessage({
          action: 'ABORT_YOUTUBE_SUMMARY',
          videoId,
          reason
        });
      }
    }
  }

  function scheduleHide(delay = 500, forUrl = null) {
    const shortUrl = forUrl ? getShortUrl(forUrl) : 'none';
    debugLog(`⏲️ SCHEDULE HIDE: for "${shortUrl}" in ${delay}ms`);

    clearTimeout(hideTimeout);
    hideTimeout = setTimeout(() => {
      const currentShortUrl = currentlyDisplayedUrl ? getShortUrl(currentlyDisplayedUrl) : 'none';
      if (!isMouseInTooltip && (!forUrl || currentlyDisplayedUrl === forUrl)) {
        debugLog(`🔽 EXECUTING HIDE: scheduled for "${shortUrl}"`);
        hideTooltip();
      }
    }, delay);
  }

  function showTooltip(element, content, url, options = {}) {
    if (displayMode === 'panel') return;

    const placement = options.placement || 'auto';
    currentTooltipPlacement = placement;
    const shortUrl = url ? getShortUrl(url) : 'unknown';
    debugLog(`📤 SHOW TOOLTIP: "${shortUrl}"`);

    clearTimeout(hideTimeout);
    hideTimeout = null;

    const tooltipEl = createTooltip();
    tooltipContent.innerHTML = content;
    tooltipEl.style.display = 'block';
    attachTooltipDismissHandlers();

    currentlyDisplayedUrl = url;

    const anchor = element || processingElement || currentHoveredElement;
    positionTooltip(anchor, placement);

    if (url) {
      displayTimes.set(url, Date.now());
    }

    requestAnimationFrame(() => {
      tooltipEl.style.opacity = '1';
    });
  }

  function hideTooltip() {
    if (tooltip) {
      tooltip.style.opacity = '0';
      currentlyDisplayedUrl = null;
      setTimeout(() => {
        if (tooltip && !isMouseInTooltip) {
          tooltip.style.display = 'none';
        }
      }, 200);

      detachTooltipDismissHandlers();
      currentlyProcessingUrl = null;
      processingElement = null;
      currentHoveredElement = null;
      currentTooltipPlacement = 'auto';
    }
  }

  function updateTooltipContent(content, url) {
    if (displayMode === 'panel') return;

    clearTimeout(hideTimeout);
    hideTimeout = null;

    if (tooltip) {
      if (tooltip.style.display !== 'block') {
        tooltip.style.display = 'block';
        if (url) {
          displayTimes.set(url, Date.now());
        }
      }

      currentlyDisplayedUrl = url;
      tooltipContent.innerHTML = content;
      tooltip.style.opacity = '1';

      const elementForPositioning = currentHoveredElement || processingElement;
      if (elementForPositioning) {
        positionTooltip(elementForPositioning, currentTooltipPlacement);
      }
    }
  }

  // ========================================
  // HELPER FUNCTIONS (Existing)
  // ========================================

  function findLink(element) {
    let current = element;
    for (let i = 0; i < 10 && current; i++) {
      if (current.tagName === 'A' && current.href) {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  }

  function getLinkType(link, target) {
    const hasImage = link.querySelector('img') !== null;
    const targetIsImage = target.tagName === 'IMG';

    if (targetIsImage || hasImage) {
      return '🖼️ IMAGE-LINK';
    }
    return '📝 TEXT-LINK';
  }

  function getShortUrl(url) {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;
      const segments = path.split('/').filter(s => s);
      const lastSegments = segments.slice(-2).join('/');
      return lastSegments || urlObj.hostname;
    } catch {
      return url.substring(0, 50);
    }
  }

  function isRedditPostUrl(url) {
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.toLowerCase();

      const matchesRedditHost = REDDIT_HOSTS.some(host => {
        if (hostname === host) return true;
        return hostname.endsWith(`.${host}`);
      });

      if (!matchesRedditHost) {
        return false;
      }

      if (hostname === 'redd.it' || hostname.endsWith('.redd.it')) {
        const slug = parsed.pathname.replace(/\//g, '').trim();
        return /^[a-z0-9]+$/i.test(slug);
      }

      return /\/comments\/[a-z0-9]+/i.test(parsed.pathname);
    } catch {
      return false;
    }
  }

  function isInternalTwitterLink(url) {
    try {
      const parsed = new URL(url, window.location.origin);
      return TWITTER_HOSTS.has(parsed.hostname.toLowerCase());
    } catch {
      return false;
    }
  }

  function extractYouTubeVideoId(url) {
    if (!url) return null;
    const patterns = [
      /(?:youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)([^&\n?#]+)/,
      /youtube\.com\/shorts\/([^&\n?#]+)/,
      /[?&]v=([^&\n?#]+)/
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[2]) return match[2];
      if (match && match[1] && pattern.source.includes('shorts')) return match[1];
      if (!pattern.source.includes('shorts') && match && match[1]) return match[1];
    }
    return null;
  }

  function isYouTubeVideoLink(url) {
    try {
      const parsed = new URL(url, window.location.origin);
      if (!YOUTUBE_HOSTS.has(parsed.hostname.toLowerCase())) return false;
      const videoId = extractYouTubeVideoId(url);
      return !!videoId;
    } catch {
      return false;
    }
  }

  function findYouTubeCardElement(element) {
    if (!element) return null;
    const selectors = [
      'ytd-rich-grid-video-renderer',
      'ytd-video-renderer',
      'ytd-compact-video-renderer',
      'ytd-playlist-video-renderer',
      'ytd-playlist-renderer',
      'ytd-rich-item-renderer',
      'ytd-grid-video-renderer'
    ];
    for (const selector of selectors) {
      const card = element.closest(selector);
      if (card) return card;
    }
    return null;
  }

  function isYouTubeThumbnail(element) {
    if (!CONFIG.IS_YOUTUBE) return false;

    const thumbnailSelectors = [
      'ytd-thumbnail',
      'ytd-video-preview',
      'ytd-playlist-thumbnail',
      'a#thumbnail'
    ];

    for (const selector of thumbnailSelectors) {
      if (element.matches(selector) || element.closest(selector)) {
        return true;
      }
    }

    return false;
  }

  function formatAISummary(text) {
    if (!text) return '';

    let formatted = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    formatted = formatted
      .replace(/^### (.+)$/gm, '<h4>$1</h4>')
      .replace(/^## (.+)$/gm, '<h3>$1</h3>')
      .replace(/^# (.+)$/gm, '<h2>$1</h2>');

    formatted = formatted
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.+?)__/g, '<strong>$1</strong>');

    formatted = formatted
      .replace(/\*([^\*\s][^\*]*?[^\*\s])\*/g, '<em>$1</em>')
      .replace(/_([^_\s][^_]*?[^_\s])_/g, '<em>$1</em>');

    formatted = formatted
      .replace(/^[\*\-•] (.+)$/gm, '<li>$1</li>');

    formatted = formatted
      .replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

    formatted = formatted
      .replace(/(<li>.*?<\/li>\n?)+/g, (match) => {
        return '<ul>' + match.replace(/\n/g, '') + '</ul>';
      });

    formatted = formatted
      .replace(/\n\n+/g, '</p><p>');

    formatted = formatted
      .replace(/\n/g, '<br>');

    if (!formatted.startsWith('<h') && !formatted.startsWith('<ul') && !formatted.startsWith('<p>')) {
      formatted = '<p>' + formatted;
    }
    if (!formatted.endsWith('</p>') && !formatted.endsWith('</ul>') && !formatted.endsWith('</h2>') && !formatted.endsWith('</h3>') && !formatted.endsWith('</h4>')) {
      formatted = formatted + '</p>';
    }

    formatted = formatted
      .replace(/<p><\/p>/g, '')
      .replace(/<p>\s*<\/p>/g, '');

    formatted = formatted
      .replace(/<p>(<h\d>)/g, '$1')
      .replace(/(<\/h\d>)<\/p>/g, '$1')
      .replace(/<p>(<ul>)/g, '$1')
      .replace(/(<\/ul>)<\/p>/g, '$1');

    return formatted;
  }

  // ========================================
  // TWITTER FUNCTIONS (Existing)
  // ========================================

  function ensureTwitterInterceptor() {
    if (!CONFIG.IS_TWITTER || twitterInterceptorInstalled) return;
    twitterInterceptorInstalled = true;
    injectTwitterInterceptor();
    window.addEventListener('message', handleTwitterPostMessage);
  }

  function injectTwitterInterceptor() {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('twitter/twitter-interceptor.js');
    script.type = 'text/javascript';
    script.onload = () => {
      script.remove();
    };
    (document.head || document.documentElement).appendChild(script);
  }

  function handleTwitterPostMessage(event) {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.source !== 'hover-preview-twitter' || data.type !== 'TWITTER_GQL_RESPONSE') return;
    try {
      const payload = data.payload;
      if (!payload || !payload.json) return;
      recordTwitterGqlPayload(payload.json);
    } catch (error) {
      console.warn('[Twitter] Failed to process intercepted payload:', error);
    }
  }

  function recordTwitterGqlPayload(json) {
    const tweetIds = extractTweetIdsFromJson(json);
    if (!tweetIds.length) return;
    tweetIds.forEach((id) => {
      if (!twitterGqlCache.has(id)) {
        twitterGqlCache.set(id, []);
      }
      const entries = twitterGqlCache.get(id);
      entries.push(json);
      if (entries.length > 8) {
        entries.shift();
      }
    });
  }

  function extractTweetIdsFromJson(obj) {
    const ids = new Set();
    const visited = new Set();

    function walk(node) {
      if (!node || typeof node !== 'object') return;
      if (visited.has(node)) return;
      visited.add(node);

      if (node.rest_id || node.restId) {
        const id = String(node.rest_id || node.restId);
        if (id) ids.add(id);
      }

      if (node.legacy && node.legacy.id_str) {
        ids.add(String(node.legacy.id_str));
      }

      for (const key in node) {
        if (!Object.prototype.hasOwnProperty.call(node, key)) continue;
        const value = node[key];
        if (typeof value === 'object' && value !== null) {
          walk(value);
        }
      }
    }

    try {
      walk(obj);
    } catch (error) {
      console.warn('[Twitter] Failed to extract tweet IDs:', error);
    }

    return Array.from(ids);
  }

  function buildThreadFromCache(tweetId) {
    if (!tweetId) return null;
    const blobs = twitterGqlCache.get(tweetId);
    if (!blobs || !blobs.length) return null;

    const nodesById = new Map();
    blobs.forEach((blob) => {
      collectTweetsFromPayload(blob, nodesById);
    });

    if (!nodesById.size) return null;

    const rootNode = nodesById.get(tweetId) || Array.from(nodesById.values())[0];
    if (!rootNode) return null;

    const conversationId = rootNode.conversationId || null;
    const collectedNodes = [];

    nodesById.forEach((node) => {
      if (conversationId && node.conversationId && node.conversationId !== conversationId) {
        return;
      }
      collectedNodes.push(Object.assign({}, node));
    });

    if (!collectedNodes.length) return null;

    collectedNodes.sort((a, b) => {
      const aTime = a.timestamp || '';
      const bTime = b.timestamp || '';
      return aTime.localeCompare(bTime);
    });

    const limitedNodes = collectedNodes.slice(0, 20);
    if (!limitedNodes.some((node) => node.id === rootNode.id)) {
      limitedNodes.unshift(Object.assign({}, rootNode));
    }
    limitedNodes.forEach((node, index) => {
      node.order = index;
    });

    return {
      rootId: rootNode.id,
      conversationId,
      nodes: limitedNodes,
      source: 'interceptor'
    };
  }

  function collectTweetsFromPayload(obj, map) {
    const visited = new Set();

    function walk(node) {
      if (!node || typeof node !== 'object') return;
      if (visited.has(node)) return;
      visited.add(node);

      const candidate = extractTweetCandidate(node);
      if (candidate) {
        const id = candidate.id;
        if (!map.has(id) || (candidate.text && candidate.text.length > (map.get(id).text || '').length)) {
          map.set(id, candidate);
        }
      }

      for (const key in node) {
        if (!Object.prototype.hasOwnProperty.call(node, key)) continue;
        const value = node[key];
        if (typeof value === 'object' && value !== null) {
          walk(value);
        }
      }
    }

    walk(obj);
  }

  function extractTweetCandidate(node) {
    const result = resolveTweetResult(node);
    if (!result) return null;

    const legacy = result.legacy || (result.tweet && result.tweet.legacy);
    if (!legacy) return null;

    const id = result.rest_id || (legacy && legacy.id_str);
    if (!id) return null;

    const userLegacy = (result.core && result.core.user_results && result.core.user_results.result && result.core.user_results.result.legacy) ||
      (result.author && result.author.legacy) ||
      null;

    const text = extractTweetText(result, legacy);
    const timestamp = legacy.created_at ? new Date(legacy.created_at).toISOString() : null;
    const conversationId = legacy.conversation_id_str || null;
    const handle = userLegacy ? userLegacy.screen_name : (legacy && legacy.screen_name) || null;
    const authorName = userLegacy ? userLegacy.name : null;
    const avatarUrl = userLegacy ? userLegacy.profile_image_url_https : null;
    const permalink = handle ? `https://x.com/${handle}/status/${id}` : (legacy.url || null);
    const inReplyToId = legacy.in_reply_to_status_id_str ? String(legacy.in_reply_to_status_id_str) : null;

    const media = extractTweetMedia(legacy);

    return {
      id: String(id),
      conversationId: conversationId ? String(conversationId) : null,
      authorName: authorName || null,
      handle: handle ? `@${handle}` : null,
      avatarUrl: avatarUrl || null,
      timestamp,
      permalink,
      text,
      media,
      inReplyToId,
      order: 0
    };
  }

  function resolveTweetResult(node) {
    if (!node || typeof node !== 'object') return null;
    if (node.__typename === 'Tweet') return node;
    if (node.result && node.result.__typename === 'Tweet') return node.result;
    if (node.tweet && node.tweet.__typename === 'Tweet') return node.tweet;
    if (node.tweet_results && node.tweet_results.result && node.tweet_results.result.__typename === 'Tweet') return node.tweet_results.result;
    if (node.itemContent && node.itemContent.tweet_results && node.itemContent.tweet_results.result) {
      return node.itemContent.tweet_results.result;
    }
    if (node.item && node.item.itemContent && node.item.itemContent.tweet_results && node.item.itemContent.tweet_results.result) {
      return node.item.itemContent.tweet_results.result;
    }
    if (node.content && node.content.tweetResult && node.content.tweetResult.result) {
      return node.content.tweetResult.result;
    }
    if (node.content && node.content.itemContent && node.content.itemContent.tweet_results && node.content.itemContent.tweet_results.result) {
      return node.content.itemContent.tweet_results.result;
    }
    if (node.tweetResult && node.tweetResult.result) {
      return node.tweetResult.result;
    }
    if (node.tweet && node.tweet.core && node.tweet.core.tweet && node.tweet.core.tweet.legacy) {
      return node.tweet.core.tweet;
    }
    return null;
  }

  function extractTweetText(result, legacy) {
    if (!legacy) return '';
    if (result.note_tweet && result.note_tweet.note_tweet_results && result.note_tweet.note_tweet_results.result) {
      const note = result.note_tweet.note_tweet_results.result;
      if (note && note.text) {
        return note.text;
      }
      if (note && Array.isArray(note.entity_set?.note_inline_media)) {
        const textPieces = [];
        if (note.entity_set?.richtext?.plain_text) {
          textPieces.push(note.entity_set.richtext.plain_text);
        }
        if (note.entity_set?.media) {
          note.entity_set.media.forEach((mediaItem) => {
            if (mediaItem.alt_text) {
              textPieces.push(`[Image: ${mediaItem.alt_text}]`);
            }
          });
        }
        if (textPieces.length) {
          return textPieces.join('\n');
        }
      }
    }

    if (legacy.full_text) {
      return legacy.full_text;
    }

    if (legacy.text) {
      return legacy.text;
    }

    return '';
  }

  function extractTweetMedia(legacy) {
    const media = [];
    const entities = (legacy.extended_entities && legacy.extended_entities.media) ||
      (legacy.entities && legacy.entities.media) ||
      [];

    entities.forEach((item) => {
      if (!item) return;
      if (item.type === 'photo') {
        media.push({
          kind: 'photo',
          urls: item.media_url_https ? [item.media_url_https] : []
        });
      } else if (item.type === 'animated_gif') {
        const variants = (item.video_info && item.video_info.variants) || [];
        const urls = variants.filter((variant) => variant.url).map((variant) => variant.url);
        media.push({
          kind: 'gif',
          urls
        });
      } else if (item.type === 'video') {
        const variants = (item.video_info && item.video_info.variants) || [];
        const urls = variants.filter((variant) => variant.url).map((variant) => variant.url);
        media.push({
          kind: 'video',
          urls,
          poster: item.media_url_https || null
        });
      }
    });

    return media;
  }

  async function extractThreadFromDom(articleElement, tweetId) {
    try {
      await expandTwitterThread(articleElement);
    } catch (error) {
      console.warn('[Twitter] Expand thread failed:', error);
    }

    const articles = collectThreadArticles(articleElement);
    if (!articles.length) return null;

    const nodes = [];
    articles.forEach((article, index) => {
      const node = extractNodeFromArticle(article, index === 0, tweetId);
      if (node) {
        nodes.push(node);
      }
    });

    if (!nodes.length) return null;

    const deduped = new Map();
    nodes.forEach((node) => {
      const existing = deduped.get(node.id);
      if (!existing || (node.text && node.text.length > (existing.text || '').length)) {
        deduped.set(node.id, node);
      }
    });
    const uniqueNodes = Array.from(deduped.values());
    if (!uniqueNodes.length) return null;

    uniqueNodes.sort((a, b) => {
      const aTime = a.timestamp || '';
      const bTime = b.timestamp || '';
      return aTime.localeCompare(bTime);
    });

    const limitedNodes = uniqueNodes.slice(0, 12);
    limitedNodes.forEach((node, index) => {
      node.order = index;
    });

    const rootNode = limitedNodes.find((node) => node.id === tweetId) || limitedNodes[0];
    return {
      rootId: rootNode.id,
      conversationId: rootNode.conversationId || null,
      nodes: limitedNodes,
      source: 'dom'
    };
  }

  async function waitForPrimaryTwitterArticle(timeout = 8000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const article = document.querySelector('article[role="article"]');
      if (article) return article;
      await sleep(150);
    }
    return null;
  }

  async function captureThreadForBackground(tweetId) {
    const start = Date.now();
    let lastPayload = null;
    while (Date.now() - start < CONFIG.THREAD_CAPTURE_TIMEOUT) {
      const cached = buildThreadFromCache(tweetId);
      if (cached && cached.nodes && cached.nodes.length > 1) {
        cached.source = 'background-intercept';
        return cached;
      }
      const rootArticle = await waitForPrimaryTwitterArticle();
      if (rootArticle) {
        await sleep(400);
        await preloadTwitterConversation(rootArticle, { passes: 6, skipRestore: true });
        await sleep(500);
        const payload = await extractThreadFromDom(rootArticle, tweetId);
        if (payload && Array.isArray(payload.nodes) && payload.nodes.length > 1) {
          payload.source = payload.source === 'dom' ? 'background-dom' : payload.source;
          return payload;
        }
        if (payload) {
          lastPayload = payload;
        }
      } else {
        await sleep(400);
      }
    }
    if (lastPayload && lastPayload.nodes && lastPayload.nodes.length) {
      lastPayload.source = 'background-dom';
    }
    return lastPayload;
  }

  async function expandTwitterThread(articleElement, options = {}) {
    const { skipRestore = false } = options || {};
    const scrollElement = document.scrollingElement || document.documentElement;
    const originalScrollTop = scrollElement.scrollTop;
    const originalBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';

    const expandButtons = [];
    const buttonSelector = 'div[role="button"], button, a[role="link"]';
    const EXPAND_LABEL_REGEX = /(show|view|reveal).*(repl|thread|tweet)/i;

    try {
      for (let i = 0; i < 6; i++) {
        const candidates = Array.from(document.querySelectorAll(buttonSelector));
        candidates.forEach((btn) => {
          const text = (btn.textContent || '').trim();
          if (text && EXPAND_LABEL_REGEX.test(text)) {
            expandButtons.push(btn);
          }
        });
        await sleep(160);
      }

      expandButtons.forEach((btn) => {
        try {
          btn.click();
        } catch (error) { }
      });

      if (articleElement && articleElement.scrollIntoView) {
        articleElement.scrollIntoView({ block: 'center', inline: 'center', behavior: 'auto' });
      }
      await sleep(260);
    } finally {
      if (!skipRestore) {
        scrollElement.scrollTop = originalScrollTop;
      }
      document.documentElement.style.scrollBehavior = originalBehavior || '';
    }
  }

  async function preloadTwitterConversation(articleElement, options = {}) {
    const { passes = 6, skipRestore = false } = options || {};
    const scrollElement = document.scrollingElement || document.documentElement;
    const originalScrollTop = scrollElement.scrollTop;
    const originalBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';

    try {
      for (let i = 0; i < passes; i++) {
        await expandTwitterThread(articleElement, { skipRestore: true });
        scrollElement.scrollBy(0, Math.max(window.innerHeight * 0.9, 600));
        await sleep(420 + (i * 90));
        await expandTwitterThread(articleElement, { skipRestore: true });
        await sleep(220);
      }
      scrollElement.scrollTo(0, document.body.scrollHeight);
      await sleep(600);
      await expandTwitterThread(articleElement, { skipRestore: true });
    } finally {
      if (!skipRestore) {
        scrollElement.scrollTop = originalScrollTop;
      }
      document.documentElement.style.scrollBehavior = originalBehavior || '';
    }
  }

  function collectThreadArticles(rootArticle) {
    const articles = new Set();
    if (rootArticle) {
      articles.add(rootArticle);
    }

    const timelineSelectors = [
      '[aria-label^="Timeline:"]',
      '[data-testid="primaryColumn"]',
      'main[role="main"]'
    ];
    timelineSelectors.forEach((selector) => {
      const container = document.querySelector(selector);
      if (container) {
        container.querySelectorAll('article[role="article"]').forEach((article) => articles.add(article));
      }
    });

    document.querySelectorAll('article[role="article"]').forEach((article) => articles.add(article));

    return Array.from(articles);
  }

  function extractNodeFromArticle(article, isRoot, fallbackTweetId) {
    const link = article.querySelector('a[href*="/status/"]');
    const match = link && link.getAttribute('href') ? link.getAttribute('href').match(/status\/(\d+)/) : null;
    const id = match ? match[1] : (isRoot && fallbackTweetId ? fallbackTweetId : null);
    if (!id) return null;

    const handleEl = article.querySelector('div[dir="ltr"] span');
    const handle = handleEl ? handleEl.textContent : null;
    const textEl = article.querySelector('[data-testid="tweetText"]');
    const text = textEl ? textEl.innerText.trim() : '';
    const timeEl = article.querySelector('time');
    const timestamp = timeEl ? timeEl.getAttribute('datetime') : null;

    const media = [];
    const imageEls = Array.from(article.querySelectorAll('img'));
    imageEls.forEach((img) => {
      if (!img || !img.src) return;
      const alt = img.alt || '';
      const dimensions = img.width && img.height ? img.width * img.height : 0;
      if (dimensions > 40000 || alt.toLowerCase().includes('image')) {
        media.push({
          kind: 'photo',
          urls: [img.src]
        });
      }
    });

    return {
      id: String(id),
      conversationId: null,
      authorName: null,
      handle: handle || null,
      avatarUrl: null,
      timestamp,
      permalink: link ? link.href : null,
      text,
      media,
      inReplyToId: null,
      order: 0,
      source: 'dom'
    };
  }

  function formatTwitterThreadForSummary(threadPayload) {
    if (!threadPayload || !threadPayload.nodes || !threadPayload.nodes.length) {
      return '';
    }

    const lines = [];
    threadPayload.nodes.forEach((node, index) => {
      const indexLabel = index === 0 ? 'Original tweet' : `Reply ${index}`;
      const authorLabel = node.handle || node.authorName || 'Unknown user';
      let timestampText = '';
      if (node.timestamp) {
        const date = new Date(node.timestamp);
        if (!Number.isNaN(date.getTime())) {
          timestampText = date.toLocaleString();
        }
      }
      lines.push(`${indexLabel} — ${authorLabel}${timestampText ? ` (${timestampText})` : ''}`);
      if (node.text) {
        lines.push(node.text);
      }
      if (node.media && node.media.length) {
        const mediaSummary = node.media.map((item) => item.kind).join(', ');
        lines.push(`[Media: ${mediaSummary}]`);
      }
      lines.push('');
    });

    return lines.join('\n').trim();
  }

  function clearTwitterState() {
    currentTwitterArticle = null;
    currentTwitterTweetId = null;
    pendingTwitterThreadId = null;
    pendingTwitterStartedAt = 0;
  }

  function getTweetInfoFromArticle(article) {
    if (!article) return null;
    const link = article.querySelector('a[href*="/status/"]');
    if (!link) return null;
    const href = link.getAttribute('href') || '';
    const match = href.match(/status\/(\d+)/);
    if (!match) return null;
    const id = match[1];
    const displayUrl = link.href || (`https://x.com${href.startsWith('/') ? href : `/${href}`}`);
    const canonicalUrl = `https://x.com/i/status/${id}`;
    return { id, url: canonicalUrl, displayUrl };
  }

  async function processTwitterHover(article, presetInfo = null) {
    const info = presetInfo || getTweetInfoFromArticle(article);
    if (!info) {
      debugLog('[Twitter] No tweet info found for hovered article');
      return;
    }

    const { id, url, displayUrl } = info;
    const requestUrl = displayUrl || url;
    const shortUrl = getShortUrl(url);

    currentTwitterArticle = article;
    currentTwitterTweetId = id;
    currentlyProcessingUrl = url;
    processingElement = article;
    currentHoveredElement = article;
    pendingTwitterThreadId = id;
    pendingTwitterStartedAt = Date.now();

    if (displayMode === 'tooltip' || displayMode === 'both') {
      showTooltip(article, '<div style="text-align:center;padding:16px;opacity:0.75;">Capturing thread…</div>', url);
    }

    const isPermalinkView = window.location.pathname.includes('/status/');
    let threadPayload = null;

    if (isPermalinkView) {
      threadPayload = buildThreadFromCache(id);
      if (!threadPayload) {
        threadPayload = await extractThreadFromDom(article, id);
      }
    }

    if (!isPermalinkView && threadPayload && threadPayload.nodes && threadPayload.nodes.length < 2) {
      threadPayload = null;
    }

    if (!threadPayload || !threadPayload.nodes || threadPayload.nodes.length < 2) {
      if (displayMode === 'tooltip' || displayMode === 'both') {
        showTooltip(article, '<div style="text-align:center;padding:16px;opacity:0.75;">Opening conversation…</div>', url);
      }

      for (let attempt = 0; attempt < 3 && (!threadPayload || !threadPayload.nodes || threadPayload.nodes.length < 2); attempt++) {
        try {
          const response = await chrome.runtime.sendMessage({
            type: 'SCRAPE_TWITTER_THREAD',
            url,
            tweetId: id,
            requestUrl
          });

          if (response && response.status === 'ok' && response.payload && response.payload.nodes && response.payload.nodes.length) {
            threadPayload = response.payload;
            debugLog(`[Twitter] Background scrape returned ${threadPayload.nodes.length} tweets`);
            break;
          } else if (response && response.error) {
            debugLog(`[Twitter] Background scrape error: ${response.error} (attempt ${attempt + 1})`);
          }
        } catch (error) {
          debugLog('[Twitter] Background scrape failed', error);
        }
        await sleep(400 * (attempt + 1));
      }
    }

    if (!threadPayload || !threadPayload.nodes || threadPayload.nodes.length < 2) {
      if (displayMode === 'tooltip' || displayMode === 'both') {
        showTooltip(article, '<div style="padding:10px;background:#fee;border-radius:8px;">Unable to capture replies right now. Try again once the conversation loads.</div>', url);
      }
      currentlyProcessingUrl = null;
      processingElement = null;
      currentHoveredElement = null;
      clearTwitterState();
      return;
    }

    debugLog(`[Twitter] Thread captured via ${threadPayload.source || 'unknown'} with ${threadPayload.nodes.length} tweets`);
    const summaryInput = formatTwitterThreadForSummary(threadPayload);
    const leadNode = threadPayload.nodes[0];
    const title = leadNode && (leadNode.handle || leadNode.authorName)
      ? `Thread by ${leadNode.handle || leadNode.authorName}`
      : 'Twitter Thread';

    const result = await chrome.runtime.sendMessage({
      type: 'SUMMARIZE_CONTENT',
      url,
      title,
      textContent: summaryInput
    });

    const isStillCurrent = (currentlyProcessingUrl === url);
    handleSummaryResult(result, article, url, shortUrl, isStillCurrent);
    pendingTwitterThreadId = null;
    pendingTwitterStartedAt = 0;
    if (!currentHoveredElement && (displayMode === 'tooltip' || displayMode === 'both')) {
      scheduleHide(800, url);
    }
  }

  // ========================================
  // MOUSE EVENT HANDLERS (Existing)
  // ========================================

  function handleMouseOver(e) {
    if (gazeEnabled) {
      return;
    }

    const link = findLink(e.target);
    if (!link) {
      if (CONFIG.IS_TWITTER) {
        const article = e.target.closest && e.target.closest('article[role="article"]');
        if (article) {
          const info = getTweetInfoFromArticle(article);
          if (!info) return;

          ensureTwitterInterceptor();

          const isSameTweet = (currentTwitterTweetId === info.id && currentlyProcessingUrl === info.url);
          if (isSameTweet) {
            return;
          }

          if (twitterHoverTimeout) {
            clearTimeout(twitterHoverTimeout);
            twitterHoverTimeout = null;
          }

          twitterHoverTimeout = setTimeout(() => {
            twitterHoverTimeout = null;
            processTwitterHover(article, info);
          }, CONFIG.HOVER_DELAY);
          return;
        }
      }
      return;
    }

    let url = link.href;
    let tweetInfoForLink = null;
    const linkType = getLinkType(link, e.target);

    if (CONFIG.IS_TWITTER) {
      const article = link.closest && link.closest('article[role="article"]');
      if (article) {
        tweetInfoForLink = getTweetInfoFromArticle(article);
        if (tweetInfoForLink) {
          ensureTwitterInterceptor();
          const canonicalUrl = tweetInfoForLink.url;
          const linkUrlObj = (() => {
            try {
              return new URL(link.getAttribute('href') || '', window.location.origin);
            } catch (error) {
              return null;
            }
          })();
          const isAuxiliaryMediaLink = linkUrlObj ? /\/status\/[^/]+\/(photo|video|media|audio)/i.test(linkUrlObj.pathname) : false;
          if (isAuxiliaryMediaLink && (pendingTwitterThreadId === tweetInfoForLink.id || currentTwitterTweetId === tweetInfoForLink.id || currentlyProcessingUrl === canonicalUrl)) {
            return;
          }
          link.__hoverTweetInfo = tweetInfoForLink;
          link.__hoverArticle = article;
          link.__hoverCanonicalUrl = canonicalUrl;
          url = canonicalUrl;
        } else {
          delete link.__hoverTweetInfo;
          delete link.__hoverArticle;
          delete link.__hoverCanonicalUrl;
        }
      }
    }

    if (CONFIG.IS_TWITTER) {
      try {
        const parsedUrl = new URL(url, window.location.origin);
        if (isInternalTwitterLink(parsedUrl.href) && !/\/status\//.test(parsedUrl.pathname)) {
          return;
        }
      } catch (error) { }
    }

    if (CONFIG.IS_YOUTUBE) {
      try {
        const parsedUrl = new URL(url, window.location.origin);
        if (YOUTUBE_HOSTS.has(parsedUrl.hostname.toLowerCase()) && !isYouTubeVideoLink(url)) {
          return;
        }
      } catch (error) {
        return;
      }
    }

    const shortUrl = getShortUrl(url);

    if (CONFIG.IS_YOUTUBE && isYouTubeThumbnail(e.target)) {
      console.log(`🎬 YOUTUBE THUMBNAIL: "${shortUrl}" (will trigger in ${CONFIG.HOVER_DELAY}ms)`);
      try {
        const parsedHost = new URL(url, window.location.origin).hostname.toLowerCase();
        if (!YOUTUBE_HOSTS.has(parsedHost)) {
          console.log(`[YouTube] Skipping non-YouTube thumbnail host: ${parsedHost}`);
          return;
        }
      } catch (error) {
        console.warn('[YouTube] Invalid thumbnail URL, skipping');
        return;
      }

      const videoId = extractYouTubeVideoId(url);
      const canonicalUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : url;
      const hasPending = hoverTimeouts.has(canonicalUrl);
      const isProcessing = currentlyProcessingUrl === canonicalUrl;
      if (hasPending || isProcessing) {
        console.debug('[YouTube] ⏭️ Already processing/displaying this video, ignoring re-hover', {
          hasPending,
          isProcessing,
          url: canonicalUrl
        });
        return;
      }

      let thumbnailElement = e.target.closest('ytd-thumbnail');
      if (!thumbnailElement) {
        thumbnailElement = e.target.closest('ytd-video-preview') ||
          e.target.closest('ytd-playlist-thumbnail');
      }

      if (!thumbnailElement) {
        console.warn('[YouTube] Could not find thumbnail element, skipping');
        return;
      }

      const cardElement = findYouTubeCardElement(thumbnailElement) || thumbnailElement || link;
      link.__hoverAnchor = cardElement;
      thumbnailElement.__hoverAnchor = cardElement;
      link.__hoverCanonicalUrl = canonicalUrl;

      const isSwitch = currentlyProcessingUrl && currentlyProcessingUrl !== canonicalUrl;
      if (isSwitch) {
        console.debug(`[YouTube] 🔴 SWITCHING FROM ${currentlyProcessingUrl} TO ${canonicalUrl}`);
        const oldVideoId = extractYouTubeVideoId(currentlyProcessingUrl);
        chrome.runtime.sendMessage({
          action: 'ABORT_YOUTUBE_SUMMARY',
          videoId: oldVideoId,
          newVideoId: videoId
        });
      }

      const requestToken = ++currentYouTubeRequestToken;
      link.__hoverRequestToken = requestToken;

      const oldTimeout = hoverTimeouts.get(canonicalUrl);
      if (oldTimeout) {
        clearTimeout(oldTimeout.timeoutId);
        hoverTimeouts.delete(canonicalUrl);
      }

      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }

      currentHoveredElement = link;

      const hoverTimeout = setTimeout(() => {
        console.log('[YouTube] Hover timeout firing for thumbnail', canonicalUrl, {
          requestToken,
          currentToken: currentYouTubeRequestToken,
          pendingUrl: currentlyProcessingUrl
        });
        hoverTimeouts.delete(canonicalUrl);
        handleYouTubeVideoHover(cardElement, link, canonicalUrl, requestToken);
      }, CONFIG.HOVER_DELAY);

      hoverTimeouts.set(canonicalUrl, { timeoutId: hoverTimeout, requestToken });
      console.log('[YouTube] Hover timeout scheduled for thumbnail', {
        url: canonicalUrl,
        requestToken
      });
      return;
    }

    if (CONFIG.IS_YOUTUBE && isYouTubeVideoLink(url)) {
      try {
        const parsedHost = new URL(url, window.location.origin).hostname.toLowerCase();
        if (!YOUTUBE_HOSTS.has(parsedHost)) {
          return;
        }
      } catch (error) {
        return;
      }

      const videoId = extractYouTubeVideoId(url);
      if (!videoId) return;
      const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;
      link.__hoverCanonicalUrl = canonicalUrl;
      const cardElement = findYouTubeCardElement(link) || link;
      link.__hoverAnchor = cardElement;

      const hasPending = hoverTimeouts.has(canonicalUrl);
      const isProcessing = currentlyProcessingUrl === canonicalUrl;
      if (hasPending || isProcessing) {
        console.debug('[YouTube] ⏭️ Already processing/displaying this video link, ignoring re-hover', {
          hasPending,
          isProcessing,
          url: canonicalUrl
        });
        return;
      }

      const isSwitch = currentlyProcessingUrl && currentlyProcessingUrl !== canonicalUrl;
      if (isSwitch) {
        console.debug(`[YouTube] 🔴 SWITCHING FROM ${currentlyProcessingUrl} TO ${canonicalUrl}`);
        const oldVideoId = extractYouTubeVideoId(currentlyProcessingUrl);
        chrome.runtime.sendMessage({
          action: 'ABORT_YOUTUBE_SUMMARY',
          videoId: oldVideoId,
          newVideoId: videoId
        });
      }

      const requestToken = ++currentYouTubeRequestToken;
      link.__hoverRequestToken = requestToken;

      const oldTimeout = hoverTimeouts.get(canonicalUrl);
      if (oldTimeout) {
        clearTimeout(oldTimeout.timeoutId);
        hoverTimeouts.delete(canonicalUrl);
      }

      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }

      currentHoveredElement = link;

      const hoverTimeout = setTimeout(() => {
        console.log('[YouTube] Hover timeout firing for link', canonicalUrl, {
          requestToken,
          currentToken: currentYouTubeRequestToken,
          pendingUrl: currentlyProcessingUrl
        });
        hoverTimeouts.delete(canonicalUrl);
        handleYouTubeVideoHover(cardElement, link, canonicalUrl, requestToken);
      }, CONFIG.HOVER_DELAY);

      hoverTimeouts.set(canonicalUrl, { timeoutId: hoverTimeout, requestToken });
      console.log('[YouTube] Hover timeout scheduled for link', {
        url: canonicalUrl,
        requestToken
      });
      return;
    }

    if (currentlyProcessingUrl === url) {
      debugLog(`🚫 BLOCKED: ${linkType} "${shortUrl}" (already processing)`);
      return;
    }

    if (hideTimeout) {
      debugLog(`🚫 CANCEL HIDE: starting hover on "${shortUrl}"`);
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }

    debugLog(`✅ HOVER: ${linkType} "${shortUrl}" (will trigger in ${CONFIG.HOVER_DELAY}ms)`);

    currentHoveredElement = link;

    clearTimeout(currentHoverTimeout);
    currentHoverTimeout = setTimeout(() => {
      processLinkHover(link);
    }, CONFIG.HOVER_DELAY);
  }

  function handleMouseOut(e) {
    const link = findLink(e.target);
    if (!link) {
      if (CONFIG.IS_TWITTER) {
        const article = e.target.closest && e.target.closest('article[role="article"]');
        if (article) {
          const relatedArticle = e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('article[role="article"]');
          if (relatedArticle === article) {
            return;
          }

          const info = getTweetInfoFromArticle(article);
          if (info && pendingTwitterThreadId === info.id) {
            debugLog(`[Twitter] Mouseout while background pending for ${info.id}, keeping tooltip visible`);
            return;
          }

          if (twitterHoverTimeout) {
            clearTimeout(twitterHoverTimeout);
            twitterHoverTimeout = null;
          }

          if (currentlyProcessingUrl && (!info || info.id !== pendingTwitterThreadId)) {
            scheduleHide(400, currentlyProcessingUrl);
          }

          if (!info || info.id !== pendingTwitterThreadId) {
            currentTwitterArticle = null;
            currentTwitterTweetId = null;
          }
          currentHoveredElement = null;
          delete link.__hoverAnchor;
          delete link.__hoverRequestToken;
        }
      }
      return;
    }

    const url = link.__hoverCanonicalUrl || link.href;
    const anchorElement = link.__hoverAnchor;
    const tweetInfoMouseOut = link.__hoverTweetInfo || (CONFIG.IS_TWITTER ? getTweetInfoFromArticle(link.closest && link.closest('article[role="article"]')) : null);
    const shortUrl = getShortUrl(url);

    if (CONFIG.IS_YOUTUBE && isYouTubeThumbnail(e.target)) {
      const relatedTarget = e.relatedTarget;
      const thumbnailElement = e.target.closest('ytd-thumbnail') ||
        e.target.closest('ytd-video-preview') ||
        e.target.closest('ytd-playlist-thumbnail');

      if (relatedTarget && thumbnailElement && thumbnailElement.contains(relatedTarget)) {
        console.log('[YouTube] Mouseout within same thumbnail, keeping hover alive', { url });
        return;
      }

      const pendingTimeout = hoverTimeouts.get(url);
      if (pendingTimeout) {
        console.log('[YouTube] Mouseout clearing pending hover', { url, requestToken: pendingTimeout.requestToken });
        clearTimeout(pendingTimeout.timeoutId);
        hoverTimeouts.delete(url);
      }
    }

    const relatedTarget = e.relatedTarget;
    if (relatedTarget) {
      if (anchorElement && anchorElement.contains(relatedTarget)) {
        return;
      }
      if (link.contains(relatedTarget) || link === relatedTarget) {
        debugLog(`⏭️ MOUSEOUT: "${shortUrl}" (child element, ignored)`);
        return;
      }
      if (tooltip && (tooltip.contains(relatedTarget) || tooltip === relatedTarget)) {
        debugLog(`⏭️ MOUSEOUT: "${shortUrl}" (into tooltip, ignored)`);
        return;
      }
    }

    if (CONFIG.IS_TWITTER && tweetInfoMouseOut && pendingTwitterThreadId === tweetInfoMouseOut.id) {
      debugLog(`[Twitter] Mouseout ignored for pending thread ${tweetInfoMouseOut.id}`);
      return;
    }
    delete link.__hoverAnchor;
    delete link.__hoverRequestToken;

    if (currentlyProcessingUrl === url) {
      debugLog(`👋 MOUSEOUT: "${shortUrl}" (streaming active, tooltip will stay visible)`);
    } else {
      const urlDisplayTime = displayTimes.get(url) || 0;
      const timeSinceDisplay = urlDisplayTime > 0 ? Date.now() - urlDisplayTime : Infinity;

      debugLog(`[DEBUG] URL: "${shortUrl}", displayTime: ${urlDisplayTime}, timeSinceDisplay: ${timeSinceDisplay}ms`);

      if (timeSinceDisplay < CONFIG.MIN_DISPLAY_TIME && urlDisplayTime > 0) {
        const remainingTime = CONFIG.MIN_DISPLAY_TIME - timeSinceDisplay;
        debugLog(`👋 MOUSEOUT: "${shortUrl}" (content just shown, waiting ${Math.round(remainingTime)}ms before scheduling hide)`);

        setTimeout(() => {
          if (!isMouseInTooltip && !currentHoveredElement) {
            debugLog(`⏰ Protection window expired for "${shortUrl}", now scheduling hide`);
            scheduleHide(500, url);
          }
        }, remainingTime);
      } else {
        debugLog(`👋 MOUSEOUT: "${shortUrl}" (scheduling hide in 500ms, reason: ${urlDisplayTime === 0 ? 'never displayed' : `too long ago (${timeSinceDisplay}ms)`})`);
        scheduleHide(500, url);
      }
    }

    clearTimeout(currentHoverTimeout);
    currentHoverTimeout = null;

    currentHoveredElement = null;
  }

  // ========================================
  // LINK PROCESSING (Existing)
  // ========================================

  async function processLinkHover(link) {
    const url = link.__hoverCanonicalUrl || link.href;
    const shortUrl = getShortUrl(url);
    const isReddit = isRedditPostUrl(url);
    const tweetInfo = link.__hoverTweetInfo || null;
    const tweetArticle = link.__hoverArticle || (link.closest && link.closest('article[role="article"]'));

    if (CONFIG.IS_TWITTER && tweetInfo && tweetArticle) {
      await processTwitterHover(tweetArticle, tweetInfo);
      return;
    }

    if (CONFIG.IS_TWITTER) {
      try {
        const parsed = new URL(url, window.location.origin);
        if (isInternalTwitterLink(parsed.href) && !/\/status\//.test(parsed.pathname)) {
          currentlyProcessingUrl = null;
          processingElement = null;
          return;
        }
      } catch (error) {
        currentlyProcessingUrl = null;
        processingElement = null;
        return;
      }
    }

    if (currentlyProcessingUrl && currentlyProcessingUrl !== url) {
      debugLog(`🔄 SWITCHING: from "${getShortUrl(currentlyProcessingUrl)}" to "${shortUrl}"`);
    }

    currentlyProcessingUrl = url;
    processingElement = link;

    debugLog(`🔄 PROCESSING: "${shortUrl}"${isReddit ? ' [Reddit]' : ''}`);

    if (displayMode === 'tooltip' || displayMode === 'both') {
      const loadingMessage = isReddit
        ? '<div style="text-align:center;padding:20px;opacity:0.6;">Gathering Reddit discussion...</div>'
        : '<div style="text-align:center;padding:20px;opacity:0.6;">Extracting content...</div>';
      showTooltip(link, loadingMessage, url);
    }

    if (isReddit) {
      await processRedditPost(link, url, shortUrl);
      return;
    }

    const response = await chrome.runtime.sendMessage({
      type: 'FETCH_CONTENT',
      url: url
    });

    if (response.error) {
      console.error('[Content] Fetch error:', response.error);
      if (displayMode === 'tooltip' || displayMode === 'both') {
        showTooltip(link, `<div style="padding:10px;background:#fee;border-radius:8px;">Error: ${response.error}</div>`, url);
      }
      currentlyProcessingUrl = null;
      processingElement = null;
      return;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(response.html, 'text/html');
    const documentClone = doc.cloneNode(true);

    const reader = new Readability(documentClone);
    const article = reader.parse();

    let title, textContent;

    if (article && article.textContent && article.textContent.trim().length > 100) {
      title = article.title || 'Untitled';
      textContent = article.textContent;
    } else {
      const metaDesc = doc.querySelector('meta[name="description"]')?.getAttribute('content') ||
        doc.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
        'No content could be extracted from this page.';

      title = doc.title || 'Untitled';
      textContent = metaDesc;
    }

    if (displayMode === 'tooltip' || displayMode === 'both') {
      showTooltip(link, `<div style="opacity:0.6;font-style:italic;">Generating summary...</div>`, url);
    }

    const result = await chrome.runtime.sendMessage({
      type: 'SUMMARIZE_CONTENT',
      url: url,
      title: title,
      textContent: textContent
    });

    const isStillCurrent = (currentlyProcessingUrl === url);
    handleSummaryResult(result, link, url, shortUrl, isStillCurrent);
  }

  async function processRedditPost(link, url, shortUrl) {
    debugLog(`🧵 REDDIT REQUEST: "${shortUrl}"`);

    if (displayMode === 'tooltip' || displayMode === 'both') {
      showTooltip(link, '<div style="opacity:0.6;font-style:italic;">Summarizing Reddit discussion...</div>', url);
    }

    try {
      const result = await chrome.runtime.sendMessage({
        type: 'SUMMARIZE_REDDIT_POST',
        url: url
      });

      const isStillCurrent = (currentlyProcessingUrl === url);
      handleSummaryResult(result, link, url, shortUrl, isStillCurrent);
    } catch (error) {
      console.error(`[Reddit] Summary failed for "${shortUrl}":`, error);
      if (displayMode === 'tooltip' || displayMode === 'both') {
        const message = (error && error.message) ? error.message : 'Unable to summarize Reddit thread';
        showTooltip(link, `<div style="padding:10px;background:#fee;border-radius:8px;">Error: ${message}</div>`, url);
      }
      if (currentlyProcessingUrl === url) {
        currentlyProcessingUrl = null;
        processingElement = null;
      }
    }
  }

  function handleSummaryResult(result, link, url, shortUrl, isStillCurrent) {
    if (!isStillCurrent && CONFIG.IS_TWITTER && pendingTwitterThreadId) {
      pendingTwitterThreadId = null;
      pendingTwitterStartedAt = 0;
    }

    if (!result || !result.status) {
      debugLog(`❌ INVALID RESULT: "${shortUrl}"`);
      if (displayMode === 'tooltip' || displayMode === 'both') {
        showTooltip(link, '<div style="padding:10px;background:#fee;border-radius:8px;">Error: No summary result returned.</div>', url);
      }
      if (isStillCurrent) {
        currentlyProcessingUrl = null;
        processingElement = null;
        clearTwitterState();
      }
      return;
    }

    if (result.status === 'duplicate') {
      debugLog(`❌ DUPLICATE: "${shortUrl}" (ignoring)`);
      if (isStillCurrent) {
        currentlyProcessingUrl = null;
        processingElement = null;
        clearTwitterState();
      }
      return;
    }

    if (result.status === 'aborted') {
      debugLog(`❌ ABORTED: "${shortUrl}" (was canceled, ${isStillCurrent ? 'clearing' : 'already moved on'})`);
      return;
    }

    if (result.status === 'error') {
      const errorMessage = result.error || result.message || 'Unknown error';
      console.error(`❌ ERROR: "${shortUrl}" - ${errorMessage}`);
      if (displayMode === 'tooltip' || (displayMode === 'both' && isStillCurrent)) {
        showTooltip(link, `<div style="padding:10px;background:#fee;border-radius:8px;">Error: ${errorMessage}</div>`, url);
      }
      if (isStillCurrent) {
        currentlyProcessingUrl = null;
        processingElement = null;
        clearTwitterState();
      }
      return;
    }

    if (result.status === 'complete' && result.cached) {
      debugLog(`💾 CACHED: "${shortUrl}" (instant display, still current: ${isStillCurrent})`);

      if (isStillCurrent) {
        const formattedSummary = formatAISummary(result.summary);

        if (displayMode === 'tooltip' || displayMode === 'both') {
          showTooltip(link, formattedSummary, url);
        }

        if (displayMode === 'panel' || displayMode === 'both') {
          chrome.runtime.sendMessage({
            type: 'DISPLAY_CACHED_SUMMARY',
            title: result.title,
            summary: formattedSummary
          }).catch(() => { });
        }

        currentlyProcessingUrl = null;
        processingElement = null;
        clearTwitterState();
        debugLog(`✅ COMPLETE: "${shortUrl}" (ready for next hover)`);
      } else {
        debugLog(`⚠️ STALE CACHED: "${shortUrl}" (user moved on, ignoring)`);
      }
      return;
    }

    if (isStillCurrent) {
      debugLog(`📡 STREAMING: "${shortUrl}" (will receive updates)`);
    } else {
      debugLog(`⚠️ STALE STREAMING: "${shortUrl}" (user moved on, ignoring)`);
    }
  }

  // ========================================
  // YOUTUBE FUNCTIONS (Existing)
  // ========================================

  function waitForYouTubeCaptions(videoId) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const cleanup = () => {
        if (settled) return;
        settled = true;
        window.removeEventListener('youtube-captions-ready', captionListener);
        clearTimeout(timeout);
      };
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('Timeout waiting for captions'));
      }, 5000);
      const captionListener = (event) => {
        if (event.detail && event.detail.videoId === videoId) {
          cleanup();
          resolve();
        }
      };
      window.addEventListener('youtube-captions-ready', captionListener);
      if (window.hasYouTubeCaptions) {
        window.hasYouTubeCaptions(videoId)
          .then((hasCaptions) => {
            if (hasCaptions) {
              cleanup();
              resolve();
            }
          })
          .catch(() => { });
      }
    });
  }

  async function handleYouTubeVideoHover(anchorElement, linkElement, url, requestToken) {
    console.log('[YouTube] Hover handler start', {
      url,
      requestToken,
      currentToken: currentYouTubeRequestToken,
      currentlyProcessingUrl
    });

    if (requestToken !== currentYouTubeRequestToken) {
      console.warn('[YouTube] Stale hover request, ignoring', {
        requestToken,
        currentToken: currentYouTubeRequestToken
      });
      return;
    }

    const videoId = extractYouTubeVideoId(url);
    if (!videoId) {
      console.warn('[YouTube] Could not extract video ID from:', url);
      currentlyProcessingUrl = null;
      return;
    }

    const tooltipAnchor = anchorElement || linkElement;
    currentlyProcessingUrl = url;
    processingElement = linkElement || tooltipAnchor;
    currentHoveredElement = tooltipAnchor;
    const tooltipOptions = { placement: 'right' };

    if (displayMode === 'tooltip' || displayMode === 'both') {
      showTooltip(tooltipAnchor, '<div style="text-align:center;padding:16px;opacity:0.75;">Capturing captions…</div>', url, tooltipOptions);
    }

    const summaryTimeout = setTimeout(() => {
      if (currentlyProcessingUrl === url) {
        chrome.runtime.sendMessage({
          action: 'ABORT_YOUTUBE_SUMMARY',
          videoId
        });
        if (displayMode === 'tooltip' || displayMode === 'both') {
          showTooltip(tooltipAnchor, '<div style="padding:10px;background:#fee;border-radius:8px;">Summary timed out. Try hovering again.</div>', url, tooltipOptions);
        }
        currentlyProcessingUrl = null;
        if (linkElement) {
          delete linkElement.__hoverAnchor;
          delete linkElement.__hoverRequestToken;
        }
      }
    }, CONFIG.YOUTUBE_SUMMARY_TIMEOUT);

    try {
      await waitForYouTubeCaptions(videoId);
      console.log('[YouTube] Captions ready before summary request:', videoId);
    } catch (error) {
      console.warn('[YouTube] Captions did not arrive in time, continuing anyway:', videoId, error && error.message ? error.message : error);
    }

    if (displayMode === 'tooltip' || displayMode === 'both') {
      showTooltip(tooltipAnchor, '<div style="text-align:center;padding:16px;opacity:0.75;">Generating summary…</div>', url, tooltipOptions);
    }

    if (requestToken !== currentYouTubeRequestToken) {
      console.warn('[YouTube] Request token changed after caption wait, aborting send', {
        requestToken,
        currentToken: currentYouTubeRequestToken
      });
      return;
    }

    console.log('[YouTube] Sending GET_YOUTUBE_SUMMARY', { videoId, url, requestToken });

    chrome.runtime.sendMessage({
      action: 'GET_YOUTUBE_SUMMARY',
      videoId,
      url
    }, (response) => {
      clearTimeout(summaryTimeout);

      if (requestToken !== currentYouTubeRequestToken) {
        console.warn('[YouTube] Request token changed before response handling', {
          requestToken,
          currentToken: currentYouTubeRequestToken
        });
        return;
      }

      if (chrome.runtime.lastError) {
        console.error('[YouTube] Runtime error:', chrome.runtime.lastError);
        if (displayMode === 'tooltip' || displayMode === 'both') {
          showTooltip(tooltipAnchor, '<div style="padding:10px;background:#fee;border-radius:8px;">Error generating summary.</div>', url, tooltipOptions);
        }
        currentlyProcessingUrl = null;
        return;
      }

      if (!response) {
        console.warn('[YouTube] Empty response from background');
        currentlyProcessingUrl = null;
        return;
      }

      console.log('[YouTube] Summary response payload:', response);

      if (response.status === 'complete') {
        const summary = response.summary || 'No summary generated';
        const formatted = formatAISummary(summary);
        showTooltip(tooltipAnchor, formatted, url, tooltipOptions);

        if (displayMode === 'sidepanel' || displayMode === 'both') {
          chrome.runtime.sendMessage({
            action: 'DISPLAY_CACHED_SUMMARY',
            summary,
            url
          });
        }

        currentlyProcessingUrl = null;
        processingElement = null;
        if (linkElement) {
          delete linkElement.__hoverAnchor;
          delete linkElement.__hoverRequestToken;
        }
        return;
      }

      if (response.status === 'streaming') {
        return;
      }

      if (response.error) {
        const errorMsg = response.error === 'NO_CAPTIONS'
          ? 'No captions available for this video yet.'
          : `Error: ${response.error}`;
        if (displayMode === 'tooltip' || displayMode === 'both') {
          showTooltip(tooltipAnchor, `<div style="padding:10px;background:#fee;border-radius:8px;">${errorMsg}</div>`, url, tooltipOptions);
        }
        currentlyProcessingUrl = null;
        processingElement = null;
        if (linkElement) {
          delete linkElement.__hoverAnchor;
          delete linkElement.__hoverRequestToken;
        }
      }
    });
  }

  // ========================================
  // MESSAGE HANDLERS (Existing + Voice)
  // ========================================

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'CAPTURE_TWITTER_THREAD') {
      if (!CONFIG.IS_TWITTER) {
        sendResponse({ status: 'error', error: 'NOT_TWITTER_CONTEXT' });
        return false;
      }
      (async () => {
        try {
          const payload = await captureThreadForBackground(message.tweetId);
          if (payload && payload.nodes && payload.nodes.length) {
            sendResponse({ status: 'ok', payload });
          } else {
            sendResponse({ status: 'error', error: 'NO_THREAD_DATA' });
          }
        } catch (error) {
          sendResponse({ status: 'error', error: error ? error.message : 'CAPTURE_FAILED' });
        }
      })();
      return true;
    }

    if (message.type === 'STREAMING_UPDATE') {
      const isValid = message.url === currentlyProcessingUrl;
      if (!isValid) {
        if (CONFIG.IS_YOUTUBE) {
          console.debug(`[YouTube] REJECTED stale update for: ${message.url}`);
        }
        return;
      }
      updateTooltipContent(message.content, message.url);
    }

    if (message.type === 'PROCESSING_STATUS') {
      if (message.status === 'started' && currentHoveredElement) {
        if (displayMode === 'tooltip' || displayMode === 'both') {
          showTooltip(currentHoveredElement, `<div style="opacity:0.6;font-style:italic;">Generating summary...</div>`, message.url);
        }
      }
    }

    if (message.type === 'DISPLAY_MODE_CHANGED') {
      displayMode = message.displayMode;
      debugLog('[Content] Display mode updated:', displayMode);
      if (displayMode === 'panel') {
        hideTooltip();
      }
    }

    if (message.type === 'GAZE_ENABLED_CHANGED') {
      gazeEnabled = message.gazeEnabled;
      debugLog('[Content] Gaze enabled updated:', gazeEnabled);
    }

    if (message.type === 'VOICE_ENABLED_CHANGED') {
      isVoiceEnabled = message.voiceEnabled;
      debugLog('[Content] Voice enabled updated (now managed by sidepanel):', isVoiceEnabled);
    }

    if (message.type === 'TRIGGER_CALIBRATION') {
      debugLog('[Content] Triggering head calibration');
      const event = new KeyboardEvent('keydown', {
        key: 'h',
        code: 'KeyH',
        altKey: true,
        bubbles: true,
        cancelable: true
      });
      document.dispatchEvent(event);
    }

    if (message.type === 'TRIGGER_MOUTH_CALIBRATION') {
      debugLog('[Content] Triggering mouth calibration');
      const event = new KeyboardEvent('keydown', {
        key: 'm',
        code: 'KeyM',
        altKey: true,
        bubbles: true,
        cancelable: true
      });
      document.dispatchEvent(event);
    }

    if (message.type === 'PING') {
      sendResponse({ status: 'ok' });
      return true;
    }

    /**
     * EXECUTE VOICE COMMAND
     * Uses the new modular command system
     */
    if (message.type === 'EXECUTE_VOICE_COMMAND') {
      const command = message.command;
      if (!command) return;

      console.log('[Content] Executing delegated voice command:', command);

      // Use the new command system
      const result = executeVoiceCommand(command);

      if (result) {
        sendResponse({ status: 'ok', command: result });
      } else {
        console.log('[Voice] Unknown command:', command);
        sendResponse({ status: 'unknown', command: command });
      }
      return true;
    }

    /**
     * GET VOICE COMMANDS - For debugging/help
     */
    if (message.type === 'GET_VOICE_COMMANDS') {
      const categories = message.category ? getCommandsByCategory(message.category) : VoiceCommandMap;
      const commandList = Object.entries(categories).map(([key, def]) => ({
        key,
        description: def.description,
        category: def.category,
        patterns: def.patterns.map(p => p.source || p)
      }));
      sendResponse({ status: 'ok', commands: commandList });
      return true;
    }

    /**
     * EXECUTE COMMAND BY KEY - For direct command execution
     */
    if (message.type === 'EXECUTE_COMMAND_BY_KEY') {
      const commandKey = message.commandKey;
      if (!commandKey || !VoiceCommandMap[commandKey]) {
        sendResponse({ status: 'error', message: 'Command not found' });
        return true;
      }

      try {
        VoiceCommandMap[commandKey].action();
        sendResponse({ status: 'ok', command: commandKey });
      } catch (error) {
        sendResponse({ status: 'error', message: error.message });
      }
      return true;
    }
  });

  // ========================================
  // MOUTH CALIBRATION (Existing)
  // ========================================

  (function () {
    'use strict';

    const MOUTH_CAL_STORAGE_KEY = 'mouthCalV1';
    const MIN_SAMPLES = 10;

    let calUI = null;
    let currentStep = 'idle';
    let samples = [];

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
      `;

      const panel = document.createElement('div');
      panel.style.cssText = `
        background: #2a2a2a;
        border-radius: 16px;
        padding: 48px;
        max-width: 600px;
        text-align: center;
        color: white;
        box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      `;

      panel.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 16px;">👄</div>
        <h2 style="margin: 0 0 16px 0; font-size: 28px; font-weight: 600;">Mouth Click Calibration</h2>
        <p id="mouth-cal-instructions" style="font-size: 18px; line-height: 1.6; margin: 0 0 32px 0; color: #ccc;">
          Click "Start" to begin calibrating mouth-open detection.<br>
          You'll capture your mouth in two positions: open and closed.
        </p>
        <div id="mouth-cal-progress" style="display: none; margin-bottom: 24px;">
          <div style="font-size: 64px; font-weight: bold; color: #8b5a3c;" id="mouth-cal-count">0</div>
          <div style="font-size: 14px; color: #999;">samples collected</div>
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
        ">Start Calibration</button>
        <div style="margin-top: 24px; font-size: 14px; color: #999;">Press ESC to cancel</div>
      `;

      overlay.appendChild(panel);
      return overlay;
    }

    function updateUI(step, count = 0) {
      const instructions = document.getElementById('mouth-cal-instructions');
      const progress = document.getElementById('mouth-cal-progress');
      const countEl = document.getElementById('mouth-cal-count');
      const button = document.getElementById('mouth-cal-action');

      if (!instructions || !button) return;

      countEl.textContent = count;

      if (step === 'start') {
        instructions.innerHTML = `
          <strong style="font-size: 24px; color: #8b5a3c;">Step 1: Open Mouth</strong><br><br>
          OPEN your mouth wide (like saying "AAAH")<br>
          and press SPACE or click the button below.
        `;
        progress.style.display = 'block';
        button.textContent = 'Capture Open Mouth';
        button.style.background = '#8b5a3c';
      } else if (step === 'open-collecting') {
        instructions.innerHTML = `
          <strong style="font-size: 24px; color: #4CAF50;">Keep mouth OPEN!</strong><br><br>
          Collecting samples... ${count}/${MIN_SAMPLES}
        `;
        button.textContent = 'Collecting...';
        button.disabled = true;
        button.style.background = '#666';
        button.style.cursor = 'not-allowed';
      } else if (step === 'open-done') {
        instructions.innerHTML = `
          <strong style="font-size: 24px; color: #4CAF50;">✓ Open mouth captured!</strong><br><br>
          <strong style="font-size: 24px; color: #8b5a3c;">Step 2: Close Mouth</strong><br><br>
          CLOSE your mouth normally (relaxed)<br>
          and press SPACE or click the button below.
        `;
        button.textContent = 'Capture Closed Mouth';
        button.disabled = false;
        button.style.background = '#8b5a3c';
        button.style.cursor = 'pointer';
      } else if (step === 'closed-collecting') {
        instructions.innerHTML = `
          <strong style="font-size: 24px; color: #4CAF50;">Keep mouth CLOSED!</strong><br><br>
          Collecting samples... ${count}/${MIN_SAMPLES}
        `;
        button.textContent = 'Collecting...';
        button.disabled = true;
        button.style.background = '#666';
        button.style.cursor = 'not-allowed';
      } else if (step === 'done') {
        instructions.innerHTML = `
          <strong style="font-size: 32px; color: #4CAF50;">🎉 Calibration Complete!</strong><br><br>
          Mouth-open clicking is now ready to use.<br>
          Open your mouth wide to trigger clicks!
        `;
        progress.style.display = 'none';
        button.textContent = 'Done';
        button.style.background = '#4CAF50';
      }
    }

    function collectSamples(type) {
      samples = [];
      currentStep = `${type}-collecting`;
      updateUI(currentStep, 0);

      const interval = setInterval(() => {
        const ratio = window.__lastMouthRatio || 0;
        if (ratio > 0) {
          samples.push(ratio);
          updateUI(currentStep, samples.length);

          if (samples.length >= MIN_SAMPLES) {
            clearInterval(interval);
            const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
            console.log(`[MouthCal] ${type} average: ${avg.toFixed(3)}`);

            if (type === 'open') {
              window.__mouthCalOpen = avg;
              currentStep = 'open-done';
              updateUI(currentStep);
            } else {
              window.__mouthCalClosed = avg;
              finishCalibration();
            }
          }
        }
      }, 100);

      window.__mouthCalInterval = interval;
    }

    function finishCalibration() {
      const openRatio = window.__mouthCalOpen;
      const closedRatio = window.__mouthCalClosed;

      const threshold = closedRatio + (openRatio - closedRatio) * 0.5;

      const calibration = {
        version: 1,
        closedRatio,
        openRatio,
        threshold,
        timestamp: Date.now()
      };

      console.log('[MouthCal] Calibration complete:', calibration);

      chrome.storage.local.set({ [MOUTH_CAL_STORAGE_KEY]: calibration }, () => {
        console.log('[MouthCal] Saved to storage');
      });

      window.dispatchEvent(new CustomEvent('mouth-cal:complete', {
        detail: calibration
      }));

      currentStep = 'done';
      updateUI(currentStep);

      setTimeout(() => {
        closeCalibration();
      }, 2000);
    }

    function startCalibration() {
      console.log('[MouthCal] Starting mouth calibration');
      window.__gazeMouthCalActive = true;

      calUI = createCalibrationUI();
      document.body.appendChild(calUI);

      const button = document.getElementById('mouth-cal-action');

      button.addEventListener('click', () => {
        if (currentStep === 'idle' || currentStep === 'start') {
          currentStep = 'open';
          collectSamples('open');
        } else if (currentStep === 'open-done') {
          currentStep = 'closed';
          collectSamples('closed');
        } else if (currentStep === 'done') {
          closeCalibration();
        }
      });

      const handleKeydown = (e) => {
        if (e.code === 'Space') {
          e.preventDefault();
          button.click();
        } else if (e.code === 'Escape') {
          e.preventDefault();
          closeCalibration();
        }
      };

      document.addEventListener('keydown', handleKeydown);
      calUI.__keydownHandler = handleKeydown;

      currentStep = 'start';
      updateUI(currentStep);
    }

    function closeCalibration() {
      console.log('[MouthCal] Closing calibration');
      window.__gazeMouthCalActive = false;

      if (window.__mouthCalInterval) {
        clearInterval(window.__mouthCalInterval);
        window.__mouthCalInterval = null;
      }

      if (calUI) {
        if (calUI.__keydownHandler) {
          document.removeEventListener('keydown', calUI.__keydownHandler);
        }
        calUI.remove();
        calUI = null;
      }

      currentStep = 'idle';
      samples = [];
    }

    window.startMouthCalibration = startCalibration;

    window.addEventListener('mouth-cal:start', startCalibration);

    document.addEventListener('keydown', (event) => {
      const code = event.code || '';
      if (event.altKey && !event.ctrlKey && !event.metaKey && code === 'KeyM') {
        event.preventDefault();
        event.stopPropagation();
        startCalibration();
      }
    }, true);

    console.log('[MouthCal] Mouth calibration module loaded. Press Alt+M to calibrate.');
  })();

  // ========================================
  // GAZE STATUS EVENT (Existing)
  // ========================================

  window.addEventListener('gaze:status', (event) => {
    if (event.detail) {
      chrome.runtime.sendMessage({
        type: 'GAZE_STATUS',
        phase: event.detail.phase,
        note: event.detail.note
      }).catch(() => { });
    }
  });

  // ========================================
  // INITIALIZATION (Existing)
  // ========================================

  chrome.storage.local.get(['displayMode', 'gazeEnabled', 'voiceEnabled'], (result) => {
    if (result.displayMode) {
      displayMode = result.displayMode;
      debugLog('[Content] Initial display mode:', displayMode);
    }
    if (typeof result.gazeEnabled === 'boolean') {
      gazeEnabled = result.gazeEnabled;
      debugLog('[Content] Initial gaze enabled:', gazeEnabled);
    }
    if (typeof result.voiceEnabled === 'boolean') {
      isVoiceEnabled = result.voiceEnabled;
      debugLog('[Content] Initial voice enabled:', isVoiceEnabled);
    }
  });

  if (CONFIG.IS_TWITTER) {
    ensureTwitterInterceptor();
  }

  document.body.addEventListener('mouseover', handleMouseOver, true);
  document.body.addEventListener('mouseout', handleMouseOut, true);

  debugLog('[Content] Hover link extension initialized with modular voice commands');

  // ========================================
  // EXPOSE VOICE COMMAND API FOR DEBUGGING
  // ========================================

  window.__voiceCommands = {
    map: VoiceCommandMap,
    execute: executeVoiceCommand,
    getByCategory: getCommandsByCategory,
    getInstant: getInstantCommands,
    getDescription: getCommandDescription,
    history: () => voiceCommandHistory
  };

  console.log('[Voice] Commands loaded. Use __voiceCommands in console for debugging.');
  console.log('[Voice] Available commands:', Object.keys(VoiceCommandMap).length);

})();