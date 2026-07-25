document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('request-btn');
  const status = document.getElementById('status');

  btn.addEventListener('click', async () => {
    try {
      btn.disabled = true;
      btn.textContent = 'Requesting...';
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Stop the tracks immediately, we just needed the permission
      stream.getTracks().forEach(track => track.stop());
      
      status.textContent = 'Permission granted! You can close this tab and try the Voice Commands in the Sidepanel again.';
      status.className = 'success';
      btn.style.display = 'none';
      
      // Attempt to save setting
      chrome.storage.local.set({ voiceEnabled: true });
      
    } catch (err) {
      console.error(err);
      status.textContent = 'Permission denied. You may need to click the lock icon in the URL bar to allow it.';
      status.className = 'error';
      btn.disabled = false;
      btn.textContent = 'Try Again';
    }
  });
});
