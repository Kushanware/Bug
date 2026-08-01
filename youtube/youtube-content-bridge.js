// /**
//  * YouTube Content Bridge (Content Script)
//  * Bridges between page context (caption handler) and extension (content.js)
//  * Only runs on YouTube.com
//  */

// (function() {
//   'use strict';
  
//   console.log('[YouTube Bridge] Initializing...');
  
//   // Inject the caption handler into page context
//   const scriptUrl = chrome.runtime.getURL('youtube/youtube-caption-handler.js');
//   const script = document.createElement('script');
//   script.src = scriptUrl;
//   script.onload = () => {
//     console.log('[YouTube Bridge] Caption handler injected');
//     script.remove();
//   };
//   script.onerror = (e) => {
//     console.error('[YouTube Bridge] Failed to load handler:', e);
//   };
//   (document.head || document.documentElement).appendChild(script);
  
//   // Listen for caption-ready events from page context
//   window.addEventListener('youtube-captions-ready', (event) => {
//     const { videoId, captionCount } = event.detail;
//     console.log(`[YouTube Bridge] Captions ready for ${videoId}: ${captionCount} captions`);
    
//     // Notify our content.js that captions are available
//     window.dispatchEvent(new CustomEvent('yt-captions-available', {
//       detail: { videoId, captionCount }
//     }));
//   });
  
//   // Use postMessage to communicate with page context
//   // Content scripts can't directly access page context variables
  
//   const pendingCaptionRequests = new Map(); // requestId -> {resolve, reject}
//   let requestIdCounter = 0;
  
//   // Listen for responses from page context
//   window.addEventListener('message', (event) => {
//     // Only accept messages from same origin
//     if (event.source !== window) return;
    
//     if (event.data.type === 'YT_CAPTIONS_RESPONSE') {
//       const { requestId, success, data, videoId } = event.data;
//       const pending = pendingCaptionRequests.get(requestId);
      
//       if (pending) {
//         pendingCaptionRequests.delete(requestId);
//         if (success) {
//           console.log('[YouTube Bridge] Received captions for:', videoId);
//           pending.resolve(data);
//         } else {
//           console.warn('[YouTube Bridge] No captions for:', videoId);
//           pending.reject(new Error('NO_CAPTIONS'));
//         }
//       }
//     }
//   });
  
//   // Function to request captions from page context
//   function getCaptionsFromPage(videoId) {
//     return new Promise((resolve, reject) => {
//       const requestId = ++requestIdCounter;
//       pendingCaptionRequests.set(requestId, { resolve, reject });
      
//       // Send request to page context
//       window.postMessage({
//         type: 'YT_GET_CAPTIONS',
//         requestId: requestId,
//         videoId: videoId
//       }, '*');
      
//       // Timeout after 1 second
//       setTimeout(() => {
//         if (pendingCaptionRequests.has(requestId)) {
//           pendingCaptionRequests.delete(requestId);
//           reject(new Error('TIMEOUT'));
//         }
//       }, 1000);
//     });
//   }
  
//   // Expose function for content.js
//   window.getYouTubeCaptions = async function(videoId) {
//     try {
//       return await getCaptionsFromPage(videoId);
//     } catch (error) {
//       return null;
//     }
//   };
  
//   window.hasYouTubeCaptions = async function(videoId) {
//     try {
//       const captions = await getCaptionsFromPage(videoId);
//       return captions !== null;
//     } catch (error) {
//       return false;
//     }
//   };
  
//   // Listen for messages from background.js
//   chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//     if (message.action === 'GET_YOUTUBE_CAPTIONS') {
//       const videoId = message.videoId;
//       console.log('[YouTube Bridge] Caption request for:', videoId);
      
//       // Request captions from page context
//       getCaptionsFromPage(videoId)
//         .then(captions => {
//           console.log('[YouTube Bridge] Captions found!');
//           sendResponse({
//             success: true,
//             data: captions,
//             videoId: videoId
//           });
//         })
//         .catch(error => {
//           console.warn('[YouTube Bridge] Failed to get captions:', error.message);
//           sendResponse({
//             success: false,
//             error: error.message,
//             videoId: videoId
//           });
//         });
      
//       return true; // Async response
//     }
//   });
  
//   console.log('[YouTube Bridge] Ready!');
// })();

// ========================================
// FIXED: YOUTUBE CAPTION BRIDGE WITH RETRY LOGIC
// ========================================

