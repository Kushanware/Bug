// Configure the side panel to open when the extension's action icon in the toolbar is clicked
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// Automatically inject content.js into all matching open tabs when the extension starts/reloads
chrome.runtime.onInstalled.addListener(async () => {
  const manifest = chrome.runtime.getManifest();
  const contentScripts = manifest.content_scripts;
  if (!contentScripts) return;

  for (const scriptGroup of contentScripts) {
    try {
      const tabs = await chrome.tabs.query({ url: scriptGroup.matches });
      for (const tab of tabs) {
        // Skip restricted browser URLs (like chrome://, chrome-extension://)
        if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
          continue;
        }
        
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: scriptGroup.js
        }).catch(err => {
          console.warn(`Failed to inject script into tab ${tab.id}:`, err);
        });
      }
    } catch (e) {
      console.error("Failed to query tabs for script injection:", e);
    }
  }
});
