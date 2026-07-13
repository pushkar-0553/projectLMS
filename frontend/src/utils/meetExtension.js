// Google Meet Browser Extension for Automatic Participant Extraction
// This would be installed as a browser extension

const MeetExtension = {
  // Initialize the extension
  init() {
    this.createExtractionUI();
    this.startMonitoring();
  },

  // Create extraction UI in Meet
  createExtractionUI() {
    // Create floating button
    const extractButton = document.createElement('div');
    extractButton.id = 'meet-extractor-btn';
    extractButton.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: #1a73e8;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        cursor: pointer;
        z-index: 9999;
        font-family: 'Google Sans', sans-serif;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        gap: 8px;
      ">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        Extract Participants
      </div>
    `;
    document.body.appendChild(extractButton);

    // Create results panel
    const resultsPanel = document.createElement('div');
    resultsPanel.id = 'meet-results-panel';
    resultsPanel.style.display = 'none';
    resultsPanel.innerHTML = `
      <div style="
        position: fixed;
        top: 80px;
        right: 20px;
        width: 350px;
        max-height: 500px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.12);
        z-index: 9999;
        font-family: 'Google Sans', sans-serif;
        overflow: hidden;
      ">
        <div style="
          background: #f8f9fa;
          padding: 16px;
          border-bottom: 1px solid #e8eaed;
          display: flex;
          justify-content: space-between;
          align-items: center;
        ">
          <h3 style="margin: 0; color: #202124; font-size: 16px;">Extracted Participants</h3>
          <button id="close-panel" style="
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            color: #5f6368;
          ">×</button>
        </div>
        <div id="participants-list" style="
          padding: 16px;
          max-height: 350px;
          overflow-y: auto;
        ">
          <div style="text-align: center; color: #5f6368; padding: 20px;">
            Click "Start Extraction" to begin
          </div>
        </div>
        <div style="
          padding: 16px;
          border-top: 1px solid #e8eaed;
          display: flex;
          gap: 8px;
        ">
          <button id="start-extraction" style="
            flex: 1;
            background: #1a73e8;
            color: white;
            border: none;
            padding: 10px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
          ">Start Extraction</button>
          <button id="stop-extraction" style="
            flex: 1;
            background: #ea4335;
            color: white;
            border: none;
            padding: 10px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
          ">Stop & Copy</button>
        </div>
      </div>
    `;
    document.body.appendChild(resultsPanel);

    // Add event listeners
    extractButton.addEventListener('click', () => {
      resultsPanel.style.display = resultsPanel.style.display === 'none' ? 'block' : 'none';
    });

    document.getElementById('close-panel').addEventListener('click', () => {
      resultsPanel.style.display = 'none';
    });

    document.getElementById('start-extraction').addEventListener('click', () => {
      this.startExtraction();
    });

    document.getElementById('stop-extraction').addEventListener('click', () => {
      this.stopAndCopy();
    });
  },

  // Start monitoring Meet for participants
  startMonitoring() {
    this.participants = new Set();
    this.isExtracting = false;
    this.extractionInterval = null;
  },

  // Start extraction
  startExtraction() {
    this.isExtracting = true;
    this.participants.clear();
    
    document.getElementById('participants-list').innerHTML = `
      <div style="text-align: center; color: #1a73e8; padding: 20px;">
        <div style="font-size: 24px; margin-bottom: 8px;">Extracting...</div>
        <div style="color: #5f6368;">Monitoring participants</div>
      </div>
    `;

    // Extract every 2 seconds
    this.extractionInterval = setInterval(() => {
      this.extractFromDOM();
    }, 2000);

    // Initial extraction
    this.extractFromDOM();
  },

  // Extract participants from DOM
  extractFromDOM() {
    try {
      // Method 1: Find participant list
      const participantSelectors = [
        '[data-participant-id]',
        '[data-self-name]',
        '.zWfAib',
        '.uGJ1ub',
        '[role="listitem"]',
        '[aria-label*="participant"]'
      ];

      participantSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          const name = this.extractName(element);
          if (name && name.length > 2) {
            this.participants.add(name);
          }
        });
      });

      // Method 2: Parse from people panel
      const peoplePanel = document.querySelector('[role="dialog"], [data-panel-id]');
      if (peoplePanel) {
        const text = peoplePanel.textContent;
        const names = this.parseNames(text);
        names.forEach(name => this.participants.add(name));
      }

      // Update display
      this.updateDisplay();

    } catch (error) {
      console.error('Extraction error:', error);
    }
  },

  // Extract name from element
  extractName(element) {
    let name = element.getAttribute('data-self-name') || 
               element.getAttribute('data-participant-name') ||
               element.getAttribute('aria-label') ||
               element.textContent ||
               element.innerText;

    if (name) {
      name = name.trim();
      name = name.replace(/\(.*\)/g, '');
      name = name.replace(/^\d+\.\s*/, '');
      name = name.replace(/^-\s*/, '');
      name = name.replace(/^(You|Me)\s+/i, '');
      name = name.replace(/\s+(is speaking|has joined|has left).*$/i, '');
    }

    return name || '';
  },

  // Parse names from text
  parseNames(text) {
    const names = [];
    const lines = text.split('\n').filter(line => line.trim());
    
    lines.forEach(line => {
      const nameMatches = line.match(/^[A-Za-z\s]{2,50}$/);
      if (nameMatches) {
        const name = nameMatches[0].trim();
        if (name.length > 2 && !name.toLowerCase().includes('you')) {
          names.push(name);
        }
      }
    });

    return names;
  },

  // Update display
  updateDisplay() {
    const participantsList = document.getElementById('participants-list');
    const participants = Array.from(this.participants);
    
    participantsList.innerHTML = `
      <div style="color: #5f6368; margin-bottom: 12px;">
        Found ${participants.length} participants
      </div>
      <div style="display: flex; flex-wrap: wrap; gap: 6px;">
        ${participants.map(name => `
          <span style="
            background: #e8f0fe;
            color: #1a73e8;
            padding: 6px 12px;
            border-radius: 16px;
            font-size: 14px;
            font-weight: 500;
          ">${name}</span>
        `).join('')}
      </div>
    `;
  },

  // Stop extraction and copy to clipboard
  stopAndCopy() {
    this.isExtracting = false;
    if (this.extractionInterval) {
      clearInterval(this.extractionInterval);
    }

    const participants = Array.from(this.participants);
    const text = participants.join('\n');
    
    // Copy to clipboard
    navigator.clipboard.writeText(text).then(() => {
      document.getElementById('participants-list').innerHTML = `
        <div style="text-align: center; color: #34a853; padding: 20px;">
          <div style="font-size: 24px; margin-bottom: 8px;">Copied!</div>
          <div style="color: #5f6368;">${participants.length} participants copied to clipboard</div>
          <div style="margin-top: 12px; font-size: 12px; color: #5f6368;">
            Paste this in your LMS attendance section
          </div>
        </div>
      `;
    });
  }
};

// Auto-initialize if we're on Google Meet
if (window.location.hostname.includes('meet.google.com')) {
  MeetExtension.init();
}

// Export for development
window.MeetExtension = MeetExtension;