(function() {
  'use strict';

  // Track active caption requests
  const activeRequests = new Map();
  let requestCounter = 0;

  // Listen for caption requests
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'GET_YOUTUBE_CAPTIONS') {
      const videoId = message.videoId;
      const requestId = ++requestCounter;
      
      console.log(`[YouTube Bridge] 📥 Caption request ${requestId} for:`, videoId);

      // Check if already fetching
      if (activeRequests.has(videoId)) {
        console.log(`[YouTube Bridge] ⏳ Already fetching captions for:`, videoId);
        // Return existing promise
        activeRequests.get(videoId).then(sendResponse);
        return true;
      }

      // Create new request
      const promise = new Promise((resolve) => {
        const maxAttempts = 3;
        let attempt = 0;

        function tryFetchCaptions() {
          attempt++;
          console.log(`[YouTube Bridge] 🔄 Attempt ${attempt}/${maxAttempts} for:`, videoId);

          // Check if video element exists
          const video = document.querySelector('video');
          if (!video) {
            console.log(`[YouTube Bridge] ❌ No video element found for:`, videoId);
            if (attempt < maxAttempts) {
              setTimeout(tryFetchCaptions, 1000 * attempt);
            } else {
              resolve({ success: false, error: 'NO_VIDEO_ELEMENT' });
            }
            return;
          }

          // Check if captions are available
          const captions = getCaptionsFromDOM(videoId);
          if (captions) {
            console.log(`[YouTube Bridge] ✅ Captions found for:`, videoId, captions.length, 'segments');
            resolve({ success: true, data: captions });
            return;
          }

          // Try to trigger caption loading
          triggerCaptionLoading(videoId);

          // Wait for captions
          let waitCount = 0;
          const maxWait = 10; // 5 seconds total
          const checkCaptions = setInterval(() => {
            waitCount++;
            const captionsCheck = getCaptionsFromDOM(videoId);
            if (captionsCheck) {
              clearInterval(checkCaptions);
              console.log(`[YouTube Bridge] ✅ Captions loaded after ${waitCount * 500}ms for:`, videoId);
              resolve({ success: true, data: captionsCheck });
              return;
            }
            if (waitCount >= maxWait) {
              clearInterval(checkCaptions);
              console.log(`[YouTube Bridge] ⏰ Caption wait timeout for:`, videoId);
              if (attempt < maxAttempts) {
                setTimeout(tryFetchCaptions, 1000 * attempt);
              } else {
                resolve({ success: false, error: 'NO_CAPTIONS' });
              }
            }
          }, 500);
        }

        tryFetchCaptions();
      });

      activeRequests.set(videoId, promise);
      promise.finally(() => {
        activeRequests.delete(videoId);
      });

      promise.then(sendResponse);
      return true;
    }
  });

  function getCaptionsFromDOM(videoId) {
    // Try to get captions from YouTube's internal data
    try {
      // Method 1: Check for caption tracks in video data
      const videoData = getVideoData();
      if (videoData && videoData.captions) {
        return videoData.captions;
      }

      // Method 2: Check DOM for caption elements
      const captionElements = document.querySelectorAll('.ytp-caption-segment');
      if (captionElements.length > 0) {
        const captions = Array.from(captionElements).map(el => ({
          text: el.textContent,
          start: parseFloat(el.dataset.start) || 0,
          duration: parseFloat(el.dataset.dur) || 0
        }));
        return { captions, text: captions.map(c => c.text).join(' ') };
      }

      // Method 3: Check for caption data in page source
      const captionData = extractCaptionDataFromPage();
      if (captionData) {
        return captionData;
      }
    } catch (error) {
      console.warn('[YouTube Bridge] Error getting captions:', error);
    }

    return null;
  }

  function getVideoData() {
    try {
      // Check for ytInitialPlayerResponse
      const playerResponse = window.ytInitialPlayerResponse;
      if (playerResponse && playerResponse.captions) {
        const captionTracks = playerResponse.captions.playerCaptionsTracklistRenderer?.captionTracks;
        if (captionTracks && captionTracks.length > 0) {
          // Parse caption tracks
          return parseCaptionTracks(captionTracks);
        }
      }

      // Check for ytplayer config
      const playerConfig = window.ytplayer?.config;
      if (playerConfig && playerConfig.args?.player_response) {
        const response = JSON.parse(playerConfig.args.player_response);
        if (response.captions?.playerCaptionsTracklistRenderer?.captionTracks) {
          return parseCaptionTracks(response.captions.playerCaptionsTracklistRenderer.captionTracks);
        }
      }
    } catch (error) {
      console.warn('[YouTube Bridge] Error getting video data:', error);
    }
    return null;
  }

  function parseCaptionTracks(tracks) {
    // Prefer English captions
    const englishTrack = tracks.find(t => t.languageCode === 'en' || t.vssId?.startsWith('.en'));
    const track = englishTrack || tracks[0];
    
    if (track && track.baseUrl) {
      console.log('[YouTube Bridge] Found caption track:', track.languageCode || track.vssId);
      // Return track URL for fetching
      return { trackUrl: track.baseUrl, language: track.languageCode || 'en' };
    }
    return null;
  }

  function extractCaptionDataFromPage() {
    try {
      // Check for caption data in script tags
      const scripts = document.querySelectorAll('script');
      for (const script of scripts) {
        const content = script.textContent;
        if (content && content.includes('captionTracks')) {
          const match = content.match(/"captionTracks":\s*(\[.*?\])/s);
          if (match) {
            try {
              const tracks = JSON.parse(match[1]);
              if (tracks.length > 0) {
                return parseCaptionTracks(tracks);
              }
            } catch (e) {}
          }
        }
      }
    } catch (error) {
      console.warn('[YouTube Bridge] Error extracting caption data:', error);
    }
    return null;
  }

  function triggerCaptionLoading(videoId) {
    try {
      // Trigger caption loading by interacting with the player
      const video = document.querySelector('video');
      if (video) {
        // Try to enable captions
        const captionButton = document.querySelector('.ytp-subtitles-button');
        if (captionButton && !captionButton.classList.contains('ytp-subtitles-button-active')) {
          captionButton.click();
          setTimeout(() => {
            if (captionButton.classList.contains('ytp-subtitles-button-active')) {
              captionButton.click(); // Toggle off if not needed
            }
          }, 1000);
        }
      }
    } catch (error) {
      console.warn('[YouTube Bridge] Error triggering caption loading:', error);
    }
  }

  console.log('[YouTube Bridge] ✅ YouTube caption bridge loaded with retry logic');
})();