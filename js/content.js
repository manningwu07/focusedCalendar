// Read all text content from the webpage if AI Tab blockers is on
(async () => {
  const options = await new Promise((resolve) => {
    chrome.storage.sync.get({
      blacklist: [],
      currentBlocks: [],
      aiOn: false,
      timeTrack: {
        websiteName: [],
        websiteTime: [],
        categoryName: [],
        categoryTime: []
      }
    }, resolve);
  });
  const aiOn = options.aiOn;
  if (aiOn) {
    // Read all text content from the webpage
    const allText = Array.from(document.querySelectorAll('body p, body div, body span, body li, body td, body th, body h1, body h2, body h3, body h4, body h5, body h6'))
      .filter(el => el.tagName.toLowerCase() !== 'script' && el.children.length === 0) // Exclude script elements and elements with child nodes
      .map(el => el.textContent.trim())
      .filter(text => {
        const words = text.split(/\s+/);
        return words.length >= 25; // Filter out text with less than 25 words for memory reasons (as long as GPT can have a vibe of what the website is about, thats all that matters)
      })
      .join('\n');

    // Send content to background script
    chrome.runtime.sendMessage({ content: allText });
  }
})();
